import type { WebSocket } from "ws";
import type { VehicleStatus } from "./types.js";

export interface LocationBroadcast {
  type: "vehicle_location_update";
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  lastSeenAt: string;
}

export interface StatusBroadcast {
  type: "vehicle_status_update";
  vehicleId: string;
  status: VehicleStatus;
}

export type WsBroadcast = LocationBroadcast | StatusBroadcast;

interface TrackedClient {
  socket: WebSocket;
  orgId: string;
}

export class WsHub {
  private clients = new Map<WebSocket, TrackedClient>();
  private vehicleOrgCache = new Map<string, string>();

  add(client: WebSocket, orgId: string) {
    this.clients.set(client, { socket: client, orgId });
    client.on("close", () => this.clients.delete(client));
    client.on("error", () => this.clients.delete(client));
  }

  setVehicleOrg(vehicleId: string, orgId: string) {
    this.vehicleOrgCache.set(vehicleId, orgId);
  }

  async warmVehicleOrgCache(loadAll: () => Promise<Array<{ id: string; organizationId: string }>>) {
    const vehicles = await loadAll();
    for (const vehicle of vehicles) {
      this.vehicleOrgCache.set(vehicle.id, vehicle.organizationId);
    }
  }

  broadcast(event: WsBroadcast) {
    const orgId = this.vehicleOrgCache.get(event.vehicleId);
    if (!orgId) return;

    const payload = JSON.stringify(event);
    for (const { socket, orgId: clientOrgId } of this.clients.values()) {
      if (clientOrgId !== orgId) continue;
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    }
  }

  get clientCount() {
    return this.clients.size;
  }
}
