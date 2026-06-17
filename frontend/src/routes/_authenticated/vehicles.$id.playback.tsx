import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vehicles/$id/playback")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/vehicles/$id/history",
      params: { id: params.id },
    });
  },
  component: () => null,
});
