/**
 * LLM Client Service - Lab Report Summarization
 * Priority: Groq (fast, free) -> OpenRouter -> Gemini
 */

const axios = require('axios');

// Groq Configuration (Primary - Fast & Free)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Best free model on Groq
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

// OpenRouter Configuration (Fallback 1)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Gemini Configuration (Fallback 2)
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Summarize a lab report using LLM
 * Tries: Groq -> OpenRouter -> Gemini
 */
const summarizeLabReport = async (extractedText) => {
    // Validate input
    if (!extractedText || extractedText.length < 20) {
        throw new Error(`Insufficient text for summarization (${extractedText?.length || 0} chars). Please ensure PDF text was extracted.`);
    }

    const errors = {};

    // Try Groq first (fastest, most reliable)
    if (GROQ_API_KEY) {
        try {
            console.log(`[LLM] Trying Groq (${GROQ_MODEL})...`);
            return await summarizeWithGroq(extractedText);
        } catch (err) {
            errors.groq = err.message;
            console.warn(`[LLM] Groq failed: ${err.message}`);
        }
    } else {
        errors.groq = 'No API key';
        console.log('[LLM] Groq API key not configured, skipping...');
    }

    // Try OpenRouter
    if (OPENROUTER_API_KEY) {
        try {
            console.log(`[LLM] Trying OpenRouter (${OPENROUTER_MODEL})...`);
            return await summarizeWithOpenRouter(extractedText);
        } catch (err) {
            errors.openRouter = err.message;
            console.warn(`[LLM] OpenRouter failed: ${err.message}`);
        }
    } else {
        errors.openRouter = 'No API key';
    }

    // Try Gemini
    if (GEMINI_API_KEY) {
        try {
            console.log('[LLM] Trying Gemini...');
            return await summarizeWithGemini(extractedText);
        } catch (err) {
            errors.gemini = err.message;
            console.warn(`[LLM] Gemini failed: ${err.message}`);
        }
    } else {
        errors.gemini = 'No API key';
    }

    // All failed
    throw new Error(`All LLM services failed. Groq: ${errors.groq}. OpenRouter: ${errors.openRouter}. Gemini: ${errors.gemini}`);
};

/**
 * Groq Implementation (Primary)
 */
const summarizeWithGroq = async (extractedText) => {
    const prompt = getPrompt(extractedText);

    const response = await axios.post(
        GROQ_BASE_URL,
        {
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: 'You are a clinical lab report analyzer. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: "json_object" }
        },
        {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    return parseResponse(content, GROQ_MODEL);
};

/**
 * OpenRouter Implementation (Fallback 1)
 */
const summarizeWithOpenRouter = async (extractedText) => {
    const prompt = getPrompt(extractedText);

    const response = await axios.post(
        OPENROUTER_BASE_URL,
        {
            model: OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 2000,
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://his-prod.vercel.app',
                'X-Title': 'Hospital HIS Lab Report Summarizer',
            },
            timeout: 30000
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenRouter');

    return parseResponse(content, OPENROUTER_MODEL);
};

/**
 * Gemini Implementation (Fallback 2)
 */
const summarizeWithGemini = async (extractedText) => {
    const prompt = getPrompt(extractedText) + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown.";

    // Try v1 API with gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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

    return parseResponse(text, 'gemini-1.5-flash');
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
        console.error("[LLM] Failed to parse JSON response:", jsonStr.substring(0, 200));
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
