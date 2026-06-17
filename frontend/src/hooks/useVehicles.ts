import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  fetchVehicle,
  fetchVehicleLive,
  fetchVehicles,
} from "@/api/vehicles";

export const vehiclesQueryOptions = () =>
  queryOptions({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
    staleTime: 30_000,
  });

export const vehicleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["vehicle", id],
    queryFn: () => fetchVehicle(id),
    staleTime: 30_000,
  });

export const vehicleLiveQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["vehicle-live", id],
    queryFn: () => fetchVehicleLive(id),
    refetchInterval: 30_000,
  });

export function useVehicles() {
  return useQuery(vehiclesQueryOptions());
}

export function useVehicle(id: string) {
  return useQuery(vehicleQueryOptions(id));
}

export function useVehicleLive(id: string) {
  return useQuery(vehicleLiveQueryOptions(id));
}