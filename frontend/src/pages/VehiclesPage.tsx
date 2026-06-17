import { useEffect, useState } from "react";
import { useVehicles } from "@/hooks/useVehicles";
import { useMergedVehicles } from "@/hooks/useMergedVehicles";
import { useVehicleStore } from "@/store/vehicleStore";
import { useAuth } from "@/context/AuthContext";
import { VehicleTable } from "@/components/vehicles/VehicleTable";
import { AddTrackerButton } from "@/components/vehicles/AddTrackerDialog";
import { ErrorState, LoadingState } from "@/components/ui/spinner";

export function VehiclesPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useVehicles();
  const syncFromVehicles = useVehicleStore((s) => s.syncFromVehicles);
  const merged = useMergedVehicles(data);
  const [, setRefreshKey] = useState(0);
  const canEdit = user?.role === "admin";

  useEffect(() => {
    if (data) syncFromVehicles(data);
  }, [data, syncFromVehicles]);

  const handleCreated = () => {
    void refetch();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            {merged.length} vehicle{merged.length === 1 ? "" : "s"} in fleet.
          </p>
        </div>
        {user?.role === "admin" && (
          <AddTrackerButton onCreated={handleCreated} className="shrink-0" />
        )}
      </div>
      {isLoading ? (
        <LoadingState label="Loading vehicles…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <VehicleTable vehicles={merged} canEdit={canEdit} />
      )}
    </div>
  );
}
