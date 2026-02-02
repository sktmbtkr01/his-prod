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
    try {
        console.log(`[LLM] Attempting summary with OpenRouter (${OPENROUTER_MODEL})...`);
        return await summarizeWithOpenRouter(extractedText);
    } catch (openRouterError) {
        console.warn(`[LLM] OpenRouter failed: ${openRouterError.message}. Attempting fallback to Gemini...`);

        if (genAI) {
            try {
                return await summarizeWithGemini(extractedText);
            } catch (geminiError) {
                console.error(`[LLM] Gemini fallback failed: ${geminiError.message}`);
                throw new Error('All LLM services failed to generate summary.');
            }
        } else {
            console.warn('[LLM] No Google API Key for fallback. Returning validation error.');
            throw new Error('AI Service unavailable (OpenRouter failed and Google Key missing).');
        }
    }
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
 * Gemini Implementation (Fallback)
 */
const summarizeWithGemini = async (extractedText) => {
    // Use Flash model for better reliability on free tier
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = getPrompt(extractedText) + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown formatting.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseResponse(text, "gemini-1.5-pro");
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
