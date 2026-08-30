import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();
if (!process.env.GROQ_API_KEY) {
  dotenv.config({ path: "../.env" });
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testModels() {
  console.log("=== Testing Available Groq Models ===");
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "openai/gpt-oss-20b"];

  for (const m of models) {
    try {
      const t0 = Date.now();
      const res = await groq.chat.completions.create({
        model: m,
        messages: [{ role: "user", content: "Hello! Return JSON: {\"status\": \"ok\"}" }],
        max_tokens: 50,
      });
      console.log(`✔ [${m}] works! Took ${Date.now() - t0}ms, Response:`, res.choices[0]?.message?.content?.trim());
    } catch (err) {
      console.log(`✘ [${m}] failed:`, err.message);
    }
  }
}

testModels().catch(console.error);

