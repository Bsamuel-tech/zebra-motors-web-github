import PackageForm from "@/components/admin/PackageForm";

export default function NewPackagePage() {
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Add package</h1>
      <PackageForm pkg={null} />
    </div>
  );
}
