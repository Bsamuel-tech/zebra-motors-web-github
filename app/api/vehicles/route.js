import { NextResponse } from "next/server";
import { getVehicles, createVehicle } from "@/lib/db/vehicles";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const includeAll = session && searchParams.get("all") === "1";
  return NextResponse.json({ vehicles: await getVehicles({ includeAll }) });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.make || !input?.model || !input?.dailyRateRWFMin || !input?.dailyRateRWFMax) {
    return NextResponse.json(
      { error: "make, model, dailyRateRWFMin, and dailyRateRWFMax are required." },
      { status: 400 }
    );
  }
  const slug = input.slug || slugify(`${input.make}-${input.model}-${input.year || ""}`);
  const vehicle = await createVehicle({
    ...input,
    slug,
    name: input.name || `${input.make} ${input.model}`,
  });
  await logAction({
    userId: session.userId,
    action: "CREATE",
    entityType: "Vehicle",
    entityId: vehicle.dbId,
    detail: vehicle.name,
  });
  return NextResponse.json({ vehicle }, { status: 201 });
}
