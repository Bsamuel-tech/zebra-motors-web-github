import { Suspense } from "react";
import BookingFlow from "@/components/BookingFlow";

export const metadata = { title: "Book, Zebra Motors" };

export default function BookPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>Loading…</div>}>
      <BookingFlow />
    </Suspense>
  );
}
