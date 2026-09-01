"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Photo from "./Photo";
import { formatRWF, midRateRWF, priceRangeLabel } from "@/data/vehicles";
import { loadTripFromSession, clearTripSession } from "@/lib/tripStorage";

const STEPS = ["Vehicle & dates", "Your details", "Documents", "Payment", "Confirmation"];

// The only two locations Zebra has confirmed publicly (see data/settings.js
// and the FAQ). This is a plain convenience list for the location fields
// below, not real address autocomplete, that needs a geocoding provider
// (Phase 2, not yet connected, see the confirm-note under the fields).
const KNOWN_LOCATIONS = ["Kigali International Airport", "Kigali, Rwanda"];

function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 30, padding: "24px 16px", background: "#fff", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                background: state === "todo" ? "var(--paper-alt)" : state === "active" ? "var(--zebra-yellow)" : "var(--forest-dark)",
                color: state === "todo" ? "var(--muted)" : state === "active" ? "var(--on-yellow)" : "#fff",
              }}
            >
              {state === "done" ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: state === "active" ? 600 : 400, color: state === "todo" ? "var(--muted)" : "var(--ink-soft)" }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Local helper: format a Date as the "YYYY-MM-DDTHH:mm" string an
// <input type="datetime-local"> expects, using the browser's local time
// (not UTC, toISOString() would shift the displayed time).
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultPickup() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(d);
}
function defaultReturn() {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  d.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

// Real duration from the two datetimes the customer actually chose, never a
// silent assumption. billableDays uses a disclosed rounding rule (any part
// of a day counts as a full rental day), that rule itself is Zebra's own
// business policy and is NOT YET CONFIRMED, so the UI states it plainly
// rather than hiding it inside a number.
function computeDuration(pickupAt, returnAt) {
  if (!pickupAt || !returnAt) return null;
  const start = new Date(pickupAt);
  const end = new Date(returnAt);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.round((diffMs % 3600000) / 60000);
  const billableDays = Math.max(1, Math.ceil(diffMs / 86400000));
  return { days, hours, minutes, billableDays };
}

function durationLabel(duration) {
  if (!duration) return "";
  const parts = [];
  if (duration.days) parts.push(`${duration.days} day${duration.days === 1 ? "" : "s"}`);
  if (duration.hours) parts.push(`${duration.hours} hour${duration.hours === 1 ? "" : "s"}`);
  if (duration.minutes) parts.push(`${duration.minutes} minute${duration.minutes === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "less than a minute";
}

export default function BookingFlow({ vehicles = [], extras = [] }) {
  const params = useSearchParams();

  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState(() => {
    const requested = params.get("vehicle");
    if (requested && vehicles.some((v) => v.id === requested)) return requested;
    return vehicles[0]?.id || "";
  });
  const [driveMode, setDriveMode] = useState("self");
  const [pickupAt, setPickupAt] = useState(defaultPickup);
  const [returnAt, setReturnAt] = useState(defaultReturn);
  const [pickupLocation, setPickupLocation] = useState("Kigali International Airport");
  const [sameDropoff, setSameDropoff] = useState(true);
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [selectedExtraIds, setSelectedExtraIds] = useState({});
  const [details, setDetails] = useState({ name: "", email: "", phone: "", country: "" });
  const [paymentPreference, setPaymentPreference] = useState("deposit");
  const [method, setMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [requestRef, setRequestRef] = useState("");
  const [tripSummary, setTripSummary] = useState(null);

  const vehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0] || null;
  const duration = useMemo(() => computeDuration(pickupAt, returnAt), [pickupAt, returnAt]);

  // "Book this trip" in the trip planner saves the route to sessionStorage
  // then sends the customer here with ?fromTrip=1, this transfers it into
  // the booking flow without asking them to re-enter anything (per the
  // trip planner spec). Read once on mount, after mount rather than in a
  // useState initializer, so the server-rendered and client-hydrated
  // markup match and this never silently overwrites a vehicle/date the
  // customer picks afterward.
  useEffect(() => {
    if (params.get("fromTrip") !== "1") return;
    const trip = loadTripFromSession();
    if (!trip) return;
    if (trip.vehicleId && vehicles.some((v) => v.id === trip.vehicleId)) {
      setVehicleId(trip.vehicleId);
    }
    if (trip.pickupAt) setPickupAt(trip.pickupAt);
    if (trip.returnAt) setReturnAt(trip.returnAt);
    if (trip.summary) setTripSummary(trip.summary);
    clearTripSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleExtra(id) {
    setSelectedExtraIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Live recalculation from real, confirmed inputs only. A vehicle rate is
  // only shown once real dates give a real duration, an extra only counts
  // toward the total when it has a real confirmed price, CUSTOM_QUOTE and
  // PER_KM extras are listed but never summed since Zebra has to price
  // those directly (see lib/db/extras.js).
  const pricing = useMemo(() => {
    if (!vehicle) return null;
    const vehicleTotal = duration ? midRateRWF(vehicle) * duration.billableDays : null;
    const lineItems = [];
    let extrasTotal = 0;
    let hasQuoteItems = false;
    for (const extra of extras) {
      if (!selectedExtraIds[extra.id]) continue;
      if (extra.pricingType === "CUSTOM_QUOTE") {
        lineItems.push({ label: extra.name, value: "Price on request", tag: "Priced by Zebra" });
        hasQuoteItems = true;
      } else if (extra.pricingType === "PER_KM") {
        lineItems.push({ label: extra.name, value: "Priced per km", tag: "Priced by Zebra" });
        hasQuoteItems = true;
      } else if (extra.pricingType === "PER_DAY" && duration) {
        const amount = extra.priceRWF * duration.billableDays;
        extrasTotal += amount;
        lineItems.push({ label: `${extra.name} (${duration.billableDays} rental day${duration.billableDays === 1 ? "" : "s"})`, value: `RWF ${formatRWF(amount)}`, tag: "Optional extra" });
      } else if (extra.pricingType === "PER_BOOKING") {
        extrasTotal += extra.priceRWF;
        lineItems.push({ label: extra.name, value: `RWF ${formatRWF(extra.priceRWF)}`, tag: "Optional extra" });
      } else if (extra.pricingType === "PER_DAY" && !duration) {
        lineItems.push({ label: extra.name, value: "Set valid dates to price", tag: "Optional extra" });
      }
    }
    const total = vehicleTotal !== null ? vehicleTotal + extrasTotal : null;
    return { vehicleTotal, lineItems, extrasTotal, total, hasQuoteItems };
  }, [vehicle, duration, extras, selectedExtraIds]);

  const canSubmit =
    vehicle && duration && pickupLocation.trim() && (sameDropoff || dropoffLocation.trim()) && details.name.trim() && details.email.trim();

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function sendBookingRequest() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    const selectedExtraNames = extras.filter((e) => selectedExtraIds[e.id]).map((e) => e.name);
    const messageLines = [
      tripSummary ? `${tripSummary}` : null,
      `Vehicle: ${vehicle.name}`,
      `Pickup: ${new Date(pickupAt).toLocaleString()} at ${pickupLocation}`,
      `Return: ${new Date(returnAt).toLocaleString()} at ${sameDropoff ? pickupLocation : dropoffLocation}`,
      `Rental duration: ${durationLabel(duration)} (${duration.billableDays} billable rental day${duration.billableDays === 1 ? "" : "s"})`,
      `Self-drive or driver: ${driveMode === "self" ? "Self-drive" : "With a professional driver"}`,
      selectedExtraNames.length ? `Requested extras: ${selectedExtraNames.join(", ")}` : "Requested extras: none",
      pricing?.total !== null && pricing?.total !== undefined ? `Estimated total (before extras priced by Zebra): RWF ${formatRWF(pricing.total)}` : null,
      `Payment preference: ${paymentPreference === "deposit" ? "Deposit to reserve, balance on pickup" : "Pay in full"} via ${method}`,
      details.country ? `Country of residence: ${details.country}` : null,
    ].filter(Boolean);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: details.name,
          email: details.email,
          phone: details.phone,
          message: messageLines.join("\n"),
          source: "booking_request",
          vehicleId: vehicle.dbId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body.error || "Could not send your booking request, please try again.");
        setSubmitting(false);
        return;
      }
      const body = await res.json();
      setRequestRef(`ZM-${body.lead.id.slice(0, 8).toUpperCase()}`);
      setSubmitting(false);
      next();
    } catch {
      setSubmitError("Could not send your booking request, check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!vehicle) {
    return (
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 70, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>No vehicles are available to book right now</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          Contact Zebra Motors directly and the team can confirm what is available.
        </p>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator current={step} />

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70 }}>
        {step < 4 ? (
          <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 560px", minWidth: 300, maxWidth: 640 }}>
              {step === 0 && (
                <StepVehicle
                  vehicles={vehicles}
                  vehicle={vehicle}
                  vehicleId={vehicleId}
                  setVehicleId={setVehicleId}
                  driveMode={driveMode}
                  setDriveMode={setDriveMode}
                  pickupAt={pickupAt}
                  setPickupAt={setPickupAt}
                  returnAt={returnAt}
                  setReturnAt={setReturnAt}
                  pickupLocation={pickupLocation}
                  setPickupLocation={setPickupLocation}
                  sameDropoff={sameDropoff}
                  setSameDropoff={setSameDropoff}
                  dropoffLocation={dropoffLocation}
                  setDropoffLocation={setDropoffLocation}
                  duration={duration}
                  tripSummary={tripSummary}
                />
              )}
              {step === 1 && (
                <StepDetails
                  details={details}
                  setDetails={setDetails}
                  extras={extras}
                  selectedExtraIds={selectedExtraIds}
                  toggleExtra={toggleExtra}
                  driveMode={driveMode}
                  setDriveMode={setDriveMode}
                />
              )}
              {step === 2 && <StepDocuments />}
              {step === 3 && (
                <StepPayment
                  paymentPreference={paymentPreference}
                  setPaymentPreference={setPaymentPreference}
                  method={method}
                  setMethod={setMethod}
                  pricing={pricing}
                  duration={duration}
                />
              )}

              {submitError && (
                <div className="confirm-note" style={{ display: "block", marginTop: 18 }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
                {step > 0 ? (
                  <button onClick={back} style={{ background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", padding: 0 }}>
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={step === 3 ? sendBookingRequest : next}
                  className="btn-primary"
                  style={{ width: 240 }}
                  disabled={step === 3 ? submitting || !canSubmit : false}
                  title={step === 3 && !canSubmit ? "Fill in your dates, locations, name, and email first" : undefined}
                >
                  {step === 3 ? (submitting ? "Sending..." : "Send booking request to Zebra") : "Continue"}
                </button>
              </div>
            </div>

            <div style={{ width: 360, flexShrink: 0 }}>
              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
                  <Photo height={70} style={{ width: 96, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{vehicle.name}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {vehicle.category} · {vehicle.transmission} · {driveMode === "self" ? "Self-drive" : "With driver"}
                    </div>
                  </div>
                </div>

                {duration ? (
                  <>
                    <Row
                      label={`${duration.billableDays} rental day${duration.billableDays === 1 ? "" : "s"} (${priceRangeLabel(vehicle)})`}
                      value={`RWF ${formatRWF(pricing.vehicleTotal)}`}
                      tag="Published rate"
                    />
                    <div className="muted" style={{ fontSize: 11.5, marginBottom: 10, marginTop: -2 }}>
                      Exact duration: {durationLabel(duration)}. Billing rounds any part of a day up to a
                      full rental day, this rounding rule is not yet confirmed by Zebra Motors
                      management.
                    </div>
                  </>
                ) : (
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                    Choose a valid pickup and return time to see an estimated cost.
                  </div>
                )}

                {pricing.lineItems.map((item, i) => (
                  <Row key={i} label={item.label} value={item.value} tag={item.tag} />
                ))}

                <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 16 }}>
                  <span>Estimated total</span>
                  <span>{pricing.total !== null ? `RWF ${formatRWF(pricing.total)}` : "Add dates"}</span>
                </div>
                <div className="confirm-note" style={{ display: "block", fontSize: 12, marginTop: 10 }}>
                  {pricing.hasQuoteItems
                    ? "This estimate covers the vehicle and any priced extras only. Items marked \"Priced by Zebra\" are not included and will be quoted directly."
                    : "This is an estimate based on the published rate. Zebra Motors will confirm final terms when they follow up on your request."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Confirmation
            vehicle={vehicle}
            requestRef={requestRef}
            pickupAt={pickupAt}
            returnAt={returnAt}
            pickupLocation={pickupLocation}
            dropoffLocation={sameDropoff ? pickupLocation : dropoffLocation}
            duration={duration}
            total={pricing.total}
          />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tag }) {
  const TAG_CLASS = { "Published rate": "badge-forest", "Optional extra": "badge-sand", "Priced by Zebra": "badge-muted" };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 8 }}>
      <span style={{ flex: 1 }}>
        {label}
        {tag && (
          <span className={`badge ${TAG_CLASS[tag] || "badge-muted"}`} style={{ marginLeft: 8, fontSize: 9.5, verticalAlign: "middle" }}>
            {tag}
          </span>
        )}
      </span>
      <span style={{ whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function StepVehicle({
  vehicles,
  vehicle,
  vehicleId,
  setVehicleId,
  driveMode,
  setDriveMode,
  pickupAt,
  setPickupAt,
  returnAt,
  setReturnAt,
  pickupLocation,
  setPickupLocation,
  sameDropoff,
  setSameDropoff,
  dropoffLocation,
  setDropoffLocation,
  duration,
  tripSummary,
}) {
  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Choose your vehicle &amp; dates</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Every field below is yours to change, nothing is fixed until Zebra confirms your request.
      </p>

      {tripSummary && (
        <div className="card" style={{ padding: 14, marginBottom: 20, fontSize: 12.5, whiteSpace: "pre-line" }}>
          <strong style={{ fontSize: 12 }}>Carried over from your trip plan</strong>
          <div className="muted" style={{ marginTop: 4 }}>{tripSummary}</div>
        </div>
      )}
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="field">
          <label>Pickup date &amp; time</label>
          <input type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} />
        </div>
        <div className="field">
          <label>Return date &amp; time</label>
          <input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
        </div>
        <div className="field">
          <label>Pickup location</label>
          <input type="text" list="zebra-known-locations" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="Kigali International Airport" />
        </div>
        <div className="field">
          <label>Vehicle</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={{ border: "1px solid var(--line)", padding: "12px 13px", fontSize: 14, fontFamily: "inherit", width: "100%", background: "#fff" }}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({priceRangeLabel(v)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <datalist id="zebra-known-locations">
        {KNOWN_LOCATIONS.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", marginBottom: sameDropoff ? 4 : 14, cursor: "pointer" }}>
        <input type="checkbox" checked={sameDropoff} onChange={(e) => setSameDropoff(e.target.checked)} />
        Return to the same location
      </label>

      {!sameDropoff && (
        <div className="field" style={{ marginBottom: 14, maxWidth: 320 }}>
          <label>Return location</label>
          <input type="text" list="zebra-known-locations" value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} placeholder="Kigali, Rwanda" />
        </div>
      )}

      <p className="muted" style={{ fontSize: 11.5, marginBottom: 20 }}>
        Type any location. Map based search and distance calculation are not connected yet, a
        future update will add real address autocomplete once a mapping provider is confirmed.
      </p>

      {!duration && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 20, fontSize: 12.5 }}>
          Return time must be after pickup time to calculate your rental duration.
        </div>
      )}

      <div className="field" style={{ marginBottom: 10 }}>
        <label>Self-drive or with a driver?</label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className={`chip ${driveMode === "self" ? "on" : ""}`} onClick={() => setDriveMode("self")}>
          Self-drive
        </button>
        <button className={`chip ${driveMode === "driver" ? "on" : ""}`} onClick={() => setDriveMode("driver")}>
          With a professional driver
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 18 }}>
        Not sure this is the right vehicle?{" "}
        <Link href="/what-if" style={{ fontWeight: 600 }}>
          Try Zebra AI What If
        </Link>{" "}
        before continuing.
      </p>
    </div>
  );
}

function StepDetails({ details, setDetails, extras, selectedExtraIds, toggleExtra, driveMode, setDriveMode }) {
  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Your details</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Only what&apos;s needed to confirm and prepare your rental.
      </p>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="field">
          <label>Full name</label>
          <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} placeholder="Aline Uwase" />
        </div>
        <div className="field">
          <label>Country of residence</label>
          <input value={details.country} onChange={(e) => setDetails({ ...details, country: e.target.value })} placeholder="Belgium" />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Phone (WhatsApp)</label>
          <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="+32 4XX XX XX XX" />
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
          Trip type: <strong>{driveMode === "self" ? "Self-drive" : "With a professional driver"}</strong>{" "}
          <button onClick={() => setDriveMode(driveMode === "self" ? "driver" : "self")} style={{ background: "none", border: "none", color: "var(--forest-dark)", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13.5 }}>
            change
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".04em" }}>
        Extras
      </div>
      {extras.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          No optional extras are configured yet. Ask Zebra Motors directly about anything you need
          and they can confirm pricing with you.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {extras.map((extra) => (
            <ExtraRow
              key={extra.id}
              extra={extra}
              checked={!!selectedExtraIds[extra.id]}
              onChange={() => toggleExtra(extra.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExtraRow({ extra, checked, onChange }) {
  let priceLabel;
  if (extra.pricingType === "CUSTOM_QUOTE") priceLabel = "Price on request";
  else if (extra.pricingType === "PER_KM") priceLabel = `RWF ${formatRWF(extra.priceRWF || 0)}/km`;
  else if (extra.pricingType === "PER_DAY") priceLabel = `RWF ${formatRWF(extra.priceRWF)}/day`;
  else priceLabel = `RWF ${formatRWF(extra.priceRWF)}`;

  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "13px 16px",
        border: `1px solid ${checked ? "var(--forest-dark)" : "var(--line)"}`,
        background: checked ? "#E3EEE8" : "#fff",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{extra.name}</div>
          {extra.description && <div className="muted" style={{ fontSize: 12 }}>{extra.description}</div>}
        </div>
      </div>
      <div style={{ fontSize: 14, textAlign: "right", whiteSpace: "nowrap" }}>{priceLabel}</div>
    </label>
  );
}

function StepDocuments() {
  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Documents</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Uploaded documents are stored securely and only used to verify your rental. See our
        privacy policy.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <UploadRow label="Passport" />
        <UploadRow label="Driving licence" />
        <UploadRow label="International Driving Permit (if applicable)" optional />
      </div>
      <div className="confirm-note" style={{ display: "block", marginTop: 20 }}>
        Whether an International Driving Permit is required varies by nationality. Confirm with
        Zebra Motors or current Rwandan traffic regulations before you travel.
      </div>
    </div>
  );
}

function UploadRow({ label, optional }) {
  return (
    <div className="card" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {optional && <div className="muted" style={{ fontSize: 12 }}>Optional</div>}
      </div>
      <button className="btn-outline" style={{ padding: "8px 16px", fontSize: 13 }}>
        Upload
      </button>
    </div>
  );
}

function StepPayment({ paymentPreference, setPaymentPreference, method, setMethod, pricing, duration }) {
  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Payment preference</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        This platform is not yet connected to a payment provider, so nothing is charged here.
        Choosing a preference below tells Zebra how you would like to arrange payment when they
        follow up to confirm your booking.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button
          onClick={() => setPaymentPreference("deposit")}
          className="card"
          style={{ flex: 1, textAlign: "center", padding: 14, background: paymentPreference === "deposit" ? "var(--ink)" : "#fff", color: paymentPreference === "deposit" ? "#fff" : "var(--ink)", cursor: "pointer" }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>Deposit to reserve</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Balance arranged with Zebra on pickup</div>
        </button>
        <button
          onClick={() => setPaymentPreference("full")}
          className="card"
          style={{ flex: 1, textAlign: "center", padding: 14, background: paymentPreference === "full" ? "var(--ink)" : "#fff", color: paymentPreference === "full" ? "#fff" : "var(--ink)", cursor: "pointer" }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>Pay in full</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{duration && pricing.total !== null ? `Estimated RWF ${formatRWF(pricing.total)}` : "Amount confirmed by Zebra"}</div>
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 18 }}>
        Zebra Motors&apos; exact deposit amount and accepted payment methods are not yet confirmed
        on this platform, they will confirm both directly when they respond to your request.
      </p>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10, textTransform: "uppercase" }}>
        Preferred payment method
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["card", "Card", "Visa, Mastercard, American Express"],
          ["momo", "Mobile Money", "MTN MoMo, Airtel Money"],
          ["bank", "Bank transfer", "For corporate and long-term bookings"],
        ].map(([key, label, sub]) => (
          <label
            key={key}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, border: `1px solid ${method === key ? "var(--forest-dark)" : "var(--line)"}`, background: method === key ? "#E3EEE8" : "#fff", cursor: "pointer" }}
          >
            <input type="radio" name="method" checked={method === key} onChange={() => setMethod(key)} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
              <div className="muted" style={{ fontSize: 12 }}>{sub}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function Confirmation({ vehicle, requestRef, pickupAt, returnAt, pickupLocation, dropoffLocation, duration, total }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E3EEE8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1F4433" strokeWidth="2.2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Your booking request has been sent</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 4 }}>
        Reference <strong>{requestRef}</strong>
      </p>
      <p className="confirm-note" style={{ display: "inline-block", fontSize: 12.5, marginBottom: 30, textAlign: "left" }}>
        This is a real request, saved to Zebra Motors&apos; system for their team to review. It is
        not yet a confirmed booking, no payment has been taken, and no vehicle has been reserved.
        Zebra Motors will contact you using the details you provided to confirm availability and
        finalize your reservation.
      </p>
      <div className="card" style={{ padding: 24, textAlign: "left", marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{vehicle.name}</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
          {new Date(pickupAt).toLocaleString()} to {new Date(returnAt).toLocaleString()}
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          {pickupLocation}
          {dropoffLocation !== pickupLocation ? ` to ${dropoffLocation}` : ""}
        </div>
        {duration && (
          <div style={{ fontSize: 13.5, marginBottom: 4 }}>
            Rental duration: {duration.billableDays} rental day{duration.billableDays === 1 ? "" : "s"}
          </div>
        )}
        {total !== null && total !== undefined && (
          <div style={{ fontSize: 13.5 }}>Estimated total: RWF {formatRWF(total)}</div>
        )}
      </div>
      <Link href="/" className="btn-primary">
        Back to home
      </Link>
    </div>
  );
}
