/**
 * Quick test script to verify Gemini API key is working
 * Run with: node test_gemini.js
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function testGemini() {
    console.log('🔑 Testing Gemini API Key...');
    console.log(`   Key present: ${GOOGLE_API_KEY ? 'Yes (starts with ' + GOOGLE_API_KEY.substring(0, 8) + '...)' : 'NO!'}`);

    if (!GOOGLE_API_KEY) {
        console.error('❌ GOOGLE_API_KEY is not set in .env file!');
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        console.log('📤 Sending test prompt to Gemini...');
        const result = await model.generateContent("Say 'Hello, HIS System!' in exactly 5 words.");
        const response = await result.response;
        const text = response.text();

        console.log('✅ Gemini API Response:', text);
        console.log('🎉 SUCCESS! Gemini API key is working!');
    } catch (error) {
        console.error('❌ Gemini API Error:', error.message);
        if (error.message.includes('API_KEY_INVALID')) {
            console.error('   -> Your GOOGLE_API_KEY is invalid. Please get a new one from https://aistudio.google.com/app/apikey');
        } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
            console.error('   -> Your API quota is exhausted. Wait or get a new key.');
        }
    }
}

testGemini();
