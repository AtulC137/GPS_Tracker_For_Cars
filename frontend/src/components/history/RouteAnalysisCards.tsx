import type { RouteSummary } from "@/api/types";
import { formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import { Gauge, MapPin, Pause, Route, Timer } from "lucide-react";

export function RouteAnalysisCards({ summary }: { summary: RouteSummary }) {
  const cards = [
    {
      label: "Distance",
      value: formatDistance(summary.distanceKm),
      icon: Route,
    },
    {
      label: "Duration",
      value: formatDuration(summary.durationSec),
      icon: Timer,
    },
    {
      label: "Avg speed",
      value: formatSpeed(summary.avgSpeedKmh),
      icon: Gauge,
    },
    {
      label: "Max speed",
      value: formatSpeed(summary.maxSpeedKmh),
      icon: Gauge,
    },
    {
      label: "Moving",
      value: formatDuration(summary.movingSec),
      icon: Timer,
    },
    {
      label: "Stops",
      value: String(summary.stopCount),
      icon: MapPin,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {c.label}
            </span>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function TruncatedBanner({
  totalPointCount,
}: {
  totalPointCount?: number;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
      <span className="font-medium">Sampled route shown.</span>{" "}
      {totalPointCount != null && (
        <span>
          {totalPointCount.toLocaleString()} points in range — map uses a subset.
        </span>
      )}{" "}
      Narrow the date range for full detail.
    </div>
  );
}

export function IdleNote() {
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Pause className="h-3.5 w-3.5" />
      Idle time: included in duration stats
    </p>
  );
}
