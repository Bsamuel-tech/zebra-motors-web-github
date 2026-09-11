import { notFound } from "next/navigation";
import { getConversationById, getMessagesForConversation } from "@/lib/db/support";
import { getCustomerById } from "@/lib/db/customers";
import { getBookingById } from "@/lib/db/bookings";
import SupportConversationView from "@/components/admin/SupportConversationView";

export const dynamic = "force-dynamic";

export default async function SupportConversationPage({ params }) {
  const conversation = await getConversationById(params.id);
  if (!conversation) notFound();

  const [messages, customer, booking] = await Promise.all([
    getMessagesForConversation(params.id),
    conversation.customerId ? getCustomerById(conversation.customerId) : null,
    conversation.bookingId ? getBookingById(conversation.bookingId) : null,
  ]);

  return (
    <div style={{ padding: "32px 36px" }}>
      <SupportConversationView conversation={conversation} messages={messages} customer={customer} booking={booking} />
    </div>
  );
}
