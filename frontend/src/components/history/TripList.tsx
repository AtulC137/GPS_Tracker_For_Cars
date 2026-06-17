import type { TripSummary } from "@/api/types";
import { formatDateTime, formatDistance, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TripList({
  trips,
  selectedIndex,
  onSelect,
}: {
  trips: TripSummary[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  if (trips.length <= 1) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Trips ({trips.length})</h2>
        <p className="text-xs text-muted-foreground">
          Gaps over 30 minutes start a new trip.
        </p>
      </div>
      <ul className="max-h-48 divide-y divide-border overflow-auto lg:max-h-none">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-accent/50",
              selectedIndex === null && "bg-accent",
            )}
          >
            <span className="font-medium">All trips</span>
            <span className="text-xs text-muted-foreground">Full selected range</span>
          </button>
        </li>
        {trips.map((trip, i) => (
          <li key={`${trip.start}-${trip.end}`}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-accent/50",
                selectedIndex === i && "bg-accent",
              )}
            >
              <span className="font-medium">Trip {i + 1}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(trip.start)} → {formatDateTime(trip.end)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistance(trip.distanceKm)} · {formatDuration(trip.durationSec)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
