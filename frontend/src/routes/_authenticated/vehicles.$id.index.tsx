import { createFileRoute } from "@tanstack/react-router";
import { VehicleDetailPage } from "@/pages/VehicleDetailPage";

export const Route = createFileRoute("/_authenticated/vehicles/$id/")({
  head: () => ({
    meta: [
      { title: "Vehicle Details — Fleet Tracker" },
      {
        name: "description",
        content: "Live location, speed, heading and status for a fleet vehicle.",
      },
    ],
  }),
  component: VehicleDetailRoute,
});

function VehicleDetailRoute() {
  const { id } = Route.useParams();
  return <VehicleDetailPage id={id} />;
}
