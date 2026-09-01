import DestinationForm from "@/components/admin/DestinationForm";

export default function NewDestinationPage() {
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Add destination</h1>
      <DestinationForm destination={null} />
    </div>
  );
}
