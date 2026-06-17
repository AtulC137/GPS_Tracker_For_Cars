import { createFileRoute } from "@tanstack/react-router";
import { LiveMapPage } from "@/pages/LiveMapPage";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Live Map — Fleet Tracker" },
      {
        name: "description",
        content: "Realtime map of all fleet vehicles updating live via WebSocket.",
      },
      { property: "og:title", content: "Live Map — Fleet Tracker" },
      {
        property: "og:description",
        content: "Realtime map of all fleet vehicles.",
      },
    ],
  }),
  component: LiveMapPage,
});
