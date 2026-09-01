import { redirect } from "next/navigation";

// The bookings list now lives inline on the account overview page (there is
// exactly one real list, no reason to duplicate it on a second page). This
// route is kept only so an old bookmark or link to /account/bookings still
// lands somewhere useful instead of 404ing.
export default function BookingsIndexRedirect() {
  redirect("/account");
}
