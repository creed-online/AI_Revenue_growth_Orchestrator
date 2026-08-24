import dotenv from "dotenv";

// Load local .env then fall back to repo root
const r = dotenv.config();
if (r.parsed) console.log("Loaded .env from backend");
if (!process.env.ANTHROPIC_API_KEY) {
  const p = dotenv.config({ path: "../.env" });
  if (p.parsed) console.log("Loaded .env from ../.env");
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set. Set it in .env to test Anthropic connectivity.");
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

export async function getAnthropicCompletion(prompt = "Say hello") {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing in environment");

  const body = {
    model: "claude-2",
    messages: [
      { role: "user", content: prompt },
    ],
    // optional: temperature, max tokens etc
  };

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-10-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Anthropic API error: ${res.status} ${res.statusText}: ${txt}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  // For messages endpoint the assistant reply is typically in data?.completion or data?.response
  return data;
}

export async function main() {
  try {
    const result = await getAnthropicCompletion("Explain why fast language models matter in one sentence.");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Anthropic client error:", err.message || err);
  }
}

export default { getAnthropicCompletion, main };
