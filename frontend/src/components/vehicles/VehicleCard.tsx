import { Link, useNavigate } from "@tanstack/react-router";
import { Gauge, MapPin, Navigation, Trash2 } from "lucide-react";
import type { MergedVehicle } from "@/hooks/useMergedVehicles";
import { VehicleStatusBadge } from "./VehicleStatusBadge";
import { formatHeading, formatSpeed, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function VehicleCard({
  vehicle,
  canEdit,
  onDelete,
  deleting,
}: {
  vehicle: MergedVehicle;
  canEdit: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <button
        type="button"
        onClick={() => navigate({ to: "/vehicles/$id", params: { id: vehicle.id } })}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{vehicle.vehicleName}</p>
            <p className="text-sm text-muted-foreground">{vehicle.vehicleNumber}</p>
          </div>
          <VehicleStatusBadge status={vehicle.live?.status} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" /> {formatSpeed(vehicle.live?.speed)}
          </span>
          <span className="flex items-center gap-1">
            <Navigation className="h-3.5 w-3.5" /> {formatHeading(vehicle.live?.heading)}
          </span>
          <span className="col-span-2 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {relativeTime(vehicle.live?.lastSeenAt)}
          </span>
        </div>
      </button>

      {canEdit && (
        <div className="mt-4 flex justify-end gap-2">
          <Link
            to="/vehicles/$id"
            params={{ id: vehicle.id }}
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Edit details
          </Link>
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}