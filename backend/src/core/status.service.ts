import { prisma } from "../db/client.js";
import type { WsHub } from "./ws-hub.js";

export class StatusService {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private wsHub: WsHub,
    private offlineThresholdSec: number,
    private checkIntervalSec: number,
  ) {}

  start() {
    this.timer = setInterval(() => void this.checkOffline(), this.checkIntervalSec * 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async checkOffline() {
    const cutoff = new Date(Date.now() - this.offlineThresholdSec * 1000);

    const stale = await prisma.vehicleLiveState.findMany({
      where: {
        status: "online",
        lastSeenAt: { lt: cutoff },
      },
    });

    for (const live of stale) {
      await prisma.vehicleLiveState.update({
        where: { vehicleId: live.vehicleId },
        data: { status: "offline" },
      });

      this.wsHub.broadcast({
        type: "vehicle_status_update",
        vehicleId: live.vehicleId,
        status: "offline",
      });
    }
  }
}
