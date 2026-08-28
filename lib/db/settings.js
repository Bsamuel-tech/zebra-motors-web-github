// Server-only. Business settings, the single source of truth described in
// Rule 6 of the specification. Every reader gets the same shape as the old
// /data/settings.js static object, so pages that already destructure
// { companyName, phone, ... } do not need to change when they switch from
// the static import to getSettings().
import { getDb, nowIso } from "./client";

const ROW_ID = "singleton";

function rowToSettings(row) {
  return {
    companyName: row.company_name,
    legalName: row.legal_name,
    phone: row.phone,
    phoneDisplay: row.phone_display,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    city: row.city,
    country: row.country,
    timezone: row.timezone,
    defaultCurrency: row.default_currency,
    supportedCurrencies: JSON.parse(row.supported_currencies),
    supportedLanguages: JSON.parse(row.supported_languages),
    businessHours: row.business_hours,
    emergencyPhone: row.emergency_phone,
    socialLinks: JSON.parse(row.social_links),
    updatedAt: row.updated_at,
  };
}

export function getSettings() {
  const db = getDb();
  let row = db.prepare("SELECT * FROM business_settings WHERE id = ?").get(ROW_ID);
  if (!row) {
    db.prepare("INSERT INTO business_settings (id) VALUES (?)").run(ROW_ID);
    row = db.prepare("SELECT * FROM business_settings WHERE id = ?").get(ROW_ID);
  }
  return rowToSettings(row);
}

const EDITABLE_FIELDS = {
  companyName: "company_name",
  legalName: "legal_name",
  phone: "phone",
  phoneDisplay: "phone_display",
  whatsapp: "whatsapp",
  email: "email",
  address: "address",
  city: "city",
  country: "country",
  timezone: "timezone",
  defaultCurrency: "default_currency",
  businessHours: "business_hours",
  emergencyPhone: "emergency_phone",
};

export function updateSettings(patch) {
  const db = getDb();
  getSettings(); // ensure the row exists
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(EDITABLE_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "supportedCurrencies")) {
    sets.push("supported_currencies = ?");
    values.push(JSON.stringify(patch.supportedCurrencies));
  }
  if (Object.prototype.hasOwnProperty.call(patch, "supportedLanguages")) {
    sets.push("supported_languages = ?");
    values.push(JSON.stringify(patch.supportedLanguages));
  }
  if (Object.prototype.hasOwnProperty.call(patch, "socialLinks")) {
    sets.push("social_links = ?");
    values.push(JSON.stringify(patch.socialLinks));
  }
  if (!sets.length) return getSettings();
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(ROW_ID);
  db.prepare(`UPDATE business_settings SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getSettings();
}
