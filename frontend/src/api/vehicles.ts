import { del, get, patch, post } from "./client";
import {
  CreateVehicleInput,
  CreateVehicleResponse,
  CreateVehicleResponseSchema,
  Vehicle,
  VehicleSchema,
  LiveState,
  LiveStateSchema,
  History,
  HistorySchema,
  RouteSummary,
  RouteSummarySchema,
} from "./types";
import { z } from "zod";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const data = await get<unknown>("/api/v1/vehicles");
  return z.array(VehicleSchema).parse(data);
}

export async function createVehicle(
  input: CreateVehicleInput,
): Promise<CreateVehicleResponse> {
  const data = await post<unknown>("/api/v1/vehicles", input);
  return CreateVehicleResponseSchema.parse(data);
}

export async function fetchTrackerSetup() {
  return get<unknown>("/api/v1/tracker-setup");
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  const data = await get<unknown>(`/api/v1/vehicles/${id}`);
  return VehicleSchema.parse(data);
}

export async function updateVehicle(
  id: string,
  input: { vehicleName?: string; vehicleNumber?: string },
): Promise<Vehicle> {
  const data = await patch<unknown>(`/api/v1/vehicles/${id}`, input);
  return VehicleSchema.parse(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  await del(`/api/v1/vehicles/${id}`);
}

export async function fetchVehicleLive(id: string): Promise<LiveState> {
  const data = await get<unknown>(`/api/v1/vehicles/${id}/live`);
  return LiveStateSchema.parse(data);
}

export async function fetchVehicleHistory(
  id: string,
  start: string,
  end: string,
  options?: { downsample?: number },
): Promise<History> {
  const params = new URLSearchParams({
    start,
    end,
  });
  if (options?.downsample && options.downsample > 1) {
    params.set("downsample", String(options.downsample));
  }
  const data = await get<unknown>(
    `/api/v1/vehicles/${id}/history?${params.toString()}`,
  );
  return HistorySchema.parse(data);
}

export async function fetchVehicleHistorySummary(
  id: string,
  start: string,
  end: string,
): Promise<RouteSummary> {
  const data = await get<unknown>(
    `/api/v1/vehicles/${id}/history/summary?start=${encodeURIComponent(
      start,
    )}&end=${encodeURIComponent(end)}`,
  );
  return RouteSummarySchema.parse(data);
}
