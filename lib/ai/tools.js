// ---------------------------------------------------------------------------
// ZEBRA AI: TOOL-CALLING GATEWAY
// ---------------------------------------------------------------------------
// Security rule (AI architecture spec, item 23): the AI is never allowed to
// invent a price, a vehicle, an availability answer, or a booking status.
// It can only call the functions below, every one of which is a thin,
// auditable wrapper around this codebase's real, already-tested database
// and business logic (lib/db/*, lib/geo/provider.js, lib/whatIf/pricing.js),
// not a new parallel implementation. The model decides WHICH tool to call
// and explains the result in plain language, it never computes the result
// itself.
//
// Every handler receives (args, context). `context` carries what the
// calling route already knows about who is asking (customerId from a
// verified session cookie, conversationId of the current support thread),
// and handlers use `context`, never a value the model supplies in `args`,
// for anything security-sensitive (whose booking to show, which
// conversation to escalate). This is what stops a prompt injection or a
// model mistake from reading another customer's booking or escalating the
// wrong conversation.
//
// Nothing here can confirm a booking, issue a refund, change a price, or
// delete a customer. createBookingRequest() creates the same PENDING
// request a human typing into the public /book form would create, still
// reviewed by Zebra staff before it means anything. requestBookingChange()
// never touches the bookings table directly, it escalates to a human,
// exactly like the spec's own worked example ("This change requires Zebra
// Motors to confirm vehicle availability. I can send the request to the
// team for you.").
// ---------------------------------------------------------------------------
import { getVehicles, getVehicleBySlug, getVehicleByDbId } from "@/lib/db/vehicles";
import { checkAvailability } from "@/lib/db/availability";
import { getExtraByKey } from "@/lib/db/extras";
import { getBookings, createBooking } from "@/lib/db/bookings";
import { getDestinationBySlug, getDestinations } from "@/lib/db/destinations";
import { geocodePlace, getRoute } from "@/lib/geo/provider";
import { estimateRental } from "@/lib/whatIf/pricing";
import { updateConversation, addMessage } from "@/lib/db/support";
import { getVehicleUtilization, getPopularDestinations, getAverageTripDistance } from "@/lib/db/businessAnalytics";

// Same rounding rule as components/BookingFlow.js computeDuration(), the
// one real source of truth for "how many rental days does this span".
// Duplicated here (not imported, BookingFlow.js is a client component) but
// kept byte-for-byte identical on purpose, see that file if this ever needs
// to change.
function billableDaysBetween(pickupDate, returnDate) {
  const diffMs = new Date(returnDate).getTime() - new Date(pickupDate).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 1;
  return Math.max(1, Math.ceil(diffMs / 86400000));
}

function compactVehicle(v) {
  return {
    id: v.id,
    dbId: v.dbId,
    name: v.name,
    category: v.category,
    seats: v.seats,
    transmission: v.transmission,
    fuel: v.fuel,
    dailyRateRWFMin: v.dailyRateRWFMin,
    dailyRateRWFMax: v.dailyRateRWFMax,
    status: v.status,
  };
}

export const TOOLS = [
  {
    name: "getFleet",
    description: "List Zebra's currently available vehicles with seats, transmission, fuel type, and real daily rate range.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const vehicles = await getVehicles();
      return { vehicles: vehicles.map(compactVehicle) };
    },
  },
  {
    name: "getVehicle",
    description: "Get one vehicle's real details by its slug (e.g. 'kia-sorento') or database id.",
    parameters: {
      type: "object",
      properties: { idOrSlug: { type: "string" } },
      required: ["idOrSlug"],
    },
    handler: async ({ idOrSlug }) => {
      const vehicle = (await getVehicleBySlug(idOrSlug)) || (await getVehicleByDbId(idOrSlug));
      if (!vehicle) return { found: false };
      return { found: true, vehicle: compactVehicle(vehicle) };
    },
  },
  {
    name: "checkAvailability",
    description: "Check whether a specific vehicle is actually free for a real date range, against Zebra's real bookings and blocked dates.",
    parameters: {
      type: "object",
      properties: {
        vehicleId: { type: "string", description: "The vehicle's database id (dbId), not its slug." },
        pickupDate: { type: "string", description: "YYYY-MM-DD" },
        returnDate: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["vehicleId", "pickupDate", "returnDate"],
    },
    handler: async ({ vehicleId, pickupDate, returnDate }) => checkAvailability(vehicleId, pickupDate, returnDate),
  },
  {
    name: "calculateRentalPrice",
    description: "Calculate a real estimated rental total from the vehicle's configured daily rate and the exact dates, optionally adding priced extras by key. Never estimate this yourself, always call this tool.",
    parameters: {
      type: "object",
      properties: {
        vehicleId: { type: "string", description: "The vehicle's database id (dbId)." },
        pickupDate: { type: "string", description: "YYYY-MM-DD" },
        returnDate: { type: "string", description: "YYYY-MM-DD" },
        extraKeys: { type: "array", items: { type: "string" }, description: "Keys of rental extras to add, e.g. ['airport_delivery']." },
      },
      required: ["vehicleId", "pickupDate", "returnDate"],
    },
    handler: async ({ vehicleId, pickupDate, returnDate, extraKeys = [] }) => {
      const vehicle = await getVehicleByDbId(vehicleId);
      if (!vehicle) return { error: "Vehicle not found." };
      const days = billableDaysBetween(pickupDate, returnDate);
      const rental = estimateRental(vehicle, days);
      const extraLines = [];
      let extrasTotalMidRWF = 0;
      for (const key of extraKeys) {
        const extra = await getExtraByKey(key);
        if (!extra || !extra.active) continue;
        if (extra.pricingType === "CUSTOM_QUOTE" || extra.priceRWF == null) {
          extraLines.push({ key, name: extra.name, note: "Priced on request, contact Zebra to confirm." });
          continue;
        }
        const amount = extra.pricingType === "PER_DAY" ? extra.priceRWF * days : extra.priceRWF;
        extrasTotalMidRWF += amount;
        extraLines.push({ key, name: extra.name, amountRWF: amount });
      }
      return {
        days,
        vehicleRental: rental,
        extras: extraLines,
        estimatedTotalMidRWF: rental.midRWF + extrasTotalMidRWF,
        note: "Estimated total, not a confirmed quotation, and does not include an unconfirmed deposit.",
      };
    },
  },
  {
    name: "getBooking",
    description: "Look up the signed-in customer's own booking by its booking number. Cannot look up another customer's booking.",
    parameters: {
      type: "object",
      properties: { bookingNumber: { type: "string" } },
      required: ["bookingNumber"],
    },
    handler: async ({ bookingNumber }, context) => {
      if (!context?.customerId) {
        return { error: "Sign in to look up a booking." };
      }
      const bookings = await getBookings();
      const match = bookings.find(
        (b) => b.bookingNumber === bookingNumber && b.customerId === context.customerId
      );
      if (!match) return { found: false };
      return { found: true, booking: match };
    },
  },
  {
    name: "getDestination",
    description: "Get a Zebra-catalogued Rwanda destination's real region and category by name or slug.",
    parameters: {
      type: "object",
      properties: { nameOrSlug: { type: "string" } },
      required: ["nameOrSlug"],
    },
    handler: async ({ nameOrSlug }) => {
      const bySlug = await getDestinationBySlug(nameOrSlug.toLowerCase().replace(/\s+/g, "-"));
      if (bySlug) return { found: true, destination: bySlug };
      const all = await getDestinations({ publishedOnly: true, query: nameOrSlug });
      if (all.length) return { found: true, destination: all[0] };
      return { found: false, note: "Not in Zebra's catalogued destinations, try geocodeLocation for an arbitrary place." };
    },
  },
  {
    name: "geocodeLocation",
    description: "Find real coordinates for ANY place name in Rwanda, not limited to Zebra's catalogued destinations. Returns null if the place cannot be found, never invents coordinates.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    handler: async ({ query }) => {
      const result = await geocodePlace(query);
      return result ? { found: true, ...result } : { found: false };
    },
  },
  {
    name: "calculateRoute",
    description: "Calculate real driving distance and travel time between two or more points using Zebra's routing provider. Never estimate distance or time yourself.",
    parameters: {
      type: "object",
      properties: {
        points: {
          type: "array",
          items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } } },
        },
      },
      required: ["points"],
    },
    handler: async ({ points }) => {
      const result = await getRoute(points);
      return result || { found: false, note: "Routing provider could not calculate this route." };
    },
  },
  {
    name: "createBookingRequest",
    description: "Create a new booking request for the customer, exactly like the public booking form. This does NOT confirm the booking, Zebra staff must still review and confirm it.",
    parameters: {
      type: "object",
      properties: {
        vehicleId: { type: "string", description: "The vehicle's database id (dbId)." },
        pickupDate: { type: "string" },
        returnDate: { type: "string" },
        serviceType: { type: "string", enum: ["self-drive", "chauffeur"] },
        customerName: { type: "string" },
        customerEmail: { type: "string" },
        customerPhone: { type: "string" },
        customerCountry: { type: "string" },
      },
      required: ["vehicleId", "pickupDate", "returnDate", "customerName", "customerEmail"],
    },
    handler: async (args) => {
      // createBooking() itself now looks up the vehicle, checks real
      // availability, and computes the real total from the published rate
      // (see lib/db/bookings.js priceBooking()), so this tool never
      // computes or supplies a price, and a date range that is no longer
      // free throws here rather than silently creating a request for it,
      // surfaced to the model as a normal tool error by runTool()'s
      // try/catch.
      const booking = await createBooking({
        vehicleDbId: args.vehicleId,
        pickupDate: args.pickupDate,
        returnDate: args.returnDate,
        serviceType: args.serviceType || "self-drive",
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
        customerCountry: args.customerCountry,
        source: "ai_assistant",
      });
      return { created: true, booking, note: "Request created, status PENDING until Zebra staff confirm it." };
    },
  },
  {
    name: "requestBookingChange",
    description: "Send a request to change an existing booking (pickup time, dates, etc.) to the Zebra team for confirmation. This does NOT change the booking itself, only staff can do that.",
    parameters: {
      type: "object",
      properties: {
        bookingNumber: { type: "string" },
        requestedChange: { type: "string", description: "Plain description of what the customer wants changed." },
      },
      required: ["bookingNumber", "requestedChange"],
    },
    handler: async ({ bookingNumber, requestedChange }, context) => {
      if (!context?.conversationId) return { error: "No active conversation to attach this request to." };
      await addMessage({
        conversationId: context.conversationId,
        senderType: "SYSTEM",
        content: `Booking change requested for ${bookingNumber}: ${requestedChange}`,
        metadata: { kind: "booking_change_request", bookingNumber, requestedChange },
      });
      await updateConversation(context.conversationId, {
        status: "WAITING_FOR_ZEBRA",
        escalationReason: `Booking change request: ${requestedChange}`,
      });
      return { sent: true, note: "Sent to the Zebra team for review, not yet applied." };
    },
  },
  {
    name: "transferToHuman",
    description: "Escalate the current conversation to a real Zebra staff member. Use this whenever the customer asks for a human, or you cannot reliably answer.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
    handler: async ({ reason }, context) => {
      if (!context?.conversationId) return { error: "No active conversation to escalate." };
      await updateConversation(context.conversationId, { status: "ESCALATED", escalationReason: reason });
      return { escalated: true };
    },
  },
  // -------------------------------------------------------------------
  // AI BUSINESS ANALYST (spec item 21). Real aggregate queries, never a
  // fabricated statistic (see lib/db/businessAnalytics.js). Gated to an
  // admin context, see runTool()'s requiresAdmin check below, a customer
  // support conversation must never be able to pull Zebra's business
  // analytics.
  // -------------------------------------------------------------------
  {
    name: "getVehicleUtilization",
    description: "Admin only. Real booking count and total booked days per vehicle, for questions like 'which vehicle gets rented most'.",
    parameters: { type: "object", properties: {}, required: [] },
    requiresAdmin: true,
    handler: async () => ({ vehicles: await getVehicleUtilization() }),
  },
  {
    name: "getPopularDestinations",
    description: "Admin only. Real destination selection counts from the Trip Planner, for questions like 'which destinations are most requested'.",
    parameters: { type: "object", properties: { limit: { type: "number" } }, required: [] },
    requiresAdmin: true,
    handler: async ({ limit }) => ({ destinations: await getPopularDestinations({ limit: limit || 10 }) }),
  },
  {
    name: "getAverageTripDistance",
    description: "Admin only. Real average routed trip distance across bookings that actually have one on file. Returns sampleSize: 0 honestly if there is not enough real data yet, never a fabricated average.",
    parameters: { type: "object", properties: {}, required: [] },
    requiresAdmin: true,
    handler: async () => getAverageTripDistance(),
  },
];

export function getToolByName(name) {
  return TOOLS.find((t) => t.name === name);
}

// Runs a model-requested tool call against the real handler, with the
// server-trusted context always taking precedence over anything the model
// put in its own arguments (defense in depth, see file header). A tool
// marked requiresAdmin refuses unless the caller's context says so
// (context.isAdmin, set only by a route that has actually verified an
// admin session, never by anything the model itself can set).
export async function runTool(name, modelArgs, context) {
  const tool = getToolByName(name);
  if (!tool) return { error: `Unknown tool "${name}".` };
  if (tool.requiresAdmin && !context?.isAdmin) {
    return { error: "This tool is only available to Zebra staff." };
  }
  try {
    return await tool.handler(modelArgs || {}, context || {});
  } catch (error) {
    return { error: error.message || "Tool call failed." };
  }
}
