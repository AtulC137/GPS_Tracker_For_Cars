import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/pages/DashboardPage";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fleet Tracker" },
      {
        name: "description",
        content:
          "Realtime GPS fleet tracking dashboard with live vehicle positions and status.",
      },
      { property: "og:title", content: "Dashboard — Fleet Tracker" },
      {
        property: "og:description",
        content: "Realtime GPS fleet tracking dashboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <DashboardPage />;
}
