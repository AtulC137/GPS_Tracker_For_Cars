import { create } from "zustand";
import type {
  LivePosition,
  Vehicle,
  VehicleLocationUpdate,
  VehicleStatusUpdate,
} from "@/api/types";

interface VehicleStore {
  positions: Record<string, LivePosition>;
  wsConnected: boolean;
  lastEventAt: number | null;
  updatePosition: (event: VehicleLocationUpdate) => void;
  updateStatus: (event: VehicleStatusUpdate) => void;
  syncFromVehicles: (vehicles: Vehicle[]) => void;
  setConnected: (connected: boolean) => void;
}

export const useVehicleStore = create<VehicleStore>((set) => ({
  positions: {},
  wsConnected: false,
  lastEventAt: null,
  updatePosition: (event) =>
    set((state) => {
      const prev = state.positions[event.vehicleId];
      return {
        lastEventAt: Date.now(),
        positions: {
          ...state.positions,
          [event.vehicleId]: {
            latitude: event.latitude,
            longitude: event.longitude,
            speed: event.speed,
            heading: event.heading,
            lastSeenAt: event.lastSeenAt,
            status: prev?.status ?? "online",
          },
        },
      };
    }),
  updateStatus: (event) =>
    set((state) => {
      const prev = state.positions[event.vehicleId];
      if (!prev) return state;
      return {
        lastEventAt: Date.now(),
        positions: {
          ...state.positions,
          [event.vehicleId]: { ...prev, status: event.status },
        },
      };
    }),
  syncFromVehicles: (vehicles) =>
    set((state) => {
      const positions = { ...state.positions };
      for (const v of vehicles) {
        const s = v.currentState;
        if (s && positions[v.id] === undefined) {
          positions[v.id] = {
            latitude: s.latitude,
            longitude: s.longitude,
            speed: s.speed,
            heading: s.heading,
            lastSeenAt: s.lastSeenAt,
            status: s.status,
          };
        }
      }
      return { positions };
    }),
  setConnected: (connected) => set({ wsConnected: connected }),
}));

/** Merge API current state with realtime Zustand overlay. */
export function mergedPosition(
  vehicle: Vehicle | undefined,
  live: LivePosition | undefined,
): LivePosition | undefined {
  if (live) return live;
  if (vehicle?.currentState) {
    const s = vehicle.currentState;
    return {
      latitude: s.latitude,
      longitude: s.longitude,
      speed: s.speed,
      heading: s.heading,
      lastSeenAt: s.lastSeenAt,
      status: s.status,
    };
  }
  return undefined;
}