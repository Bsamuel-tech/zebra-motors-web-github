import { getReviews } from "@/lib/db/reviews";
import ReviewsTable from "@/components/admin/ReviewsTable";

export const dynamic = "force-dynamic";

export default function AdminReviewsPage() {
  const reviews = getReviews();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Reviews</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
        Only reviews confirmed as real, quoted from zebramotors.rw, exist here (Rule 4). This
        page lets staff publish or hide a review on the public site, not create new ones, adding
        a genuinely new review still requires editing scripts/seed.js or a future "add review"
        form once there is a verification process behind it.
      </p>
      <ReviewsTable reviews={reviews} />
    </div>
  );
}
