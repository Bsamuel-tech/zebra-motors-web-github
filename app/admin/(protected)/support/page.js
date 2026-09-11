import { getConversations } from "@/lib/db/support";
import SupportInbox from "@/components/admin/SupportInbox";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const conversations = await getConversations();

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Support</h1>
        <p className="muted" style={{ fontSize: 13.5, maxWidth: 640 }}>
          Zebra Assistant Support conversations. Once you take over a conversation, the AI stops
          replying in it automatically, you are talking to the customer directly from here.
        </p>
      </div>
      <SupportInbox conversations={conversations} />
    </div>
  );
}
