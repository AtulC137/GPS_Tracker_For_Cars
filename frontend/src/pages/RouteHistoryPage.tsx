import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { useVehicle } from "@/hooks/useVehicles";
import { useVehicleHistory } from "@/hooks/useVehicleHistory";
import { useVehicleHistorySummary } from "@/hooks/useVehicleHistorySummary";
import { RouteMap } from "@/components/map/RouteMap";
import {
  HistoryRangePicker,
  presetRange,
  toLocalInput,
  type HistoryPreset,
} from "@/components/history/HistoryRangePicker";
import {
  IdleNote,
  RouteAnalysisCards,
  TruncatedBanner,
} from "@/components/history/RouteAnalysisCards";
import { TripList } from "@/components/history/TripList";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/spinner";
import { computeRouteStats, filterPointsByTrip } from "@/lib/routeAnalysis";
import { formatDateTime, formatSpeed } from "@/lib/format";
import type { RouteSummary } from "@/api/types";

export function RouteHistoryPage({ id }: { id: string }) {
  const { data: vehicle } = useVehicle(id);

  const now = useMemo(() => new Date(), []);
  const dayAgo = useMemo(() => new Date(Date.now() - 24 * 3600 * 1000), []);
  const [startInput, setStartInput] = useState(toLocalInput(dayAgo));
  const [endInput, setEndInput] = useState(toLocalInput(now));
  const [range, setRange] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(
    null,
  );

  const historyQuery = useVehicleHistory(
    id,
    range?.start ?? null,
    range?.end ?? null,
    { downsample: 5 },
  );
  const summaryQuery = useVehicleHistorySummary(
    id,
    range?.start ?? null,
    range?.end ?? null,
  );

  const allPoints = historyQuery.data?.points ?? [];
  const summary = summaryQuery.data;

  const activeTrip =
    summary && selectedTripIndex != null
      ? summary.trips[selectedTripIndex]
      : null;

  const displayPoints = useMemo(() => {
    if (!activeTrip) return allPoints;
    return filterPointsByTrip(allPoints, activeTrip);
  }, [allPoints, activeTrip]);

  const displaySummary: RouteSummary | null = useMemo(() => {
    if (!summary) return null;
    if (!activeTrip) return summary;
    const stats = computeRouteStats(displayPoints);
    return {
      vehicleId: summary.vehicleId,
      start: activeTrip.start,
      end: activeTrip.end,
      ...stats,
    };
  }, [summary, activeTrip, displayPoints]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
    setSelectedTripIndex(null);
  }, [historyQuery.data]);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [selectedTripIndex, displayPoints.length]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setIdx((i) => {
        if (i >= displayPoints.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 400);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, displayPoints.length]);

  const apply = () => {
    setRange({
      start: new Date(startInput).toISOString(),
      end: new Date(endInput).toISOString(),
    });
  };

  const applyPreset = (preset: HistoryPreset) => {
    const r = presetRange(preset);
    setStartInput(toLocalInput(new Date(r.start)));
    setEndInput(toLocalInput(new Date(r.end)));
    setRange(r);
  };

  const current = displayPoints[idx];
  const loading = Boolean(range) && (historyQuery.isLoading || summaryQuery.isLoading);
  const isError = historyQuery.isError || summaryQuery.isError;
  const error = (historyQuery.error ?? summaryQuery.error) as Error | undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <Link
        to="/vehicles/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vehicle
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">History & Analysis</h1>
        <p className="text-sm text-muted-foreground">
          {vehicle?.vehicleName ?? "Vehicle"} · {vehicle?.vehicleNumber ?? ""}
        </p>
      </div>

      <HistoryRangePicker
        startInput={startInput}
        endInput={endInput}
        onStartChange={setStartInput}
        onEndChange={setEndInput}
        onApply={apply}
        onPreset={applyPreset}
      />

      {!range ? (
        <EmptyState
          title="Select a time range"
          description="Choose dates or use a preset, then load the route."
        />
      ) : loading ? (
        <LoadingState label="Loading history…" />
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => {
          historyQuery.refetch();
          summaryQuery.refetch();
        }} />
      ) : allPoints.length === 0 ? (
        <EmptyState
          title="No history found"
          description="There is no telemetry for this vehicle in the selected range."
        />
      ) : (
        <div className="space-y-4">
          {displaySummary && <RouteAnalysisCards summary={displaySummary} />}
          <IdleNote />
          {historyQuery.data?.truncated && (
            <TruncatedBanner totalPointCount={historyQuery.data.totalPointCount} />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {summary && summary.tripCount > 1 && (
              <div className="lg:col-span-1">
                <TripList
                  trips={summary.trips}
                  selectedIndex={selectedTripIndex}
                  onSelect={setSelectedTripIndex}
                />
              </div>
            )}
            <div
              className={
                summary && summary.tripCount > 1
                  ? "overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-3"
                  : "overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-4"
              }
            >
              <RouteMap
                points={displayPoints}
                marker={current ?? null}
                className="h-[420px] w-full"
              />
              <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, displayPoints.length - 1)}
                  value={idx}
                  onChange={(e) => setIdx(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <div className="min-w-[180px] text-right text-xs text-muted-foreground">
                  {current && (
                    <>
                      {formatDateTime(current.timestamp)} ·{" "}
                      {formatSpeed(current.speed)}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
