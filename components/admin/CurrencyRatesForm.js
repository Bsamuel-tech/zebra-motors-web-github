"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Real, admin-entered exchange rates (business_settings.currency_rates),
// the only source ever used to show a customer a converted price estimate
// (see lib/currency.js, components/ConvertedPrice.js). RWF itself is never
// listed here, it is the database's own real unit, there is nothing to
// convert it to. supportedCurrencies is derived from whatever currencies
// have a real rate here plus RWF, rather than kept as a second, separately
// editable list that could drift out of sync with which currencies
// actually convert.
export default function CurrencyRatesForm({ settings }) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    Object.entries(settings.currencyRates || {}).map(([code, rate]) => ({ code, rate: String(rate) }))
  );
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function updateRate(index, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, rate: value } : row)));
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addCurrency() {
    const code = newCode.trim().toUpperCase();
    setError("");
    if (!code) return;
    if (code === "RWF") {
      setError("RWF is the base currency, it doesn't need a rate.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(code)) {
      setError("Enter a real 3-letter currency code, e.g. USD, EUR, GBP.");
      return;
    }
    if (rows.some((r) => r.code === code)) {
      setError(`${code} is already in the list.`);
      return;
    }
    setRows((prev) => [...prev, { code, rate: "" }]);
    setNewCode("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const currencyRates = {};
    for (const row of rows) {
      const rate = Number(row.rate);
      if (!row.rate.trim() || !Number.isFinite(rate) || rate <= 0) {
        setError(`Enter a real positive rate for ${row.code} (how many RWF equal 1 ${row.code}), or remove it.`);
        return;
      }
      currencyRates[row.code] = rate;
    }
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currencyRates,
        supportedCurrencies: ["RWF", ...Object.keys(currencyRates)],
      }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 480 }}>
      <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
        Enter how many RWF equal 1 unit of each currency (e.g. 1 USD = 1300 means enter 1300).
        Every real price a customer is actually charged stays in RWF, this only powers the "~"
        estimate shown next to it and the currency switcher in the header.
      </p>
      {rows.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          No currencies configured yet, only RWF is shown on the public site.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {rows.map((row, i) => (
          <div key={row.code} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 52, fontWeight: 600, fontSize: 13.5 }}>{row.code}</span>
            <span className="muted" style={{ fontSize: 12.5 }}>1 {row.code} =</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={row.rate}
              onChange={(e) => updateRate(i, e.target.value)}
              placeholder="1300"
              style={{ width: 110 }}
            />
            <span className="muted" style={{ fontSize: 12.5 }}>RWF</span>
            <button
              type="button"
              onClick={() => removeRow(i)}
              style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 12.5 }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="EUR"
          style={{ width: 110 }}
          maxLength={3}
        />
        <button type="button" className="btn-outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={addCurrency}>
          Add currency
        </button>
      </div>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 14, fontSize: 12.5 }}>
          {error}
        </div>
      )}
      {saved && !error && (
        <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 14 }}>
          Saved. The currency switcher and converted price estimates now reflect these rates.
        </div>
      )}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving..." : "Save exchange rates"}
      </button>
    </form>
  );
}
