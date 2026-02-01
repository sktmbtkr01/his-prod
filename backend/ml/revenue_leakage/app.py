"""
FastAPI API for Revenue Leakage Detection ML Service
Provides endpoints for anomaly detection, model training, and health checks
"""

import os
import sys
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.utils import setup_logging, success_response, error_response
from config import Config
from data_processor import get_data_processor
from anomaly_detector import get_anomaly_detector
from pattern_analyzer import get_pattern_analyzer
from alert_generator import get_alert_generator
from model_trainer import get_model_trainer

# Setup logging
logger = setup_logging('revenue_leakage_api')

# Initialize components (lazy loading)
_components_initialized = False


def init_components():
    """Initialize all components lazily"""
    global _components_initialized
    if not _components_initialized:
        try:
            # These will be initialized on first use
            get_data_processor()
            get_anomaly_detector()
            get_pattern_analyzer()
            get_alert_generator()
            get_model_trainer()
            _components_initialized = True
            logger.info("All components initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing components: {e}")


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize components
    logger.info(f"Starting Revenue Leakage Detection Service on port {Config.UVICORN_PORT}")
    try:
        init_components()
    except Exception as e:
        logger.warning(f"Component initialization failed (will retry on first request): {e}")
    yield
    # Shutdown: Cleanup if needed
    logger.info("Shutting down Revenue Leakage Detection Service")


# Create FastAPI app
app = FastAPI(
    title="Revenue Leakage Detection ML Service",
    description="API for anomaly detection, model training, and health checks",
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

class DetectAnomaliesRequest(BaseModel):
    days: int = 7
    include_rules: bool = True
    include_ml: bool = True
    create_alerts: bool = True


class UpdateAnomalyRequest(BaseModel):
    status: str
    reviewed_by: Optional[str] = None
    resolution_notes: Optional[str] = None


class TrainModelRequest(BaseModel):
    force: bool = False


# ============================================================
# Health Check Endpoint
# ============================================================

@app.get('/ml/revenue/health')
async def health_check():
    """
    Health check endpoint
    GET /ml/revenue/health
    
    Returns service status and component health
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
        
        # Check model status
        detector = get_anomaly_detector()
        model_status = "trained" if detector.is_trained else "not_trained"
        
        return JSONResponse(content=success_response({
            'service': 'revenue-leakage-detection',
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'components': {
                'database': db_status,
                'model': model_status
            },
            'config': {
                'port': Config.UVICORN_PORT,
                'model_path': Config.MODEL_PATH
            }
        }, message='Service is healthy'))
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(content=error_response(str(e), 'HEALTH_CHECK_FAILED'), status_code=500)


# ============================================================
# Detection Endpoints
# ============================================================

@app.post('/ml/revenue/detect')
async def detect_anomalies(request: DetectAnomaliesRequest):
    """
    Run anomaly detection scan
    POST /ml/revenue/detect
    
    Request body (optional):
    {
        "days": 7,              // Number of days to analyze (default: 7)
        "include_rules": true,  // Include rule-based detection (default: true)
        "include_ml": true,     // Include ML detection (default: true)
        "create_alerts": true   // Store alerts in database (default: true)
    }
    
    Returns detected anomalies and summary statistics
    """
    try:
        init_components()
        
        logger.info(f"Starting detection scan for {request.days} days")
        
        ml_anomalies = []
        rule_anomalies = []
        
        # ML-based detection
        if request.include_ml:
            detector = get_anomaly_detector()
            
            if detector.is_trained:
                processor = get_data_processor()
                features, visit_df = processor.get_detection_data(days=request.days)
                
                if features.size > 0:
                    # Normalize features
                    normalized, _ = processor.normalize_features(features)
                    
                    # Get detailed anomalies
                    ml_anomalies = detector.get_anomaly_details(normalized, visit_df)
                    
                    # Add type to ML anomalies
                    for anomaly in ml_anomalies:
                        anomaly['type'] = Config.ANOMALY_TYPES['UNUSUAL_PATTERN']
                    
                    logger.info(f"ML detection found {len(ml_anomalies)} anomalies")
            else:
                logger.warning("ML model not trained, skipping ML detection")
        
        # Rule-based detection
        if request.include_rules:
            analyzer = get_pattern_analyzer()
            rule_anomalies = analyzer.analyze_all_patterns(days=request.days)
            logger.info(f"Rule detection found {len(rule_anomalies)} issues")
        
        # Combine anomalies
        generator = get_alert_generator()
        combined = generator.combine_anomalies(ml_anomalies, rule_anomalies)
        
        # Create alerts in database
        alert_summary = {'created': 0, 'alerts': []}
        if request.create_alerts and combined:
            alert_summary = generator.create_alerts_batch(combined)
        
        # Calculate summary statistics
        total_leakage = sum(a.get('leakage_amount', 0) for a in combined)
        by_type = {}
        for anomaly in combined:
            atype = anomaly.get('type', 'unknown')
            if atype not in by_type:
                by_type[atype] = {'count': 0, 'amount': 0}
            by_type[atype]['count'] += 1
            by_type[atype]['amount'] += anomaly.get('leakage_amount', 0)
        
        return JSONResponse(content=success_response({
            'scan_parameters': {
                'days': request.days,
                'include_ml': request.include_ml,
                'include_rules': request.include_rules
            },
            'summary': {
                'total_anomalies': len(combined),
                'ml_anomalies': len(ml_anomalies),
                'rule_anomalies': len(rule_anomalies),
                'total_leakage_amount': total_leakage,
                'by_type': by_type
            },
            'alerts_created': alert_summary.get('created', 0),
            'anomalies': combined[:50]  # Limit response size
        }, message=f'Detected {len(combined)} anomalies'))
        
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        return JSONResponse(content=error_response(str(e), 'DETECTION_FAILED'), status_code=500)


@app.get('/ml/revenue/anomalies')
async def get_anomalies(
    status: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None, alias="type"),
    limit: int = Query(default=100)
):
    """
    Get detected anomalies from database
    GET /ml/revenue/anomalies
    
    Query parameters:
    - status: Filter by status (detected, under-review, resolved, false-positive)
    - type: Filter by anomaly type
    - limit: Maximum results (default: 100)
    """
    try:
        init_components()
        
        generator = get_alert_generator()
        anomalies = generator.get_alerts(
            status=status,
            anomaly_type=type,
            limit=limit
        )
        
        return JSONResponse(content=success_response({
            'count': len(anomalies),
            'anomalies': anomalies
        }))
        
    except Exception as e:
        logger.error(f"Error fetching anomalies: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


@app.get('/ml/revenue/anomalies/{anomaly_id}')
async def get_anomaly(anomaly_id: str = Path(...)):
    """
    Get specific anomaly by ID
    GET /ml/revenue/anomalies/<id>
    """
    try:
        init_components()
        
        generator = get_alert_generator()
        anomaly = generator.get_alert_by_id(anomaly_id)
        
        if anomaly is None:
            return JSONResponse(content=error_response('Anomaly not found', 'NOT_FOUND'), status_code=404)
        
        return JSONResponse(content=success_response(anomaly))
        
    except Exception as e:
        logger.error(f"Error fetching anomaly {anomaly_id}: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


@app.put('/ml/revenue/anomalies/{anomaly_id}')
async def update_anomaly(anomaly_id: str, request: UpdateAnomalyRequest):
    """
    Update anomaly status
    PUT /ml/revenue/anomalies/<id>
    
    Request body:
    {
        "status": "resolved",        // New status
        "reviewed_by": "user_id",    // Reviewer ID (optional)
        "resolution_notes": "..."    // Notes (optional)
    }
    """
    try:
        init_components()
        
        # Validate status
        valid_statuses = list(Config.ALERT_STATUS.values())
        if request.status not in valid_statuses:
            return JSONResponse(
                content=error_response(f'Invalid status. Must be one of: {valid_statuses}', 'VALIDATION_ERROR'),
                status_code=400
            )
        
        generator = get_alert_generator()
        success = generator.update_alert_status(
            anomaly_id,
            request.status,
            request.reviewed_by,
            request.resolution_notes
        )
        
        if success:
            return JSONResponse(content=success_response(
                {'id': anomaly_id, 'status': request.status},
                message='Anomaly updated successfully'
            ))
        else:
            return JSONResponse(content=error_response('Failed to update anomaly'), status_code=500)
        
    except Exception as e:
        logger.error(f"Error updating anomaly {anomaly_id}: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


@app.get('/ml/revenue/dashboard')
async def get_dashboard():
    """
    Get revenue leakage dashboard statistics
    GET /ml/revenue/dashboard
    """
    try:
        init_components()
        
        generator = get_alert_generator()
        stats = generator.get_dashboard_stats()
        
        # Add model info
        detector = get_anomaly_detector()
        stats['model_info'] = detector.get_model_info()
        
        return JSONResponse(content=success_response(stats))
        
    except Exception as e:
        logger.error(f"Error getting dashboard: {e}")
        return JSONResponse(content=error_response(str(e)), status_code=500)


# ============================================================
# Training Endpoints
# ============================================================

@app.post('/ml/revenue/train')
async def train_model(request: TrainModelRequest):
    """
    Train or retrain the ML model
    POST /ml/revenue/train
    
    Request body (optional):
    {
        "force": false  // Force retrain even if model exists
    }
    """
    try:
        init_components()
        
        logger.info(f"Training request received (force={request.force})")
        
        trainer = get_model_trainer()
        result = trainer.train(force_retrain=request.force)
        
        if result.get('success'):
            return JSONResponse(content=success_response(result, message='Training complete'))
        else:
            return JSONResponse(
                content=error_response(result.get('error', 'Training failed'), 'TRAINING_FAILED'),
                status_code=500
            )
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        return JSONResponse(content=error_response(str(e), 'TRAINING_FAILED'), status_code=500)


@app.get('/ml/revenue/train/status')
async def get_training_status():
    """
    Get model training status
    GET /ml/revenue/train/status
    """
    try:
        init_components()
        
        trainer = get_model_trainer()
        status = trainer.get_training_status()
        
        return JSONResponse(content=success_response(status))
        
    except Exception as e:
        logger.error(f"Error getting training status: {e}")
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
