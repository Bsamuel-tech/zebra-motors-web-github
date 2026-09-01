import VehicleForm from "@/components/admin/VehicleForm";

export default function NewVehiclePage() {
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Add vehicle</h1>
      <VehicleForm vehicle={null} />
    </div>
  );
}
