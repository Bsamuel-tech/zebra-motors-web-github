"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Photo from "./Photo";
import { getVehicleById, vehicles, midRateRWF, formatRWF } from "@/data/vehicles";

const STEPS = ["Vehicle & dates", "Your details", "Documents", "Payment", "Confirmation"];

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
                background: state === "todo" ? "var(--paper-alt)" : state === "active" ? "var(--ink)" : "var(--forest-dark)",
                color: state === "todo" ? "var(--muted)" : "#fff",
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

export default function BookingFlow() {
  const params = useSearchParams();
  const initialVehicle = getVehicleById(params.get("vehicle")) || vehicles[0];

  const [step, setStep] = useState(0);
  const [vehicle] = useState(initialVehicle);
  const [driveMode, setDriveMode] = useState("self");
  const [extras, setExtras] = useState({ childSeat: false, extraDriver: false, gps: true });
  const [details, setDetails] = useState({ name: "", email: "", phone: "", country: "" });
  const [payMode, setPayMode] = useState("deposit");
  const [method, setMethod] = useState("card");
  const [bookingNumber] = useState("ZM-2026-08341");

  // Demo pricing math. Vehicle rate uses the confirmed real published price
  // range's midpoint; extras, delivery fee, and the deposit split are all
  // illustrative placeholders, NOT YET CONFIRMED with Zebra management (see
  // the Phase 3 report, decisions needed). Nothing here is charged, this
  // flow does not connect to a real payment provider yet.
  const nights = 8;
  const CHILD_SEAT_RWF_PER_DAY = 5000;
  const EXTRA_DRIVER_RWF_PER_DAY = 4000;
  const GPS_RWF_PER_DAY = 3000;
  const DELIVERY_FEE_RWF = 15000;
  const DEPOSIT_SHARE = 0.3; // illustrative, exact deposit policy not yet confirmed

  const vehicleTotal = midRateRWF(vehicle) * nights;
  const extrasTotal =
    (extras.childSeat ? CHILD_SEAT_RWF_PER_DAY : 0) * nights +
    (extras.extraDriver ? EXTRA_DRIVER_RWF_PER_DAY : 0) * nights +
    (extras.gps ? GPS_RWF_PER_DAY : 0) * nights;
  const deliveryFee = DELIVERY_FEE_RWF;
  const total = vehicleTotal + extrasTotal + deliveryFee;
  const deposit = Math.round(total * DEPOSIT_SHARE);

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div>
      <StepIndicator current={step} />

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70 }}>
        {step < 4 ? (
          <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 560px", minWidth: 300, maxWidth: 640 }}>
              {step === 0 && <StepVehicle vehicle={vehicle} driveMode={driveMode} setDriveMode={setDriveMode} />}
              {step === 1 && <StepDetails details={details} setDetails={setDetails} extras={extras} setExtras={setExtras} driveMode={driveMode} setDriveMode={setDriveMode} />}
              {step === 2 && <StepDocuments />}
              {step === 3 && <StepPayment payMode={payMode} setPayMode={setPayMode} method={method} setMethod={setMethod} deposit={deposit} total={total} />}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
                {step > 0 ? (
                  <button onClick={back} style={{ background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", padding: 0 }}>
                    ← Back
                  </button>
                ) : (
                  <span />
                )}
                <button onClick={next} className="btn-primary" style={{ width: 220 }}>
                  {step === 3 ? `Pay RWF ${formatRWF(payMode === "deposit" ? deposit : total)}` : "Continue"}
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
                <Row label={`${nights} nights (midpoint of published rate)`} value={`RWF ${formatRWF(vehicleTotal)}`} />
                <Row label="Airport delivery (estimated)" value={`RWF ${formatRWF(deliveryFee)}`} />
                {extras.gps && <Row label={`GPS / route pack, estimated (${nights} days)`} value={`RWF ${formatRWF(GPS_RWF_PER_DAY * nights)}`} />}
                {extras.childSeat && <Row label="Child seat (estimated)" value={`RWF ${formatRWF(CHILD_SEAT_RWF_PER_DAY * nights)}`} />}
                {extras.extraDriver && <Row label="Additional driver (estimated)" value={`RWF ${formatRWF(EXTRA_DRIVER_RWF_PER_DAY * nights)}`} />}
                <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 16 }}>
                  <span>Total</span>
                  <span>RWF {formatRWF(total)}</span>
                </div>
                <div className="confirm-note" style={{ display: "block", fontSize: 12, marginTop: 10 }}>
                  Extras pricing, delivery fee, deposit share, and cancellation terms shown are
                  illustrative estimates. Zebra Motors will confirm final terms when you complete
                  your booking.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Confirmation vehicle={vehicle} bookingNumber={bookingNumber} deposit={deposit} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 6 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StepVehicle({ vehicle, driveMode, setDriveMode }) {
  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Confirm your vehicle &amp; dates</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Pulled from the vehicle page. Change anything below before continuing.
      </p>
      <div className="grid-2" style={{ marginBottom: 22 }}>
        <div className="field">
          <label>Pickup date &amp; time</label>
          <input type="text" defaultValue="14 Sep 2026, 14:30" readOnly />
        </div>
        <div className="field">
          <label>Return date &amp; time</label>
          <input type="text" defaultValue="22 Sep 2026, 10:00" readOnly />
        </div>
        <div className="field">
          <label>Pickup location</label>
          <input type="text" defaultValue="Kigali International Airport" readOnly />
        </div>
        <div className="field">
          <label>Vehicle</label>
          <input type="text" defaultValue={vehicle.name} readOnly />
        </div>
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Self-drive or with a driver?</label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className={`chip ${driveMode === "self" ? "on" : ""}`} onClick={() => setDriveMode("self")} style={{ border: driveMode === "self" ? "1px solid var(--ink)" : undefined }}>
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

function StepDetails({ details, setDetails, extras, setExtras, driveMode, setDriveMode }) {
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ExtraRow label="Child seat" sub="Suitable for ages 1 to 4" price="+RWF 5,000/day" checked={extras.childSeat} onChange={() => setExtras({ ...extras, childSeat: !extras.childSeat })} />
        <ExtraRow label="Additional driver" price="+RWF 4,000/day" checked={extras.extraDriver} onChange={() => setExtras({ ...extras, extraDriver: !extras.extraDriver })} />
        <ExtraRow label="GPS / offline route pack" price="+RWF 3,000/day" checked={extras.gps} onChange={() => setExtras({ ...extras, gps: !extras.gps })} />
      </div>
    </div>
  );
}

function ExtraRow({ label, sub, price, checked, onChange }) {
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
          <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
          {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ fontSize: 14 }}>{price}</div>
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

function StepPayment({ payMode, setPayMode, method, setMethod, deposit, total }) {
  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Payment</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Processed securely by [payment provider, to be confirmed]. Zebra never sees or stores your
        card details.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => setPayMode("deposit")}
          className="card"
          style={{ flex: 1, textAlign: "center", padding: 14, background: payMode === "deposit" ? "var(--ink)" : "#fff", color: payMode === "deposit" ? "#fff" : "var(--ink)", cursor: "pointer" }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>Pay deposit now</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>RWF {formatRWF(deposit)} today, balance on pickup</div>
        </button>
        <button
          onClick={() => setPayMode("full")}
          className="card"
          style={{ flex: 1, textAlign: "center", padding: 14, background: payMode === "full" ? "var(--ink)" : "#fff", color: payMode === "full" ? "#fff" : "var(--ink)", cursor: "pointer" }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>Pay in full</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>RWF {formatRWF(total)} today</div>
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 18 }}>
        Deposit share shown is illustrative. Zebra&apos;s real deposit policy is not yet
        confirmed.
      </p>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10, textTransform: "uppercase" }}>
        Payment method
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

function Confirmation({ vehicle, bookingNumber, deposit }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E3EEE8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1F4433" strokeWidth="2.2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Demo booking summary</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 4 }}>
        Reference <strong>{bookingNumber}</strong> (demo only)
      </p>
      <p className="confirm-note" style={{ display: "inline-block", fontSize: 12.5, marginBottom: 30, textAlign: "left" }}>
        [This is a demo experience. Nothing has been booked, saved, or charged. No confirmation
        is sent, since this platform is not yet connected to a real booking system or payment
        provider. Contact Zebra Motors directly to make a real reservation.]
      </p>
      <div className="card" style={{ padding: 24, textAlign: "left", marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{vehicle.name}</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          14 Sep 2026, 14:30 to 22 Sep 2026, 10:00. Kigali Airport
        </div>
        <div style={{ fontSize: 13.5 }}>Illustrative deposit: RWF {formatRWF(deposit)}</div>
      </div>
      <Link href="/account" className="btn-primary">
        View demo account
      </Link>
    </div>
  );
}
