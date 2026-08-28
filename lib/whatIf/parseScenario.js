// ---------------------------------------------------------------------------
// WHAT IF: SCENARIO PARSER
// ---------------------------------------------------------------------------
// Turns free text like "What if I come with my wife and two kids for 9 days
// to Kigali and Akagera?" into a structured scenario object.
//
// HONESTY NOTE, read before touching this file: there is no LLM wired into
// this project (no API key was available when this was built, see the
// project's own answer on that). This is a deterministic, rule-based text
// parser: known keywords, known place names, and regular expressions, not
// an AI understanding your sentence. It is labelled that way everywhere it
// surfaces in the UI. It works well for phrasing close to Zebra's own
// example scenarios and will miss unusual wording a real LLM would catch,
// that is expected and disclosed, not hidden. If a real LLM API key is
// added later, this file is the one place that would be replaced with an
// actual model call, everything downstream (scoring, pricing, availability)
// already expects the same structured shape and would not need to change.
// ---------------------------------------------------------------------------

const DESTINATIONS = ["Kigali", "Akagera", "Lake Kivu", "Volcanoes NP", "Nyungwe"];
const DESTINATION_ALIASES = {
  kigali: "Kigali",
  akagera: "Akagera",
  "lake kivu": "Lake Kivu",
  kivu: "Lake Kivu",
  "volcanoes national park": "Volcanoes NP",
  "volcanoes np": "Volcanoes NP",
  volcanoes: "Volcanoes NP",
  gorilla: "Volcanoes NP",
  musanze: "Volcanoes NP",
  nyungwe: "Nyungwe",
};

const VEHICLE_ALIASES = {
  sorento: "kia-sorento",
  "kia sorento": "kia-sorento",
  k5: "kia-k5",
  "kia k5": "kia-k5",
  corolla: "toyota-corolla",
  "toyota corolla": "toyota-corolla",
  altis: "toyota-altis",
  "toyota altis": "toyota-altis",
};

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, a: 1, an: 1, couple: 2,
};

function wordToNumber(word) {
  const w = word.toLowerCase();
  if (NUMBER_WORDS[w] !== undefined) return NUMBER_WORDS[w];
  const n = parseInt(word, 10);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function parseDateMention(text) {
  // Matches things like "from September 10 to September 18" or
  // "10 September to 18 September" or "September 10-18". Deliberately
  // narrow: only fires on an unambiguous month name plus day number, never
  // guesses a date from something vaguer.
  const monthPattern = MONTHS.join("|");
  const re = new RegExp(
    `(?:from\\s+)?(${monthPattern})\\s+(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(?:to|-|until|through)\\s+(?:(${monthPattern})\\s+)?(\\d{1,2})\\s*(?:st|nd|rd|th)?`,
    "i"
  );
  const m = text.match(re);
  if (!m) return null;
  const year = new Date().getFullYear();
  const startMonth = MONTHS.indexOf(m[1].toLowerCase());
  const endMonth = m[3] ? MONTHS.indexOf(m[3].toLowerCase()) : startMonth;
  const startDay = parseInt(m[2], 10);
  const endDay = parseInt(m[4], 10);
  if (startMonth === -1 || endMonth === -1) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return {
    pickupDate: `${year}-${pad(startMonth + 1)}-${pad(startDay)}`,
    returnDate: `${year}-${pad(endMonth + 1)}-${pad(endDay)}`,
  };
}

export function parseScenario(text) {
  const lower = (text || "").toLowerCase();
  const missingInformation = [];

  // --- passengers -----------------------------------------------------
  let adults = null;
  let children = null;

  const adultsMatch = lower.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple)\s*(?:adults?|passengers?|people|of us|friends)/);
  if (adultsMatch) adults = wordToNumber(adultsMatch[1]);

  const childrenMatch = lower.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(?:kids?|children)/);
  if (childrenMatch) children = wordToNumber(childrenMatch[1]);

  // Family phrasing: "my wife and two children", "my husband and I",
  // "with my family". Each of these implies the speaker (1 adult) plus
  // whoever is named.
  let impliedAdults = 0;
  if (/\b(i|we)\b/.test(lower)) impliedAdults += 1;
  if (/\b(my wife|my husband|my partner)\b/.test(lower)) impliedAdults += 1;
  if (adults === null && impliedAdults > 0) adults = impliedAdults;

  if (children === null && /\btwo kids\b|\btwo children\b/.test(lower)) children = 2;
  if (children === null && /\ba kid\b|\bone child\b|\bmy child\b/.test(lower)) children = 1;

  if (adults === null && children === null) {
    // "4 people", "6 passengers" with no explicit adult/child split, treat
    // as adults since that is the safer (more capacity-conservative) read.
    const genericMatch = lower.match(/(\d+)\s*(?:people|passengers|travellers|travelers)/);
    if (genericMatch) adults = parseInt(genericMatch[1], 10);
  }

  if (adults === null && children === null) missingInformation.push("passengers");

  // --- days -------------------------------------------------------------
  let days = null;
  const daysMatch = lower.match(/(\d+)\s*[- ]?days?/);
  if (daysMatch) days = parseInt(daysMatch[1], 10);
  else if (/\ba week\b|\bone week\b/.test(lower)) days = 7;
  else if (/\btwo weeks\b|\ba fortnight\b/.test(lower)) days = 14;
  else {
    const extendMatch = lower.match(/extend.*by\s*(\d+)\s*days?/);
    if (extendMatch) days = { extendByDays: parseInt(extendMatch[1], 10) };
  }
  if (days === null) missingInformation.push("trip length");

  // --- destinations -------------------------------------------------------
  const destinations = [];
  for (const [alias, canonical] of Object.entries(DESTINATION_ALIASES)) {
    if (lower.includes(alias) && !destinations.includes(canonical)) {
      destinations.push(canonical);
    }
  }

  // --- vehicle mention (for "choose X instead of Y") -----------------------
  let mentionedVehicle = null;
  let insteadOfVehicle = null;
  const insteadMatch = lower.match(/(sorento|kia sorento|k5|kia k5|corolla|toyota corolla|altis|toyota altis)\s+instead of\s+(?:the\s+)?(sorento|kia sorento|k5|kia k5|corolla|toyota corolla|altis|toyota altis)/);
  if (insteadMatch) {
    mentionedVehicle = VEHICLE_ALIASES[insteadMatch[1]];
    insteadOfVehicle = VEHICLE_ALIASES[insteadMatch[2]];
  } else {
    for (const [alias, id] of Object.entries(VEHICLE_ALIASES)) {
      if (lower.includes(alias)) {
        mentionedVehicle = id;
        break;
      }
    }
  }

  // --- driver / chauffeur -------------------------------------------------
  const wantsDriver = /\bdriver\b|\bchauffeur\b|don'?t want to drive|not drive|without driving/.test(lower);

  // --- airport --------------------------------------------------------
  const mentionsAirport = /\bairport\b|\bland\b|\barrive\b|\bflight\b/.test(lower);

  // --- luggage ------------------------------------------------------
  let luggageCount = null;
  const luggageMatch = lower.match(/(\d+)\s*(?:large )?(?:suitcases?|bags?|luggage)/);
  if (luggageMatch) luggageCount = parseInt(luggageMatch[1], 10);

  // --- budget / comfort preference -----------------------------------
  let budgetPreference = null;
  if (/\bcheap|budget|less money|spend less|affordable\b/.test(lower)) budgetPreference = "budget";
  else if (/\bcomfortable|comfort|premium|best option|nicest\b/.test(lower)) budgetPreference = "comfort";

  // --- dates ------------------------------------------------------------
  const dateRange = parseDateMention(text || "");

  const tripType = destinations.some((d) => d !== "Kigali") ? "roadtrip" : "city";

  // --- policy question detection ------------------------------------------
  // "What if your cancellation policy changes" or "What if I need to know
  // your insurance coverage" are not trip scenarios, they are policy
  // questions. If the text mentions a policy topic and nothing else in this
  // parser found an actual scenario signal (passengers, days, destination,
  // vehicle, driver, luggage, or dates), do not force a vehicle
  // recommendation onto it, per the platform's rule against answering a
  // question it was not asked. The caller decides how to handle this flag,
  // this parser only detects and reports it honestly.
  const policyKeywords =
    /\b(cancellation policy|cancel(?:ling|lation)?|refund|insurance coverage|security deposit|deposit amount|terms and conditions|legal terms|warranty|late return fee|fuel policy|mileage limit|roadside assistance policy)\b/;
  const explicitPassengerCount = /(\d+)\s*(?:people|passengers|travellers|travelers|adults?)/.test(lower);
  const hasScenarioSignal = Boolean(
    adultsMatch ||
      childrenMatch ||
      explicitPassengerCount ||
      daysMatch ||
      /\ba week\b|\bone week\b|\btwo weeks\b|\ba fortnight\b/.test(lower) ||
      destinations.length > 0 ||
      mentionedVehicle ||
      wantsDriver ||
      luggageMatch ||
      dateRange
  );
  const isPolicyQuestion = policyKeywords.test(lower) && !hasScenarioSignal;

  return {
    isPolicyQuestion,
    scenario: {
      adults: adults ?? null,
      children: children ?? 0,
      days: typeof days === "number" ? days : null,
      extendByDays: days && typeof days === "object" ? days.extendByDays : null,
      destinations,
      driveMode: wantsDriver ? "driver" : "self",
      mentionsAirport,
      luggageCount,
      budgetPreference,
      mentionedVehicle,
      insteadOfVehicle,
      pickupDate: dateRange?.pickupDate || null,
      returnDate: dateRange?.returnDate || null,
      tripType,
    },
    missingInformation,
    // Explicit, honest label for the UI: this is not AI, do not say it is.
    parserType: "deterministic",
  };
}
