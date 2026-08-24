// src/testAiClient.js
// Quick sanity check: does aiClient.js correctly get a tool_call back from Groq?
// Run with: node src/testAiClient.js

import { callModel, PROVIDER } from "./aiClient.js";

const fakeTools = [
  {
    name: "get_weather",
    description: "Get the current weather for a city",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string" },
      },
      required: ["city"],
    },
  },
];

async function main() {
  console.log(`Testing with provider: ${PROVIDER}`);

  const result = await callModel({
    system: "You are a helpful assistant. Use tools when needed.",
    messages: [
      { role: "user", content: "What's the weather in Jaipur right now?" },
    ],
    tools: fakeTools,
  });

  console.log("\n--- RESULT ---");
  console.log("text:", result.text);
  console.log("toolCalls:", JSON.stringify(result.toolCalls, null, 2));
  console.log("stopReason:", result.stopReason);

  if (result.toolCalls.length > 0) {
    console.log("\n✅ Tool calling works — model correctly called get_weather");
  } else {
    console.log(
      "\n⚠️ No tool call returned — model replied with plain text instead. Check prompt/model."
    );
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});