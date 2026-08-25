// src/config/aiClient.js
// Single place that decides which model provider we talk to.
// Set AI_PROVIDER=groq while building/testing (free).
// Set AI_PROVIDER=anthropic only for the real demo run.

import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import dotenv from "dotenv";

// Load .env from cwd, fall back to repo root ../.env (matches working test script)
const loaded = dotenv.config();
if (loaded.parsed) {
  console.log("Loaded .env from current working directory");
}
if (!process.env.GROQ_API_KEY) {
  const parent = dotenv.config({ path: "../.env" });
  if (parent.parsed) {
    console.log("Loaded .env from ../.env");
  }
}
if (!process.env.GROQ_API_KEY) {
  console.warn(
    "GROQ_API_KEY is not set. Groq client will fail until the key is provided in backend/.env"
  );
}

const PROVIDER = process.env.AI_PROVIDER || "groq";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model names per provider — swap freely without touching orchestrator.js
const MODELS = {
  groq: "openai/gpt-oss-20b", // confirmed working in test script
  anthropic: "claude-sonnet-4-6",
};

/**
 * Unified chat-with-tools call.
 * messages: [{ role: "user"|"assistant"|"tool", content: ... }]
 * tools: array of tool definitions (Anthropic-style; we translate for Groq)
 * Returns a normalized shape: { text, toolCalls: [{id, name, input}], raw }
 */
export async function callModel({ system, messages, tools }) {
  if (PROVIDER === "anthropic") {
    const resp = await anthropic.messages.create({
      model: MODELS.anthropic,
      max_tokens: 1500,
      system,
      messages,
      tools,
    });

    const toolCalls = resp.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input }));

    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return { text, toolCalls, stopReason: resp.stop_reason, raw: resp };
  }

  if (PROVIDER === "groq") {
    // Groq uses OpenAI-style tool schema: { type: "function", function: {...} }
    const groqTools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    // Convert Anthropic-style message blocks to OpenAI/Groq format
    const groqMessages = [{ role: "system", content: system }];

    for (const msg of messages) {
      if (typeof msg.content === "string") {
        groqMessages.push(msg);
      } else if (Array.isArray(msg.content)) {
        if (msg.role === "assistant") {
          const toolCalls = msg.content
            .filter((c) => c.type === "tool_use")
            .map((c) => ({
              id: c.id,
              type: "function",
              function: {
                name: c.name,
                arguments: typeof c.input === "string" ? c.input : JSON.stringify(c.input || {}),
              },
            }));
          groqMessages.push({
            role: "assistant",
            content: null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          });
        } else if (msg.role === "user") {
          const toolResults = msg.content.filter((c) => c.type === "tool_result");
          if (toolResults.length > 0) {
            for (const tr of toolResults) {
              groqMessages.push({
                role: "tool",
                tool_call_id: tr.tool_use_id,
                content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content),
              });
            }
          } else {
            groqMessages.push({
              role: "user",
              content: msg.content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("\n"),
            });
          }
        }
      } else {
        groqMessages.push({
          role: msg.role,
          content: JSON.stringify(msg.content),
        });
      }
    }

    const resp = await groq.chat.completions.create({
      model: MODELS.groq,
      messages: groqMessages,
      tools: groqTools,
      tool_choice: "auto",
      max_tokens: 1500,
    });

    const choice = resp.choices[0];
    const toolCalls = (choice.message.tool_calls || []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    }));

    return {
      text: choice.message.content || "",
      toolCalls,
      stopReason: choice.finish_reason,
      raw: resp,
    };
  }

  throw new Error(`Unknown AI_PROVIDER: ${PROVIDER}`);
}

export { PROVIDER };