import { useQuery } from "@tanstack/react-query";
import { fetchVehicleHistory } from "@/api/vehicles";

export function useVehicleHistory(
  id: string,
  start: string | null,
  end: string | null,
  options?: { downsample?: number },
) {
  return useQuery({
    queryKey: ["vehicle-history", id, start, end, options?.downsample],
    queryFn: () => fetchVehicleHistory(id, start!, end!, options),
    enabled: Boolean(id && start && end),
  });
}