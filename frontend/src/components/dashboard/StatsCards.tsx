import { Truck, Wifi, WifiOff } from "lucide-react";
import type { MergedVehicle } from "@/hooks/useMergedVehicles";

export function StatsCards({ vehicles }: { vehicles: MergedVehicle[] }) {
  const total = vehicles.length;
  const online = vehicles.filter((v) => v.live?.status === "online").length;
  const offline = total - online;

  const cards = [
    {
      label: "Total Vehicles",
      value: total,
      icon: Truck,
      tone: "text-foreground",
      bg: "bg-primary/10 text-primary",
    },
    {
      label: "Online",
      value: online,
      icon: Wifi,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Offline",
      value: offline,
      icon: WifiOff,
      tone: "text-muted-foreground",
      bg: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {c.label}
            </span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
              <c.icon className="h-5 w-5" />
            </span>
          </div>
          <p className={`mt-3 text-3xl font-bold ${c.tone}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}