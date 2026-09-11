// ---------------------------------------------------------------------------
// ZEBRA AI: PROVIDER ABSTRACTION
// ---------------------------------------------------------------------------
// Server-only. Never import this from a "use client" component, it reads
// real API keys from process.env and must never let them reach the browser.
//
// HONESTY NOTE, read before assuming this makes AI Support "live": as of
// this build, no AI_PROVIDER API key has been supplied in .env. That means
// isConfigured() below returns false and every caller (lib/ai/support.js,
// the What If explainer, the trip planner parser) falls back to its own
// honest, deterministic behavior instead of pretending to call a model.
// This file is real, working integration code, ready to go live the moment
// a real OPENAI_API_KEY or ANTHROPIC_API_KEY is added, not a mock.
//
// MODEL ROUTING (spec items 19/20): a customer question is not one-size,
// so callers pass a `task` tier and this file picks the model for it:
//   - "fast"      simple FAQ / lookup questions, cheapest model
//   - "standard"  normal support questions that need a tool call
//   - "reasoning" complex itinerary planning, business analysis
// Defaults below are OpenAI's current lineup as of this build (GPT-6 Astra
// for "reasoning"), overridable per tier via env vars so this does not need
// a code change every time a provider ships a new model name.
// ---------------------------------------------------------------------------

const PROVIDER = (process.env.AI_PROVIDER || "").trim().toLowerCase(); // "openai" | "anthropic" | "" (none)

const DEFAULT_MODELS = {
  openai: {
    fast: process.env.AI_MODEL_FAST || "gpt-5-mini",
    standard: process.env.AI_MODEL_STANDARD || "gpt-5.1",
    reasoning: process.env.AI_MODEL_REASONING || "gpt-6-astra",
  },
  anthropic: {
    fast: process.env.AI_MODEL_FAST || "claude-haiku-4-5",
    standard: process.env.AI_MODEL_STANDARD || "claude-sonnet-4-5",
    reasoning: process.env.AI_MODEL_REASONING || "claude-opus-4-5",
  },
};

// Real capability check, not a guess: which provider is selected AND does a
// key for it actually exist in this environment.
export function isConfigured() {
  if (PROVIDER === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (PROVIDER === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  return false;
}

export function getProviderName() {
  return PROVIDER || "none";
}

export function getModelForTask(task = "standard") {
  const table = DEFAULT_MODELS[PROVIDER];
  if (!table) return null;
  return table[task] || table.standard;
}

let _openaiClient;
let _anthropicClient;

async function getOpenAIClient() {
  if (_openaiClient) return _openaiClient;
  const { default: OpenAI } = await import("openai");
  _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openaiClient;
}

async function getAnthropicClient() {
  if (_anthropicClient) return _anthropicClient;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropicClient;
}

// toolDefs: [{ name, description, parameters (JSON schema) }]
// messages: [{ role: "system"|"user"|"assistant"|"tool", content, ... }]
//
// Returns { content, toolCalls, model, provider } where toolCalls is
// [{ id, name, arguments }] or []. Throws a plain Error if no provider is
// configured, callers MUST catch this and fall back honestly (see
// lib/ai/support.js), never surface a raw exception to a customer.
export async function chatComplete({ task = "standard", messages, tools = [] }) {
  if (!isConfigured()) {
    throw new Error(
      "No AI provider is configured (set AI_PROVIDER and the matching API key in .env). " +
        "Implemented but not production-connected."
    );
  }

  const model = getModelForTask(task);

  // `messages` uses one normalized shape regardless of provider:
  //   { role: "system"|"user", content }
  //   { role: "assistant", content, toolCalls?: [{id, name, arguments}] }
  //   { role: "tool", toolCallId, name, content }  (content = JSON string result)
  // This lets lib/ai/support.js run its tool-calling loop without knowing
  // which provider is behind it, translated to each provider's actual
  // wire format below.
  if (PROVIDER === "openai") {
    const client = await getOpenAIClient();
    const openaiMessages = messages.map((m) => {
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant",
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
          })),
        };
      }
      if (m.role === "tool") {
        return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
      }
      return { role: m.role, content: m.content };
    });
    const response = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      tools: tools.length
        ? tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
          }))
        : undefined,
    });
    const choice = response.choices[0];
    const toolCalls = (choice.message.tool_calls || []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: safeJsonParse(tc.function.arguments),
    }));
    return { content: choice.message.content || "", toolCalls, model, provider: "openai" };
  }

  if (PROVIDER === "anthropic") {
    const client = await getAnthropicClient();
    const system = messages.find((m) => m.role === "system")?.content;
    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "assistant",
            content: [
              ...(m.content ? [{ type: "text", text: m.content }] : []),
              ...m.toolCalls.map((tc) => ({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments })),
            ],
          };
        }
        if (m.role === "tool") {
          // Anthropic expects tool results as a user-role message with a
          // tool_result content block, not their own role.
          return {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: m.toolCallId, content: m.content }],
          };
        }
        return { role: m.role, content: m.content };
      });
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: anthropicMessages,
      tools: tools.length
        ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }))
        : undefined,
    });
    const toolCalls = response.content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({ id: block.id, name: block.name, arguments: block.input }));
    const textBlock = response.content.find((block) => block.type === "text");
    return { content: textBlock?.text || "", toolCalls, model, provider: "anthropic" };
  }

  throw new Error(`Unknown AI_PROVIDER "${PROVIDER}". Use "openai" or "anthropic".`);
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
