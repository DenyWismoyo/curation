const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Try to load local env if any

async function testAPIs() {
  console.log("DeepSeek Key:", process.env.DEEPSEEK_API_KEY ? "Set" : "Not Set");
  console.log("Gemini Key:", process.env.GEMINI_API_KEY ? "Set" : "Not Set");
}

testAPIs();
