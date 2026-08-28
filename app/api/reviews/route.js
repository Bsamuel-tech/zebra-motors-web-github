import { NextResponse } from "next/server";
import { getReviews } from "@/lib/db/reviews";
import { getSession } from "@/lib/auth/requireAdmin";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ reviews: getReviews({ publishedOnly: !session }) });
}
