/**
 * Centralized API Configuration
 * All frontend services should import from this file
 */

// Base URLs from environment variables with localhost fallbacks for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
export const API_URL = `${API_BASE_URL}/api/v1`;
export const OCR_BASE_URL = import.meta.env.VITE_OCR_URL || 'http://localhost:8000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

// Helper to get full API URL with path
export const getApiUrl = (path) => `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

// Helper to get file/upload URL (for viewing uploaded files like PDFs, images)
export const getFileUrl = (path) => {
    if (!path) return '';
    // If path already has full URL, return as-is
    if (path.startsWith('http')) return path;
    // Otherwise prepend API base
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

export default {
    API_BASE_URL,
    API_URL,
    OCR_BASE_URL,
    SOCKET_URL,
    getApiUrl,
    getFileUrl,
};
