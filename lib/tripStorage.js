// Client-only. Lets a trip built in the trip planner survive the
// navigation into the booking flow without asking the customer to
// re-enter anything, this is what "Book this trip" and "Save trip" write
// to and what BookingFlow.js reads on mount. sessionStorage on purpose,
// not localStorage: Zebra has no customer accounts, this is a short-lived
// handoff for the current browser tab, not a saved account feature.
const KEY = "zebra_trip_v1";

export function saveTripToSession(trip) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(trip));
  } catch {
    // sessionStorage can be unavailable (private browsing, storage full),
    // this is a convenience feature and must never block the customer.
  }
}

export function loadTripFromSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTripSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do if this fails, the entry will just sit there until the
    // tab closes.
  }
}
