import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "@/pages/RegisterPage";
import { getAuthToken } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getAuthToken()) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [{ title: "Create account — Fleet Tracker" }],
  }),
  component: RegisterPage,
});
