import { notFound } from "next/navigation";
import { getPackageById } from "@/lib/db/packages";
import PackageForm from "@/components/admin/PackageForm";

export const dynamic = "force-dynamic";

export default async function EditPackagePage({ params }) {
  const pkg = await getPackageById(params.id);
  if (!pkg) notFound();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>{pkg.name}</h1>
      <PackageForm pkg={pkg} />
    </div>
  );
}
