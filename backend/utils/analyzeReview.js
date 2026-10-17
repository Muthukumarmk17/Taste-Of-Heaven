const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tried in order. If one is busy or unavailable, the next one is used.
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
];

async function analyzeReview(comment, rating) {
  const prompt = `Analyze this recipe review. Rating: ${rating}/5. Review: "${comment}".
Return JSON only with these keys:
- sentiment: "Positive", "Neutral" or "Negative"
- category: one of "Taste", "Ingredients", "Difficulty", "Presentation", "Overall"
- keywords: array of 1 to 5 short words
- summary: one short sentence`;

  let lastError;

  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        console.log(`Analysis done using ${modelName}`);
        return JSON.parse(result.response.text());
      } catch (err) {
        lastError = err;

        // Model not available for this key: skip to the next model
        if (err.status === 404) break;

        // Busy or rate limited: wait once, retry, then move on
        const busy = [429, 500, 503].includes(err.status);
        if (!busy) throw err;

        console.log(`${modelName} busy (${err.status}), attempt ${attempt}/5`);
        if (attempt < 5) await sleep(3000);
      }
    }
  }

  throw lastError;
}

module.exports = analyzeReview;