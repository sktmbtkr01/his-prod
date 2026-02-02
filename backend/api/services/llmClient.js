/**
 * LLM Client Service - Lab Report Summarization
 * Uses OpenRouter API with configurable model
 * Fallback: Google Gemini API
 */

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// OpenRouter Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Google Gemini Configuration (Fallback)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

/**
 * Summarize a lab report using OpenRouter LLM (with Gemini Fallback)
 * @param {string} extractedText - Raw text extracted from the PDF
 * @returns {Promise<Object>} - Structured summary JSON
 */
const summarizeLabReport = async (extractedText) => {
    // Validate input
    if (!extractedText || extractedText.length < 20) {
        throw new Error(`Insufficient text for summarization (${extractedText?.length || 0} chars). Please ensure PDF text was extracted.`);
    }

    let openRouterError = null;
    let geminiError = null;

    // Try OpenRouter first
    try {
        console.log(`[LLM] Attempting summary with OpenRouter (${OPENROUTER_MODEL})...`);
        console.log(`[LLM] Text length: ${extractedText.length} chars`);
        return await summarizeWithOpenRouter(extractedText);
    } catch (err) {
        openRouterError = err.message;
        console.warn(`[LLM] OpenRouter failed: ${err.message}. Attempting fallback to Gemini...`);
    }

    // Fallback to Gemini
    if (genAI) {
        try {
            console.log('[LLM] Trying Gemini fallback...');
            return await summarizeWithGemini(extractedText);
        } catch (err) {
            geminiError = err.message;
            console.error(`[LLM] Gemini fallback failed: ${err.message}`);
        }
    } else {
        geminiError = 'No API key configured';
        console.warn('[LLM] No Google API Key for fallback.');
    }

    // Both failed - provide detailed error
    throw new Error(`All LLM services failed. OpenRouter: ${openRouterError}. Gemini: ${geminiError}`);
};

/**
 * OpenRouter Implementation
 */
const summarizeWithOpenRouter = async (extractedText) => {
    if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API Key missing');

    const prompt = getPrompt(extractedText);

    const response = await axios.post(
        OPENROUTER_BASE_URL,
        {
            model: OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: "json_object" } // Hints for JSON
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5001',
                'X-Title': 'Hospital HIS Lab Report Summarizer',
            },
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenRouter');

    return parseResponse(content, OPENROUTER_MODEL);
};

/**
 * Gemini Implementation (Fallback) - Using direct REST API
 */
const summarizeWithGemini = async (extractedText) => {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No Gemini API key configured');

    const prompt = getPrompt(extractedText) + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown formatting.";

    // Try multiple model names in order of preference
    const modelsToTry = ['gemini-1.5-flash', 'gemini-pro', 'gemini-1.0-pro'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[LLM] Trying Gemini model: ${modelName}`);

            // Use v1 API (not v1beta) for better stability
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2000,
                }
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from Gemini');

            console.log(`[LLM] Gemini ${modelName} succeeded`);
            return parseResponse(text, modelName);
        } catch (err) {
            lastError = err.response?.data?.error?.message || err.message;
            console.warn(`[LLM] Gemini ${modelName} failed: ${lastError}`);
        }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError}`);
};

/**
 * Helper: Parse JSON from LLM response
 */
const parseResponse = (content, modelName) => {
    let jsonStr = content.trim();
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);

    try {
        const summary = JSON.parse(jsonStr.trim());
        summary.generatedAt = new Date().toISOString();
        summary.model = modelName;
        console.log(`[LLM] Summary generated successfully using ${modelName}`);
        return summary;
    } catch (e) {
        console.error("[LLM] Failed to parse JSON response:", jsonStr);
        throw new Error("Invalid JSON response from AI");
    }
};

/**
 * Helper: Construct Prompt
 */
const getPrompt = (text) => `You are a clinical lab report analyzer helping physicians.
LAB DATA:
${text}

INSTRUCTIONS:
- Write a clear, concise summary in PARAGRAPH format.
- Highlight critical/abnormal findings.
- End with clinical recommendations if applicable.

RESPOND IN THIS EXACT JSON FORMAT:
{
    "summary": "2-3 paragraph clinical summary...",
    "abnormalValues": [
        {"parameter": "Name", "value": "Value", "significance": "Significance"}
    ],
    "overallStatus": "normal|attention_needed|critical",
    "clinicalRecommendation": "Follow-up action...",
    "disclaimer": "AI-generated summary. Not a diagnosis."
}`;

module.exports = {
    summarizeLabReport,
};
