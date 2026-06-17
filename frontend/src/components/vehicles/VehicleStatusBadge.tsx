import { cn } from "@/lib/utils";
import type { VehicleStatus } from "@/api/types";

export function VehicleStatusBadge({ status }: { status?: VehicleStatus }) {
  const online = status === "online";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        online
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          online
            ? "bg-emerald-500 animate-pulse shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
            : "bg-muted-foreground/60",
        )}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}