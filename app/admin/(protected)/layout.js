import { getSession } from "@/lib/auth/requireAdmin";
import AdminSidebar from "@/components/AdminSidebar";

// middleware.js already redirects unauthenticated requests to /admin/login
// before this ever renders, this second check is defense in depth and
// gives the sidebar the current user's name and role to display.
export default async function ProtectedAdminLayout({ children }) {
  const session = await getSession();
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--paper-alt)" }}>
      <AdminSidebar user={session} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
