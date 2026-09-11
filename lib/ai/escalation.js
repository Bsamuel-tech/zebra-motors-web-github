// ---------------------------------------------------------------------------
// ZEBRA AI: DETERMINISTIC ESCALATION RULES
// ---------------------------------------------------------------------------
// AI architecture spec, items 5 and 10: escalation to a human is decided by
// fixed, auditable rules, never by a self-reported LLM confidence number
// (a model can be confidently wrong, and a fake percentage would just be
// another invented number, the whole platform's rule against fabricating
// data applies to this too). Every rule here is a real keyword/pattern
// match a human can read and audit, not a black box.
//
// This runs BEFORE any attempt to answer, for the categories where Zebra
// staff should always be the one to respond regardless of how well an AI
// might otherwise handle it (damage, insurance claims, legal, payment
// disputes, explicit human requests). Other cases (an unmatched knowledge
// question, a low-confidence answer) are handled by the caller offering
// escalation rather than forcing it, see lib/ai/support.js.
// ---------------------------------------------------------------------------

const RULES = [
  {
    reason: "Customer explicitly asked for a human.",
    pattern: /\b(live agent|talk to (a |the )?(human|person|someone|team)|speak to (a |the )?(human|person|someone|team)|contact zebra( motors)? directly|real person|human support)\b/i,
    customerMessage: "Connecting you with a real member of the Zebra Motors team now.",
  },
  {
    reason: "Possible vehicle damage or accident, needs human handling.",
    pattern: /\b(damage|damaged|accident|crash|collision|dent|scratch|broke down|breakdown)\b/i,
    customerMessage:
      "I'm sorry to hear that. Vehicle damage and accidents need to be handled directly by the Zebra Motors team, connecting you now.",
  },
  {
    reason: "Insurance claim, needs human handling.",
    pattern: /\b(insurance claim|claim (my|the) insurance|file a claim)\b/i,
    customerMessage: "Insurance claims need to go through the Zebra Motors team directly, connecting you now.",
  },
  {
    reason: "Legal matter, needs human handling.",
    pattern: /\b(lawyer|legal action|lawsuit|sue zebra|police report)\b/i,
    customerMessage: "This needs to go directly to the Zebra Motors team, connecting you now.",
  },
  {
    reason: "Payment problem or dispute, needs human handling.",
    pattern: /\b(payment (failed|didn'?t go through|problem|issue)|charged twice|double charged|refund)\b/i,
    customerMessage: "Payment issues need to be looked at directly by the Zebra Motors team, connecting you now.",
  },
  {
    reason: "Customer expressed a complaint.",
    pattern: /\b(complain|complaint|unacceptable|terrible service|very (unhappy|disappointed)|this is ridiculous)\b/i,
    customerMessage: "I'm sorry this hasn't gone well. Let me connect you with the Zebra Motors team directly.",
  },
];

export function checkEscalationRules(text) {
  const lower = (text || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.pattern.test(lower)) {
      return { escalate: true, reason: rule.reason, customerMessage: rule.customerMessage };
    }
  }
  return { escalate: false, reason: null, customerMessage: null };
}
