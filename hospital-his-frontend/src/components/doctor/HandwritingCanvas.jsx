/**
 * HandwritingCanvas Component
 * Natural handwriting input for clinical notes
 * 
 * Supports stylus, Apple Pencil, touch, and mouse input
 * Sectioned canvas for Symptoms & Diagnosis
 */

import React, { useRef, useState, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PenTool, Keyboard, RotateCcw, Trash2, Wand2,
    Loader2, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { convertSectionedHandwriting } from '../../services/handwritingOcr.service';
import './HandwritingCanvas.css';

const HandwritingCanvas = ({
    onConvert,
    onModeChange,
    initialSymptoms = '',
    initialDiagnosis = ''
}) => {
    // Refs for canvas sections
    const symptomsCanvasRef = useRef(null);
    const diagnosisCanvasRef = useRef(null);

    // State
    const [isConverting, setIsConverting] = useState(false);
    const [conversionResult, setConversionResult] = useState(null);
    const [error, setError] = useState(null);
    const [symptomsHistory, setSymptomsHistory] = useState([]);
    const [diagnosisHistory, setDiagnosisHistory] = useState([]);

    // Handle conversion
    const handleConvert = useCallback(async () => {
        setIsConverting(true);
        setError(null);
        setConversionResult(null);

        try {
            // Get canvas data as base64
            const symptomsData = symptomsCanvasRef.current?.isEmpty()
                ? null
                : symptomsCanvasRef.current.toDataURL('image/png');

            const diagnosisData = diagnosisCanvasRef.current?.isEmpty()
                ? null
                : diagnosisCanvasRef.current.toDataURL('image/png');

            if (!symptomsData && !diagnosisData) {
                setError('Please write something in at least one section before converting.');
                setIsConverting(false);
                return;
            }

            const result = await convertSectionedHandwriting({
                symptoms: symptomsData,
                diagnosis: diagnosisData
            });

            if (result.success) {
                setConversionResult(result);

                // Call parent callback with converted text
                if (onConvert) {
                    onConvert({
                        symptoms: result.data.symptoms?.text || '',
                        diagnosis: result.data.diagnosis?.text || '',
                        isAiAssisted: true
                    });
                }
            } else {
                setError(result.error || 'Conversion failed');
            }

        } catch (err) {
            console.error('Conversion error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to convert handwriting');
        } finally {
            setIsConverting(false);
        }
    }, [onConvert]);

    // Clear a specific canvas
    const clearCanvas = useCallback((section) => {
        if (section === 'symptoms' && symptomsCanvasRef.current) {
            symptomsCanvasRef.current.clear();
            setSymptomsHistory([]);
        } else if (section === 'diagnosis' && diagnosisCanvasRef.current) {
            diagnosisCanvasRef.current.clear();
            setDiagnosisHistory([]);
        }
    }, []);

    // Clear all canvases
    const clearAll = useCallback(() => {
        clearCanvas('symptoms');
        clearCanvas('diagnosis');
        setConversionResult(null);
        setError(null);
    }, [clearCanvas]);

    // Undo last stroke (simplified - clears and redraws without last)
    const undo = useCallback((section) => {
        const ref = section === 'symptoms' ? symptomsCanvasRef : diagnosisCanvasRef;
        const history = section === 'symptoms' ? symptomsHistory : diagnosisHistory;
        const setHistory = section === 'symptoms' ? setSymptomsHistory : setDiagnosisHistory;

        if (ref.current && history.length > 0) {
            const newHistory = history.slice(0, -1);
            ref.current.clear();

            // Redraw remaining strokes
            newHistory.forEach(dataUrl => {
                const img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    const ctx = ref.current.getCanvas().getContext('2d');
                    ctx.drawImage(img, 0, 0);
                };
            });

            setHistory(newHistory);
        }
    }, [symptomsHistory, diagnosisHistory]);

    // Save stroke to history on end
    const saveStroke = useCallback((section) => {
        const ref = section === 'symptoms' ? symptomsCanvasRef : diagnosisCanvasRef;
        const setHistory = section === 'symptoms' ? setSymptomsHistory : setDiagnosisHistory;

        if (ref.current && !ref.current.isEmpty()) {
            const dataUrl = ref.current.toDataURL();
            setHistory(prev => [...prev, dataUrl]);
        }
    }, []);

    // Switch to typing mode
    const switchToTyping = useCallback(() => {
        if (onModeChange) {
            onModeChange('type');
        }
    }, [onModeChange]);

    return (
        <div className="handwriting-container">
            {/* Header with mode toggle */}
            <div className="handwriting-header">
                <div className="mode-indicator">
                    <PenTool size={16} className="text-teal-600" />
                    <span>Write Mode</span>
                </div>
                <button
                    className="mode-toggle-btn"
                    onClick={switchToTyping}
                >
                    <Keyboard size={16} />
                    Switch to Typing
                </button>
            </div>

            {/* Symptoms Canvas Section */}
            <div className="canvas-section">
                <div className="canvas-label">
                    <span>Symptoms & Complaints</span>
                    <div className="canvas-actions">
                        <button
                            className="canvas-action-btn"
                            onClick={() => undo('symptoms')}
                            title="Undo"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button
                            className="canvas-action-btn"
                            onClick={() => clearCanvas('symptoms')}
                            title="Clear"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
                <div className="canvas-wrapper">
                    <SignatureCanvas
                        ref={symptomsCanvasRef}
                        canvasProps={{
                            className: 'handwriting-canvas',
                            style: {
                                width: '100%',
                                height: '120px',
                                touchAction: 'none'
                            }
                        }}
                        backgroundColor="transparent"
                        penColor="#1e293b"
                        minWidth={1.5}
                        maxWidth={3}
                        velocityFilterWeight={0.7}
                        onEnd={() => saveStroke('symptoms')}
                    />
                    <div className="canvas-lines" />
                </div>
            </div>

            {/* Diagnosis Canvas Section */}
            <div className="canvas-section">
                <div className="canvas-label">
                    <span>Final Diagnosis</span>
                    <div className="canvas-actions">
                        <button
                            className="canvas-action-btn"
                            onClick={() => undo('diagnosis')}
                            title="Undo"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button
                            className="canvas-action-btn"
                            onClick={() => clearCanvas('diagnosis')}
                            title="Clear"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
                <div className="canvas-wrapper">
                    <SignatureCanvas
                        ref={diagnosisCanvasRef}
                        canvasProps={{
                            className: 'handwriting-canvas',
                            style: {
                                width: '100%',
                                height: '80px',
                                touchAction: 'none'
                            }
                        }}
                        backgroundColor="transparent"
                        penColor="#1e293b"
                        minWidth={1.5}
                        maxWidth={3}
                        velocityFilterWeight={0.7}
                        onEnd={() => saveStroke('diagnosis')}
                    />
                    <div className="canvas-lines" />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="handwriting-actions">
                <button
                    className="clear-all-btn"
                    onClick={clearAll}
                    disabled={isConverting}
                >
                    <Trash2 size={16} />
                    Clear All
                </button>

                <button
                    className="convert-btn"
                    onClick={handleConvert}
                    disabled={isConverting}
                >
                    {isConverting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Converting...
                        </>
                    ) : (
                        <>
                            <Wand2 size={18} />
                            Convert Handwriting to Text
                        </>
                    )}
                </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="conversion-error"
                    >
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
                {conversionResult?.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="conversion-success"
                    >
                        <CheckCircle size={16} />
                        <span>Text converted successfully! Review the fields above.</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Disclaimer */}
            <div className="handwriting-disclaimer">
                <Info size={14} />
                <span>
                    AI-assisted transcription. Please review and edit the converted text before saving.
                </span>
            </div>
        </div>
    );
};

export default HandwritingCanvas;
