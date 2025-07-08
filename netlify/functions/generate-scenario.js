// Load environment variables if running locally
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable
// In Netlify, you will set GEMINI_API_KEY as an environment variable.
// For local development, you'll use a .env file.
const API_KEY = process.env.GEMINI_API_KEY;

// Ensure the API key is available
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set. Please set it in your Netlify environment variables or a .env file for local development.");
    // Exit or handle error appropriately if API key is missing
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Main handler for the Netlify Function
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
            headers: { 'Allow': 'POST' }
        };
    }

    try {
        const { testType, domain } = JSON.parse(event.body);

        if (!testType || !domain) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing testType or domain in request body.' })
            };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construct the prompt for the AI model
        const prompt = `Generate a realistic, practical scenario for an Advertising or Public Relations (AdPR) research study.
        The scenario should involve a ${testType} statistical test within the ${domain} domain.
        
        Provide the following structured output:
        
        1.  **Scenario:** A detailed, realistic problem or situation.
        2.  **Data Structure:** Describe the variables needed, their type (e.g., categorical, continuous), and how they would be measured (e.g., survey questions, metrics).
        3.  **Hypotheses:** State a clear null hypothesis (H₀) and an alternative hypothesis (H₁).
        4.  **SPSS Instructional Guide:** Provide a concise, step-by-step guide on how to conceptually run this specific statistical test in SPSS for the generated scenario. Focus on menu navigation and key dialog box selections relevant to the test.
        
        Ensure the output is in plain text, clearly labeled with the headings "Scenario:", "Data Structure:", "Hypotheses:", and "SPSS Instructional Guide:".`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the text into structured parts
        const scenarioMatch = text.match(/Scenario:([\s\S]*?)(?=Data Structure:|$)/i);
        const dataStructureMatch = text.match(/Data Structure:([\s\S]*?)(?=Hypotheses:|$)/i);
        const hypothesesMatch = text.match(/Hypotheses:([\s\S]*?)(?=SPSS Instructional Guide:|$)/i);
        const spssGuideMatch = text.match(/SPSS Instructional Guide:([\s\S]*)/i);

        const scenario = scenarioMatch ? scenarioMatch[1].trim() : 'Could not parse scenario.';
        const dataStructure = dataStructureMatch ? dataStructureMatch[1].trim() : 'Could not parse data structure.';
        const hypotheses = hypothesesMatch ? hypothesesMatch[1].trim() : 'Could not parse hypotheses.';
        const spssGuide = spssGuideMatch ? spssGuideMatch[1].trim() : 'Could not parse SPSS instructional guide.';

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario,
                dataStructure,
                hypotheses,
                spssGuide
            })
        };
    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate scenario: ' + error.message })
        };
    }
};
