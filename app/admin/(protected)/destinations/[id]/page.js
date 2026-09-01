import { notFound } from "next/navigation";
import { getDestinationByDbId } from "@/lib/db/destinations";
import DestinationForm from "@/components/admin/DestinationForm";
import DestinationPhotoManager from "@/components/admin/DestinationPhotoManager";

export const dynamic = "force-dynamic";

export default async function EditDestinationPage({ params }) {
  const destination = await getDestinationByDbId(params.id);
  if (!destination) notFound();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>{destination.name}</h1>
      <DestinationForm destination={destination} />
      <DestinationPhotoManager destinationId={destination.dbId} photos={destination.photos} />
    </div>
  );
}
