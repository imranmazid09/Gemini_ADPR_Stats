// This is the secure serverless function that runs on Netlify's servers.
// It acts as a bridge between your website and the Gemini API.
// It safely uses your API key without exposing it to the user's browser.

// Import the Google Generative AI SDK
const { GoogleGenerativeAI } = require("@google/generative-ai");

// The main handler function for the Netlify serverless function
exports.handler = async function(event, context) {
  // 1. --- PREPARE AND VALIDATE ---
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: "Only POST requests are allowed" }),
    };
  }

  // Get the API key from the environment variables (set in Netlify's UI)
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Gemini API key is not configured." }),
    };
  }

  // Initialize the GoogleGenerativeAI with the API key
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

  try {
    // 2. --- GET USER INPUT & CONSTRUCT THE PROMPT ---
    const { testType, domain } = JSON.parse(event.body);

    // Basic validation for user input
    if (!testType || !domain) {
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: "Missing 'testType' or 'domain' in request body" }),
        };
    }

    // This is the detailed prompt we send to the Gemini API.
    // It is carefully structured to request all the components you need.
    const prompt = `
        You are an expert instructional designer specializing in statistics for communication research. 
        Your task is to generate a complete, self-contained educational module for a student.

        The student has selected the following:
        - Statistical Test: ${testType}
        - Domain: ${domain}

        Please generate the following four components, formatted as a single JSON object. Do not include any text or formatting outside of the JSON structure.

        1.  "scenario": A detailed, realistic scenario (2-3 paragraphs) from the specified **${domain}** domain that requires the use of the **${testType}**. The scenario should be engaging and clearly outline a problem that needs solving.

        2.  "dataStructure": A description of the variables involved in the scenario. For each variable, specify its name (e.g., "Ad_Format"), its level of measurement (Nominal, Ordinal, Interval, or Ratio), and a brief description.

        3.  "hypotheses": A clearly stated null hypothesis (H₀) and alternative hypothesis (H₁) that are appropriate for the scenario and the selected statistical test.

        4.  "spssGuide": A concise, step-by-step guide on how to perform the **${testType}** in SPSS for this specific scenario. Use clear, simple language (e.g., "Navigate to Analyze > Compare Means...").

        5.  "csvData": A synthetic dataset of exactly 30 observations, formatted as a CSV string. The CSV string must start with a header row of variable names and be followed by 30 rows of data. The data should be plausible for the scenario and structured to yield a statistically significant result when analyzed with the ${testType}. Ensure the CSV data is a single string with newline characters (\\n) separating the rows.
    `;

    // 3. --- CALL THE GEMINI API ---
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // The response from Gemini should be a JSON string. We parse it here.
    const generatedJson = JSON.parse(text);

    // 4. --- SEND THE RESPONSE BACK TO THE FRONT-END ---
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(generatedJson),
    };

  } catch (error) {
    // 5. --- HANDLE ERRORS ---
    console.error("Error calling Gemini API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate scenario from the AI model.", details: error.message }),
    };
  }
};
