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

export class WsHub {
  private clients = new Set<WebSocket>();

  add(client: WebSocket) {
    this.clients.add(client);
    client.on("close", () => this.clients.delete(client));
    client.on("error", () => this.clients.delete(client));
  }

  broadcast(event: WsBroadcast) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  get clientCount() {
    return this.clients.size;
  }
}
