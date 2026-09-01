import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getPhotoById, setPrimaryPhoto, deletePhoto } from "@/lib/db/vehiclePhotos";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = await getPhotoById(params.photoId);
  if (!existing || existing.vehicleId !== params.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const patch = await request.json().catch(() => null);
  if (patch?.isPrimary !== true) {
    return NextResponse.json({ error: "Only isPrimary: true is supported here." }, { status: 400 });
  }
  const photo = await setPrimaryPhoto(params.photoId, params.id);
  await logAction({ userId: session.userId, action: "UPDATE", entityType: "VehiclePhoto", entityId: params.photoId, detail: "set primary" });
  return NextResponse.json({ photo });
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = await getPhotoById(params.photoId);
  if (!existing || existing.vehicleId !== params.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await deletePhoto(params.photoId);
  const filePath = path.join(process.cwd(), existing.url.replace(/^\//, ""));
  await fs.unlink(filePath).catch(() => {});
  await logAction({ userId: session.userId, action: "DELETE", entityType: "VehiclePhoto", entityId: params.photoId });
  return NextResponse.json({ ok: true });
}
