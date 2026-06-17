import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useMergedVehicles } from "@/hooks/useMergedVehicles";
import { useVehicleStore } from "@/store/vehicleStore";
import { FleetMap } from "@/components/map/FleetMap";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";
import { formatSpeed } from "@/lib/format";
import { LoadingState } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function LiveMapPage() {
  const { data, isLoading } = useVehicles();
  const syncFromVehicles = useVehicleStore((s) => s.syncFromVehicles);
  const merged = useMergedVehicles(data);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (data) syncFromVehicles(data);
  }, [data, syncFromVehicles]);

  const focus = (id: string) => {
    setFocusId(null);
    requestAnimationFrame(() => setFocusId(id));
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="order-2 flex w-full flex-col border-t border-border bg-card md:order-1 md:h-full md:w-72 md:border-r md:border-t-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Vehicles</h2>
        </div>
        <div className="max-h-48 flex-1 overflow-auto md:max-h-none">
          {isLoading ? (
            <LoadingState />
          ) : (
            merged.map((v) => (
              <button
                key={v.id}
                onClick={() => focus(v.id)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border px-4 py-3 text-left hover:bg-accent/50",
                  focusId === v.id && "bg-accent",
                )}
              >
                <Crosshair className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {v.vehicleName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatSpeed(v.live?.speed)}
                  </p>
                </div>
                <VehicleStatusBadge status={v.live?.status} />
              </button>
            ))
          )}
        </div>
      </div>
      <div className="order-1 min-h-[300px] flex-1 md:order-2">
        <FleetMap vehicles={merged} focusId={focusId} className="h-full w-full" />
      </div>
    </div>
  );
}