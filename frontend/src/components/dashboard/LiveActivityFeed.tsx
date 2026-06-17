import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import type { MergedVehicle } from "@/hooks/useMergedVehicles";
import { formatSpeed, relativeTime } from "@/lib/format";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";

export function LiveActivityFeed({ vehicles }: { vehicles: MergedVehicle[] }) {
  const recent = [...vehicles]
    .filter((v) => v.live)
    .sort(
      (a, b) =>
        new Date(b.live!.lastSeenAt).getTime() -
        new Date(a.live!.lastSeenAt).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">Recent Activity</h2>
      </div>
      <ul className="divide-y divide-border">
        {recent.length === 0 && (
          <li className="px-5 py-6 text-sm text-muted-foreground">
            No recent updates.
          </li>
        )}
        {recent.map((v) => (
          <li key={v.id}>
            <Link
              to="/vehicles/$id"
              params={{ id: v.id }}
              className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v.vehicleName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {v.vehicleNumber}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                {formatSpeed(v.live?.speed)}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {relativeTime(v.live?.lastSeenAt)}
              </span>
              <VehicleStatusBadge status={v.live?.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}