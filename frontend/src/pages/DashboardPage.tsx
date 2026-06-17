import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useVehicles } from "@/hooks/useVehicles";
import { useMergedVehicles } from "@/hooks/useMergedVehicles";
import { useVehicleStore } from "@/store/vehicleStore";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { FleetMap } from "@/components/map/FleetMap";
import { ErrorState, LoadingState } from "@/components/ui/spinner";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useVehicles();
  const syncFromVehicles = useVehicleStore((s) => s.syncFromVehicles);
  const merged = useMergedVehicles(data);

  useEffect(() => {
    if (data) syncFromVehicles(data);
  }, [data, syncFromVehicles]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fleet Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Realtime overview of your fleet.
        </p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading fleet…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <>
          <StatsCards vehicles={merged} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold">Live Map</h2>
                  <Link
                    to="/map"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open full map →
                  </Link>
                </div>
                <FleetMap vehicles={merged} className="h-[360px] w-full" />
              </div>
            </div>
            <LiveActivityFeed vehicles={merged} />
          </div>
        </>
      )}
    </div>
  );
}