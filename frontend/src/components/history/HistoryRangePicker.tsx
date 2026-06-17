export type HistoryPreset = "24h" | "today" | "yesterday" | "7d";

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function presetRange(preset: HistoryPreset): { start: string; end: string } {
  const now = new Date();
  switch (preset) {
    case "24h":
      return {
        start: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        end: now.toISOString(),
      };
    case "today":
      return {
        start: startOfDay(now).toISOString(),
        end: now.toISOString(),
      };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return {
        start: startOfDay(y).toISOString(),
        end: endOfDay(y).toISOString(),
      };
    }
    case "7d":
      return {
        start: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
        end: now.toISOString(),
      };
  }
}

export function HistoryRangePicker({
  startInput,
  endInput,
  onStartChange,
  onEndChange,
  onApply,
  onPreset,
}: {
  startInput: string;
  endInput: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onApply: () => void;
  onPreset: (preset: HistoryPreset) => void;
}) {
  const presets: { id: HistoryPreset; label: string }[] = [
    { id: "24h", label: "Last 24h" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "Last 7 days" },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Start
          </label>
          <input
            type="datetime-local"
            value={startInput}
            onChange={(e) => onStartChange(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            End
          </label>
          <input
            type="datetime-local"
            value={endInput}
            onChange={(e) => onEndChange(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Load Route
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPreset(p.id)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { toLocalInput };
