import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

// Serves real uploaded vehicle photos (see app/api/vehicles/[id]/photos/route.js)
// from a top-level uploads/ folder, deliberately NOT from Next's public/
// folder. next start snapshots public/ at server startup, so a file
// written there after the server is already running (exactly what an
// admin uploading a photo does) 404s until the next restart, a real bug
// that showed up during verification. Reading the file fresh on every
// request here avoids that entirely.
const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export async function GET(request, { params }) {
  const segments = params.path || [];
  if (segments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  const filePath = path.join(UPLOADS_ROOT, ...segments);
  if (!filePath.startsWith(UPLOADS_ROOT)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
