import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getDestinationByDbId } from "@/lib/db/destinations";
import { addDestinationPhoto } from "@/lib/db/destinationPhotos";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Real file upload, the same pattern as app/api/vehicles/[id]/photos/route.js.
// Saved to uploads/destinations/<destinationId>/, served by the same
// app/uploads/[...path]/route.js handler that already serves vehicle photos.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const destination = getDestinationByDbId(params.id);
  if (!destination) return NextResponse.json({ error: "Destination not found." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are accepted." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (8MB max)." }, { status: 400 });
  }

  const altText = (form.get("altText") || "").toString().slice(0, 200);
  const isPrimary = form.get("isPrimary") === "true";

  const dir = path.join(process.cwd(), "uploads", "destinations", params.id);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), bytes);

  const url = `/uploads/destinations/${params.id}/${filename}`;
  const photo = addDestinationPhoto({ destinationId: params.id, url, altText, isPrimary });

  logAction({
    userId: session.userId,
    action: "UPLOAD_PHOTO",
    entityType: "Destination",
    entityId: params.id,
    detail: `${destination.name}: ${filename}`,
  });

  return NextResponse.json({ photo }, { status: 201 });
}
