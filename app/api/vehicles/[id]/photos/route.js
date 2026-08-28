import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getVehicleByDbId } from "@/lib/db/vehicles";
import { addPhoto } from "@/lib/db/vehiclePhotos";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Real file upload, not a mock. Saves the actual uploaded image to disk
// under uploads/vehicles/<vehicleId>/ (a top-level folder, not public/,
// see app/uploads/[...path]/route.js for why) and records it in
// vehicle_photos. A local disk is fine for this single-server setup, a
// production deployment on managed hosting should point this at real
// object storage instead, the same kind of swap noted for the database in
// prisma/schema.sql's own top comment.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const vehicle = getVehicleByDbId(params.id);
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

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

  const dir = path.join(process.cwd(), "uploads", "vehicles", params.id);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), bytes);

  const url = `/uploads/vehicles/${params.id}/${filename}`;
  const photo = addPhoto({ vehicleId: params.id, url, altText, isPrimary });

  logAction({
    userId: session.userId,
    action: "UPLOAD_PHOTO",
    entityType: "Vehicle",
    entityId: params.id,
    detail: `${vehicle.name}: ${filename}`,
  });

  return NextResponse.json({ photo }, { status: 201 });
}
