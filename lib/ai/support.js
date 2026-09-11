// ---------------------------------------------------------------------------
// ZEBRA AI: SUPPORT ENGINE
// ---------------------------------------------------------------------------
// This is the one brain behind Zebra AI Support, the What If explainer
// (lib/whatIf/*), and (eventually) the AI Trip Planner and business
// analyst, per the AI architecture spec's own rule against three
// disconnected chatbots: they all read the same knowledge base
// (lib/db/knowledge.js) and call the same tool gateway (lib/ai/tools.js).
//
// HONESTY NOTE, the same one every deterministic layer in this codebase
// carries: as of this build, no AI_PROVIDER key is configured (see
// lib/ai/provider.js), so handleSupportMessage() below runs its real,
// working deterministic fallback path, not a live model. This is
// implemented so that the moment a real key is added, the same function
// starts running the tool-calling loop against an actual LLM, with
// everything downstream (tool gateway, escalation rules, conversation
// storage) already built and already exercised by the fallback path today.
// ---------------------------------------------------------------------------
import { findRelevantArticles } from "@/lib/db/knowledge";
import { isConfigured, chatComplete, getProviderName, getModelForTask } from "./provider";
import { TOOLS, runTool } from "./tools";
import {
  addMessage,
  getMessagesForConversation,
  isHumanAssigned,
  updateConversation,
  logAiInteraction,
} from "@/lib/db/support";
import { checkEscalationRules } from "./escalation";
import { parseScenario } from "@/lib/whatIf/parseScenario";
import { getVehicleBySlug } from "@/lib/db/vehicles";
import { formatRWF } from "@/data/vehicles";

const SYSTEM_PROMPT = `You are Zebra AI Support, a support assistant for Zebra Motors, a real car rental and Rwanda travel company. You are not a generic AI assistant, do not say "I am an AI language model" or similar, speak as Zebra Motors support. Keep answers concise and specific.

Rules:
- Never invent a price, availability answer, booking status, or Zebra policy. Always call the matching tool (getFleet, getVehicle, checkAvailability, calculateRentalPrice, getBooking, getDestination, geocodeLocation, calculateRoute) for anything factual about Zebra's real data.
- For policy questions (cancellation, insurance, requirements, mileage, chauffeur, terms), only answer from the knowledge excerpts you are given. If nothing relevant was provided, say plainly that you cannot confirm that yet and offer to connect the customer with the team, never guess Zebra's policy.
- To create a new booking request, use createBookingRequest, it never confirms the booking, only creates a request Zebra staff will review.
- To change an existing booking, use requestBookingChange, you cannot modify a booking directly.
- If the customer asks for a human, or you cannot reliably help, call transferToHuman.
- Never use an em dash or en dash character in your reply.`;

function buildKnowledgeContext(articles) {
  if (!articles.length) return "";
  return (
    "Relevant Zebra knowledge base excerpts (only source of truth for policy questions):\n" +
    articles.map((a) => `[${a.category}] ${a.title}\n${a.body}`).join("\n\n")
  );
}

async function generateHandoverSummary({ conversationId, escalationReason }) {
  const history = await getMessagesForConversation(conversationId);
  const customerLines = history.filter((m) => m.senderType === "CUSTOMER").map((m) => m.content);
  // Template-based summary, real content from the actual conversation, not
  // invented. If a provider is connected later this can be replaced with an
  // LLM-written summary using the same history, the shape a human agent
  // reads (see /admin/support) would not need to change.
  const lastMessage = customerLines[customerLines.length - 1] || "";
  return [
    `Reason for escalation: ${escalationReason || "AI could not confidently answer."}`,
    customerLines.length > 1 ? `Conversation so far: ${customerLines.length} customer messages.` : null,
    `Most recent message: "${lastMessage}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Very small, honest deterministic fallback for when no AI provider is
// configured. It reuses the What If parser (lib/whatIf/parseScenario.js)
// to pull out entities like a mentioned vehicle or a day count, since that
// parser already does real, tested entity extraction, rather than writing
// a second copy of the same regex work. It only ever states a real number
// from a tool call or a real knowledge article, never a guess.
async function deterministicFallback({ text, knowledgeArticles, context }) {
  if (knowledgeArticles.length > 0) {
    const top = knowledgeArticles[0];
    return {
      content: `${top.body}\n\n(From Zebra's published "${top.title}" information. Want me to connect you with the team for anything more specific?)`,
      toolsCalled: [],
      knowledgeSources: [top.id],
    };
  }

  const parsed = parseScenario(text);
  if (parsed.scenario.mentionedVehicle && (parsed.scenario.days || (parsed.scenario.pickupDate && parsed.scenario.returnDate))) {
    const vehicle = await getVehicleBySlug(parsed.scenario.mentionedVehicle);
    if (vehicle) {
      const days = parsed.scenario.days || 1;
      const today = new Date();
      const pickupDate = parsed.scenario.pickupDate || today.toISOString().slice(0, 10);
      const returnDate =
        parsed.scenario.returnDate ||
        new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
      const result = await runTool(
        "calculateRentalPrice",
        { vehicleId: vehicle.dbId, pickupDate, returnDate },
        context
      );
      if (!result.error) {
        return {
          content: `For the ${vehicle.name} over ${result.days} day${result.days === 1 ? "" : "s"}, the estimated total is around RWF ${formatRWF(result.vehicleRental.midRWF)} (real range: RWF ${formatRWF(result.vehicleRental.minRWF)} to RWF ${formatRWF(result.vehicleRental.maxRWF)}). ${result.vehicleRental.note} Want me to check real availability or start a booking request?`,
          toolsCalled: ["calculateRentalPrice"],
          knowledgeSources: [],
        };
      }
    }
  }

  return {
    content:
      "I can't confirm that from what's published yet. Would you like me to connect you with the Zebra Motors team, or would you like to keep going with me on something else, like fleet, pricing, or a booking?",
    toolsCalled: [],
    knowledgeSources: [],
    offerEscalation: true,
  };
}

async function runProviderLoop({ text, knowledgeArticles, conversationId, context, task }) {
  const history = await getMessagesForConversation(conversationId);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(buildKnowledgeContext(knowledgeArticles)
      ? [{ role: "system", content: buildKnowledgeContext(knowledgeArticles) }]
      : []),
    ...history.slice(0, -1).map((m) => ({
      role: m.senderType === "CUSTOMER" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: text },
  ];

  const toolsCalled = [];
  let rounds = 0;
  while (rounds < 3) {
    rounds += 1;
    const result = await chatComplete({ task, messages, tools: TOOLS });
    if (!result.toolCalls.length) {
      return { content: result.content, toolsCalled, model: result.model, provider: result.provider };
    }
    messages.push({ role: "assistant", content: result.content, toolCalls: result.toolCalls });
    for (const call of result.toolCalls) {
      const toolResult = await runTool(call.name, call.arguments, context);
      toolsCalled.push(call.name);
      messages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify(toolResult),
      });
      if (call.name === "transferToHuman") {
        return {
          content: result.content || "Connecting you with the Zebra Motors team now.",
          toolsCalled,
          model: result.model,
          provider: result.provider,
          escalated: true,
        };
      }
    }
  }
  return {
    content: "Let me connect you with the Zebra Motors team to make sure this is handled correctly.",
    toolsCalled,
    escalated: true,
  };
}

// Main entry point. conversationId must already exist (see
// app/api/ai/support/route.js, which creates one on the customer's first
// message). context = { customerId, conversationId }, the only place a
// customer's identity is threaded through to tool calls, see lib/ai/tools.js.
export async function handleSupportMessage({ conversationId, customerId, text }) {
  if (await isHumanAssigned(conversationId)) {
    await addMessage({ conversationId, senderType: "CUSTOMER", content: text });
    return {
      reply: null,
      handledBy: "human",
      note: "A Zebra Motors team member is already handling this conversation, they will reply here directly.",
    };
  }

  await addMessage({ conversationId, senderType: "CUSTOMER", content: text });
  const context = { customerId, conversationId };

  const escalation = checkEscalationRules(text);
  if (escalation.escalate) {
    const summary = await generateHandoverSummary({ conversationId, escalationReason: escalation.reason });
    await updateConversation(conversationId, {
      status: "ESCALATED",
      escalationReason: escalation.reason,
      aiSummary: summary,
    });
    await addMessage({ conversationId, senderType: "AI", content: escalation.customerMessage, metadata: { escalated: true } });
    await logAiInteraction({
      conversationId,
      provider: getProviderName(),
      escalated: true,
      escalationReason: escalation.reason,
    });
    return { reply: escalation.customerMessage, escalated: true, reason: escalation.reason };
  }

  const knowledgeArticles = await findRelevantArticles(text);
  let outcome;
  if (isConfigured()) {
    outcome = await runProviderLoop({
      text,
      knowledgeArticles,
      conversationId,
      context,
      task: "standard",
    });
  } else {
    outcome = await deterministicFallback({ text, knowledgeArticles, context });
  }

  if (outcome.escalated) {
    const summary = await generateHandoverSummary({ conversationId, escalationReason: "AI transferred this conversation." });
    await updateConversation(conversationId, { status: "ESCALATED", aiSummary: summary });
  }

  await addMessage({
    conversationId,
    senderType: "AI",
    content: outcome.content,
    metadata: { toolsCalled: outcome.toolsCalled || [], provider: outcome.provider || getProviderName() },
  });
  await logAiInteraction({
    conversationId,
    provider: outcome.provider || getProviderName(),
    model: outcome.model || getModelForTask("standard") || "",
    toolsCalled: outcome.toolsCalled || [],
    knowledgeSources: outcome.knowledgeSources || [],
    escalated: Boolean(outcome.escalated),
  });

  return {
    reply: outcome.content,
    escalated: Boolean(outcome.escalated),
    offerEscalation: Boolean(outcome.offerEscalation),
    aiConnected: isConfigured(),
  };
}
