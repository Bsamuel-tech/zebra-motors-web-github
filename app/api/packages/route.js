import { NextResponse } from "next/server";
import { getPackages, createPackage } from "@/lib/db/packages";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ packages: await getPackages({ publishedOnly: !session }) });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.name || !input?.duration || !input?.summary) {
    return NextResponse.json({ error: "name, duration, and summary are required." }, { status: 400 });
  }
  const slug = input.slug || slugify(input.name);
  const pkg = await createPackage({ ...input, slug });
  await logAction({ userId: session.userId, action: "CREATE", entityType: "Package", entityId: pkg.id, detail: pkg.name });
  return NextResponse.json({ package: pkg }, { status: 201 });
}
