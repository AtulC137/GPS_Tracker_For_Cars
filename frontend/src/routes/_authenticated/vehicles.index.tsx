import { createFileRoute } from "@tanstack/react-router";
import { VehiclesPage } from "@/pages/VehiclesPage";

export const Route = createFileRoute("/_authenticated/vehicles/")({
  head: () => ({
    meta: [
      { title: "Vehicles — Fleet Tracker" },
      {
        name: "description",
        content: "Searchable list of all fleet vehicles with live status and speed.",
      },
      { property: "og:title", content: "Vehicles — Fleet Tracker" },
      {
        property: "og:description",
        content: "Searchable list of all fleet vehicles.",
      },
    ],
  }),
  component: VehiclesPage,
});
