import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/lib/auth";
import { ErrorState, LoadingState } from "@/components/ui/spinner";

// Auth guard is client-only: localStorage is unavailable during SSR, so a
// beforeLoad check would always fail on refresh and redirect to /login.
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const redirectTarget = useRouterState({ select: (s) => s.location.href });
  const { isLoading, isAuthenticated, restoreError, retryRestore } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!getAuthToken()) {
      void navigate({
        to: "/login",
        search: { redirect: redirectTarget },
      });
    }
  }, [isLoading, navigate, redirectTarget]);

  if (isLoading) return <LoadingState label="Restoring session…" />;

  if (!getAuthToken()) {
    return <LoadingState label="Redirecting to sign in…" />;
  }

  if (restoreError) {
    return (
      <ErrorState message={restoreError} onRetry={() => void retryRestore()} />
    );
  }

  if (!isAuthenticated) {
    return <LoadingState label="Restoring session…" />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
