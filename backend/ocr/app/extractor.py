"""
Text Extractor Module (Gemini + Tesseract)
==========================================
Extracts patient information from ID card images using:
1. Tesseract OCR for text extraction
2. Google Gemini for intelligent parsing
"""

import re
import os
from PIL import Image
from typing import Dict, Optional, Any
import logging
from datetime import datetime
import google.generativeai as genai
import pytesseract

# Configure logging
logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None
    logger.warning("GEMINI_API_KEY not set - falling back to regex parsing only")


def extract_text_from_image(image: Image.Image) -> str:
    """
    Use Tesseract OCR to extract text from an ID card image.
    """
    try:
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        text = pytesseract.image_to_string(image, lang='eng')
        logger.info(f"Extracted text (Tesseract): {text[:200]}...")
        return text
    except Exception as e:
        logger.error(f"Tesseract extraction failed: {str(e)}")
        return ""


def extract_with_gemini(image: Image.Image) -> Dict[str, Any]:
    """
    Use Gemini Vision to extract structured data from ID card image.
    """
    if not gemini_model:
        return {}
    
    try:
        prompt = """Analyze this Indian government ID card image (Aadhaar, PAN, Voter ID, etc.) and extract the following information.
Return ONLY a JSON object with these exact keys (use null for missing values):
{
    "firstName": "first name",
    "lastName": "last name or surname", 
    "dateOfBirth": "YYYY-MM-DD format",
    "gender": "Male or Female",
    "phone": "phone number if visible",
    "aadhaarNumber": "12 digit aadhaar number if visible (numbers only, no spaces)"
}

Important:
- For Aadhaar cards, extract the full 12-digit number
- Date should be in YYYY-MM-DD format
- Return valid JSON only, no markdown or extra text"""

        response = gemini_model.generate_content([prompt, image])
        response_text = response.text.strip()
        
        # Clean up response - remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = re.sub(r'^```json?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
        
        import json
        result = json.loads(response_text)
        logger.info(f"Gemini extraction successful: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Gemini extraction failed: {str(e)}")
        return {}


def parse_aadhaar_number(text: str) -> Optional[str]:
    """Extract Aadhaar number from text using regex."""
    normalized = re.sub(r'\s+', ' ', text)
    
    # Pattern: XXXX XXXX XXXX
    pattern_spaced = r'\b(\d{4}\s+\d{4}\s+\d{4})\b'
    match = re.search(pattern_spaced, normalized)
    if match:
        return re.sub(r'\s+', '', match.group(1))
    
    # Pattern: 12 continuous digits
    pattern_continuous = r'\b(\d{12})\b'
    match = re.search(pattern_continuous, normalized)
    if match:
        return match.group(1)
    
    return None


def mask_aadhaar_number(aadhaar: str) -> str:
    """Mask Aadhaar number for privacy: XXXX XXXX 1234"""
    if not aadhaar or len(aadhaar) != 12:
        return "XXXX XXXX XXXX"
    return f"XXXX XXXX {aadhaar[-4:]}"


def parse_phone_number(text: str) -> Optional[str]:
    """Extract phone/mobile number from text."""
    try:
        pattern_relaxed = r'(?i)(?:Mobile|Phone|Mob|Tel|Contact|Ph|Cells?)(?:[\s\S]{0,30}?)((?:\+91[\s-]?)?\d{5}[\s-]?\d{5}|\d{10})'
        match = re.search(pattern_relaxed, text)
        if match:
            raw = re.sub(r'\D', '', match.group(1))
            if len(raw) >= 10:
                return f"+91 {raw[-10:-5]} {raw[-5:]}"
        
        # Standalone 10-digit
        text_clean = re.sub(r'[^\d]', ' ', text)
        patterns_simple = [r'\b([6-9]\d{9})\b']
        for p in patterns_simple:
            match = re.search(p, text_clean)
            if match:
                raw = re.sub(r'\D', '', match.group(1))
                if len(raw) == 10:
                    return f"+91 {raw[:5]} {raw[5:]}"
    except Exception as e:
        logger.error(f"Phone parsing error: {e}")
    return None


def parse_name(text: str) -> Dict[str, str]:
    """Extract name from ID card text."""
    result = {"firstName": "", "lastName": ""}
    clean_text = re.sub(r'(?m)^[^a-zA-Z0-9\n]+', '', text)
    
    patterns_labeled = [
        r'(?:Name|नाम|Nane)\s*[:\-]?\s*([A-Za-z\s\.]+)',
        r'(?:To|Son of|S/O|D/O|W/O|Care of|C/O)\s*[:\-]?\s*([A-Za-z\s\.]+)',
    ]
    
    for pattern in patterns_labeled:
        match = re.search(pattern, clean_text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            parts = name.split()
            if len(parts) >= 2:
                result["firstName"] = parts[0]
                result["lastName"] = " ".join(parts[1:])
                return result
            elif len(parts) == 1:
                result["firstName"] = parts[0]
                return result
    
    return result


def parse_date_of_birth(text: str) -> Optional[str]:
    """Extract date of birth from ID card text."""
    dob_patterns = [
        r'(?:DOB|Date of Birth|जन्म तिथि|Year of Birth|YOB)\s*[:\-]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
        r'(?:DOB|Date of Birth|जन्म तिथि)\s*[:\-]?\s*(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})',
        r'\b(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})\b',
    ]
    
    for pattern in dob_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y/%m/%d', '%Y-%m-%d']:
                try:
                    parsed = datetime.strptime(date_str, fmt)
                    return parsed.strftime('%Y-%m-%d')
                except ValueError:
                    continue
    return None


def parse_gender(text: str) -> Optional[str]:
    """Extract gender from ID card text."""
    text_lower = text.lower()
    
    if any(ind in text_lower for ind in ['female', 'महिला', ' f ', '/f', 'gender: f']):
        return 'Female'
    if any(ind in text_lower for ind in ['male', 'पुरुष', ' m ', '/m', 'gender: m']):
        if 'female' not in text_lower:
            return 'Male'
    if re.search(r'\bmale\b', text_lower):
        return 'Male'
    
    return None


def extract_patient_details(image: Image.Image) -> Dict[str, Any]:
    """
    Main function to extract all patient details from ID card.
    Uses Gemini AI first, falls back to Tesseract + regex.
    """
    logger.info("Starting patient details extraction...")
    
    # Try Gemini first (more accurate)
    gemini_result = extract_with_gemini(image)
    
    # Also get Tesseract text for fallback/validation
    extracted_text = extract_text_from_image(image)
    
    # Merge results - prefer Gemini, fallback to regex parsing
    aadhaar_raw = gemini_result.get("aadhaarNumber") or parse_aadhaar_number(extracted_text)
    
    # Name from Gemini or regex
    if gemini_result.get("firstName"):
        first_name = gemini_result.get("firstName", "")
        last_name = gemini_result.get("lastName", "")
    else:
        name_parts = parse_name(extracted_text)
        first_name = name_parts.get("firstName", "")
        last_name = name_parts.get("lastName", "")
    
    # Other fields
    dob = gemini_result.get("dateOfBirth") or parse_date_of_birth(extracted_text)
    gender = gemini_result.get("gender") or parse_gender(extracted_text)
    phone = gemini_result.get("phone") or parse_phone_number(extracted_text)
    
    result = {
        "firstName": first_name,
        "lastName": last_name,
        "dateOfBirth": dob,
        "gender": gender,
        "phone": phone,
        "maskedAadhaar": mask_aadhaar_number(aadhaar_raw) if aadhaar_raw else None,
        "rawAadhaar": aadhaar_raw,
        "extractedText": extracted_text[:500],  # Truncate for response
        "confidence": "high" if (first_name and aadhaar_raw) else "medium" if first_name else "low"
    }
    
    logger.info(f"Extraction complete. Confidence: {result['confidence']}")
    return result
