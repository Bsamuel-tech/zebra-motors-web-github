import { notFound } from "next/navigation";
import { getVehicleByDbId } from "@/lib/db/vehicles";
import VehicleForm from "@/components/admin/VehicleForm";
import VehiclePhotoManager from "@/components/admin/VehiclePhotoManager";

export const dynamic = "force-dynamic";

export default function EditVehiclePage({ params }) {
  const vehicle = getVehicleByDbId(params.id);
  if (!vehicle) notFound();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>{vehicle.name}</h1>
      <VehicleForm vehicle={vehicle} />
      <VehiclePhotoManager vehicleId={vehicle.dbId} photos={vehicle.photos} />
    </div>
  );
}
