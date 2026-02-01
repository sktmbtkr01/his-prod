"""
FastAPI API for Predictive Analytics ML Service
Provides endpoints for OPD, bed occupancy, and lab workload predictions
"""

import os
import sys
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.utils import setup_logging, success_response, error_response
from config import Config
from opd_predictor import get_opd_predictor
from bed_predictor import get_bed_predictor
from lab_predictor import get_lab_predictor

# Setup logging
logger = setup_logging('predictive_analytics_api')

# Initialize components (lazy loading)
_components_initialized = False


def init_components():
    """Initialize all components lazily"""
    global _components_initialized
    if not _components_initialized:
        try:
            get_opd_predictor()
            get_bed_predictor()
            get_lab_predictor()
            _components_initialized = True
            logger.info("All predictive analytics components initialized")
        except Exception as e:
            logger.error(f"Error initializing components: {e}")


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize components
    logger.info(f"Starting Predictive Analytics Service on port {Config.UVICORN_PORT}")
    try:
        init_components()
    except Exception as e:
        logger.warning(f"Component initialization failed (will retry on first request): {e}")
    yield
    # Shutdown: Cleanup if needed
    logger.info("Shutting down Predictive Analytics Service")


# Create FastAPI app
app = FastAPI(
    title="Predictive Analytics ML Service",
    description="API for OPD, bed occupancy, and lab workload predictions",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ============================================================
# Pydantic Models for Request/Response
# ============================================================

class OPDPredictRequest(BaseModel):
    hours: int = 24


class BedPredictRequest(BaseModel):
    days: int = 7


class LabPredictRequest(BaseModel):
    hours: int = 24


class TrainModelsRequest(BaseModel):
    models: List[str] = ["opd", "bed", "lab"]
    force: bool = False


# ============================================================
# Health Check Endpoint
# ============================================================

@app.get('/ml/predict/health')
async def health_check():
    """
    Health check endpoint
    GET /ml/predict/health
    """
    try:
        # Check database connection
        db_status = "unknown"
        try:
            from shared.db_connector import get_db
            db = get_db()
            db.client.admin.command('ping')
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        # Check model statuses
        init_components()
        
        opd = get_opd_predictor()
        bed = get_bed_predictor()
        lab = get_lab_predictor()
        
        return JSONResponse(content=success_response({
            'service': 'predictive-analytics',
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'components': {
                'database': db_status,
                'opd_model': 'trained' if opd.model.is_trained else 'not_trained',
                'bed_model': 'trained' if bed.model.is_trained else 'not_trained',
                'lab_model': 'trained' if lab.model.is_trained else 'not_trained'
            },
            'config': {
                'port': Config.UVICORN_PORT
            }
        }, message='Service is healthy'))
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(content=error_response(str(e), 'HEALTH_CHECK_FAILED'), status_code=500)


# ============================================================
# OPD Prediction Endpoints
# ============================================================

@app.post('/ml/predict/opd')
async def predict_opd(request: OPDPredictRequest):
    """
    Predict OPD rush hours
    POST /ml/predict/opd
    
    Request body:
    {
        "hours": 24  // Number of hours to predict (default: 24)
    }
    """
    try:
        init_components()
        
        predictor = get_opd_predictor()
        
        if not predictor.model.is_trained:
            # Try to train first
            train_result = predictor.train()
            if not train_result.get('success') and not predictor.model.is_trained:
                return JSONResponse(
                    content=error_response('Model not trained. Please train first.', 'MODEL_NOT_TRAINED'),
                    status_code=400
                )
        
        result = predictor.predict(hours=request.hours)
        
        if result.get('success'):
            return JSONResponse(content=success_response(result))
        else:
            return JSONResponse(content=error_response(result.get('error', 'Prediction failed')), status_code=500)
        
    except Exception as e:
        logger.error(f"OPD prediction error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


@app.get('/ml/predict/opd/rush-hours')
async def get_opd_rush_hours():
    """
    Get OPD rush hour summary by day
    GET /ml/predict/opd/rush-hours
    """
    try:
        init_components()
        
        predictor = get_opd_predictor()
        result = predictor.get_rush_hour_summary()
        
        if 'error' in result:
            return JSONResponse(content=error_response(result['error']), status_code=500)
        
        return JSONResponse(content=success_response(result))
        
    except Exception as e:
        logger.error(f"Rush hours error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


# ============================================================
# Bed Occupancy Prediction Endpoints
# ============================================================

@app.post('/ml/predict/beds')
async def predict_beds(request: BedPredictRequest):
    """
    Predict bed occupancy
    POST /ml/predict/beds
    
    Request body:
    {
        "days": 7  // Number of days to predict (default: 7)
    }
    """
    try:
        init_components()
        
        predictor = get_bed_predictor()
        
        if not predictor.model.is_trained:
            train_result = predictor.train()
            if not train_result.get('success') and not predictor.model.is_trained:
                return JSONResponse(
                    content=error_response('Model not trained. Please train first.', 'MODEL_NOT_TRAINED'),
                    status_code=400
                )
        
        result = predictor.predict(days=request.days)
        
        if result.get('success'):
            return JSONResponse(content=success_response(result))
        else:
            return JSONResponse(content=error_response(result.get('error', 'Prediction failed')), status_code=500)
        
    except Exception as e:
        logger.error(f"Bed prediction error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


@app.get('/ml/predict/beds/status')
async def get_bed_status():
    """
    Get current bed occupancy status
    GET /ml/predict/beds/status
    """
    try:
        init_components()
        
        predictor = get_bed_predictor()
        result = predictor.get_current_status()
        
        if 'error' in result:
            return JSONResponse(content=error_response(result['error']), status_code=500)
        
        return JSONResponse(content=success_response(result))
        
    except Exception as e:
        logger.error(f"Bed status error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


# ============================================================
# Lab Workload Prediction Endpoints
# ============================================================

@app.post('/ml/predict/lab')
async def predict_lab(request: LabPredictRequest):
    """
    Predict lab workload
    POST /ml/predict/lab
    
    Request body:
    {
        "hours": 24  // Number of hours to predict (default: 24)
    }
    """
    try:
        init_components()
        
        predictor = get_lab_predictor()
        
        if not predictor.model.is_trained:
            train_result = predictor.train()
            if not train_result.get('success') and not predictor.model.is_trained:
                return JSONResponse(
                    content=error_response('Model not trained. Please train first.', 'MODEL_NOT_TRAINED'),
                    status_code=400
                )
        
        result = predictor.predict(hours=request.hours)
        
        if result.get('success'):
            return JSONResponse(content=success_response(result))
        else:
            return JSONResponse(content=error_response(result.get('error', 'Prediction failed')), status_code=500)
        
    except Exception as e:
        logger.error(f"Lab prediction error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


@app.get('/ml/predict/lab/breakdown')
async def get_lab_breakdown(days: int = Query(default=7)):
    """
    Get lab workload breakdown by test type
    GET /ml/predict/lab/breakdown?days=7
    """
    try:
        init_components()
        
        predictor = get_lab_predictor()
        result = predictor.get_workload_by_test_type(days=days)
        
        if 'error' in result:
            return JSONResponse(content=error_response(result['error']), status_code=500)
        
        return JSONResponse(content=success_response(result))
        
    except Exception as e:
        logger.error(f"Lab breakdown error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


# ============================================================
# Training Endpoints
# ============================================================

@app.post('/ml/predict/train')
async def train_models(request: TrainModelsRequest):
    """
    Train all prediction models
    POST /ml/predict/train
    
    Request body:
    {
        "models": ["opd", "bed", "lab"],  // Models to train (default: all)
        "force": false                      // Force retrain
    }
    """
    try:
        init_components()
        
        results = {}
        
        if 'opd' in request.models:
            logger.info("Training OPD model...")
            predictor = get_opd_predictor()
            results['opd'] = predictor.train(force=request.force)
        
        if 'bed' in request.models:
            logger.info("Training Bed model...")
            predictor = get_bed_predictor()
            results['bed'] = predictor.train(force=request.force)
        
        if 'lab' in request.models:
            logger.info("Training Lab model...")
            predictor = get_lab_predictor()
            results['lab'] = predictor.train(force=request.force)
        
        # Check if all succeeded
        all_success = all(r.get('success', False) for r in results.values())
        
        return JSONResponse(content=success_response({
            'all_success': all_success,
            'results': results
        }, message='Training complete'))
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        return JSONResponse(content=error_response(str(e), 'TRAINING_FAILED'), status_code=500)


@app.get('/ml/predict/train/status')
async def get_training_status():
    """
    Get training status for all models
    GET /ml/predict/train/status
    """
    try:
        init_components()
        
        opd = get_opd_predictor()
        bed = get_bed_predictor()
        lab = get_lab_predictor()
        
        return JSONResponse(content=success_response({
            'opd': opd.get_model_info(),
            'bed': bed.get_model_info(),
            'lab': lab.get_model_info()
        }))
        
    except Exception as e:
        logger.error(f"Status error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


# ============================================================
# Combined Predictions Endpoint
# ============================================================

@app.get('/ml/predictions')
async def get_all_predictions():
    """
    Get predictions from all models
    GET /ml/predictions
    """
    try:
        init_components()
        
        results = {}
        
        # OPD
        opd = get_opd_predictor()
        if opd.model.is_trained:
            results['opd'] = opd.predict(hours=24)
        else:
            results['opd'] = {'error': 'Model not trained'}
        
        # Bed
        bed = get_bed_predictor()
        if bed.model.is_trained:
            results['bed'] = bed.predict(days=7)
        else:
            results['bed'] = {'error': 'Model not trained'}
        
        # Lab
        lab = get_lab_predictor()
        if lab.model.is_trained:
            results['lab'] = lab.predict(hours=24)
        else:
            results['lab'] = {'error': 'Model not trained'}
        
        return JSONResponse(content=success_response(results))
        
    except Exception as e:
        logger.error(f"Predictions error: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


# ============================================================
# Error Handlers
# ============================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors"""
    return JSONResponse(content=error_response('Endpoint not found', 'NOT_FOUND'), status_code=404)


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors"""
    return JSONResponse(content=error_response('Internal server error', 'INTERNAL_ERROR'), status_code=500)


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(content=error_response(str(exc), 'UNHANDLED_ERROR'), status_code=500)


# ============================================================
# Main Entry Point
# ============================================================

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        "app:app",
        host=Config.UVICORN_HOST,
        port=Config.UVICORN_PORT,
        reload=Config.UVICORN_RELOAD
    )
