import { useMemo } from "react";
import { useVehicleStore } from "@/store/vehicleStore";
import type { LivePosition, Vehicle } from "@/api/types";

export interface MergedVehicle extends Vehicle {
  live?: LivePosition;
}

/** Combine the API vehicle list with the realtime Zustand overlay. */
export function useMergedVehicles(vehicles: Vehicle[] | undefined) {
  const positions = useVehicleStore((s) => s.positions);
  return useMemo<MergedVehicle[]>(() => {
    return (vehicles ?? []).map((v) => ({
      ...v,
      live: positions[v.id] ?? v.currentState ?? undefined,
    }));
  }, [vehicles, positions]);
}