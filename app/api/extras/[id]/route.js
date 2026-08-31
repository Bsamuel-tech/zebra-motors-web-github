import { NextResponse } from "next/server";
import { updateExtra, getExtraById } from "@/lib/db/extras";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const PRICING_TYPES = ["PER_DAY", "PER_BOOKING", "PER_KM", "CUSTOM_QUOTE"];

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = getExtraById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const patch = await request.json().catch(() => ({}));
  if (patch.pricingType && !PRICING_TYPES.includes(patch.pricingType)) {
    return NextResponse.json({ error: `pricingType must be one of ${PRICING_TYPES.join(", ")}.` }, { status: 400 });
  }
  if (patch.priceRWF !== undefined && patch.priceRWF !== null && Number.isNaN(Number(patch.priceRWF))) {
    return NextResponse.json({ error: "priceRWF must be a number or null." }, { status: 400 });
  }

  const extra = updateExtra(params.id, {
    name: typeof patch.name === "string" ? patch.name : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    pricingType: patch.pricingType,
    priceRWF: patch.priceRWF,
    active: typeof patch.active === "boolean" ? patch.active : undefined,
  });

  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "RentalExtra",
    entityId: params.id,
    detail: `${extra.name}: active=${extra.active}, price=${extra.priceRWF ?? "unset"}`,
  });

  return NextResponse.json({ extra });
}
