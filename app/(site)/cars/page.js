import CarsExplorer from "@/components/CarsExplorer";
import { getVehicles } from "@/lib/db/vehicles";
import { recordPageView } from "@/lib/db/analytics";

// Server component: reads the real fleet from the database (Phase 3B) and
// hands it to the interactive client component. Dynamic, not statically
// generated, since fleet status and pricing are now admin-editable.
export const dynamic = "force-dynamic";

export default function FleetPage() {
  recordPageView("/cars");
  const vehicles = getVehicles();
  return <CarsExplorer vehicles={vehicles} />;
}
