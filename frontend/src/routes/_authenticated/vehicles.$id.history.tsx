import { createFileRoute } from "@tanstack/react-router";
import { RouteHistoryPage } from "@/pages/RouteHistoryPage";

export const Route = createFileRoute("/_authenticated/vehicles/$id/history")({
  head: () => ({
    meta: [
      { title: "History & Analysis — Fleet Tracker" },
      {
        name: "description",
        content:
          "View historical GPS routes, trip analysis, and playback for a vehicle.",
      },
    ],
  }),
  component: HistoryRoute,
});

function HistoryRoute() {
  const { id } = Route.useParams();
  return <RouteHistoryPage id={id} />;
}
