import { useQuery } from "@tanstack/react-query";
import { fetchVehicleHistorySummary } from "@/api/vehicles";

export function useVehicleHistorySummary(
  id: string,
  start: string | null,
  end: string | null,
) {
  return useQuery({
    queryKey: ["vehicle-history-summary", id, start, end],
    queryFn: () => fetchVehicleHistorySummary(id, start!, end!),
    enabled: Boolean(id && start && end),
  });
}
