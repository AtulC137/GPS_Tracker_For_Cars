import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/pages/LoginPage";
import { getAuthToken } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    // localStorage is unavailable during SSR — defer to client navigation.
    if (typeof window === "undefined") return;
    if (getAuthToken()) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [{ title: "Sign in — Fleet Tracker" }],
  }),
  component: LoginPage,
});
