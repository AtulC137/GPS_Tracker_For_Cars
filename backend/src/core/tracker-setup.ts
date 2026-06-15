import type { Env } from "../config/env.js";
import { ais140DeviceId } from "../trackers/car/ais140-mh.adapter.js";

export type TrackerType = "ais140" | "owntracks_phone";

export function getPublicTrackerConfig(env: Env) {
  const ais140Port = env.PUBLIC_AIS140_TCP_PORT ?? env.AIS140_TCP_PORT;
  const mqttPort = env.PUBLIC_OWTRACKS_MQTT_PORT ?? 1883;

  return {
    ais140: {
      tcpHost: env.PUBLIC_AIS140_TCP_HOST ?? "localhost",
      tcpPort: ais140Port,
      protocol: "TCP" as const,
    },
    owntracks: {
      httpUrl:
        env.PUBLIC_OWTRACKS_HTTP_URL ??
        "http://localhost:3000/api/v1/ingest/owntracks",
      mqttHost: env.PUBLIC_OWTRACKS_MQTT_HOST ?? "localhost",
      mqttPort,
      mqttTopic: env.OWTRACKS_MQTT_TOPIC,
      ingestAuthRequired: Boolean(env.INGEST_TOKEN),
    },
  };
}

export function buildAis140Setup(
  vehicle: { vehicleNumber: string; deviceId: string; imei: string },
  env: Env,
) {
  const config = getPublicTrackerConfig(env);
  return {
    trackerType: "ais140" as const,
    imei: vehicle.imei,
    vehicleNumber: vehicle.vehicleNumber,
    deviceId: vehicle.deviceId,
    tcpHost: config.ais140.tcpHost,
    tcpPort: config.ais140.tcpPort,
    protocol: config.ais140.protocol,
    note: "Configure the VLT with this server host and port before the first $NMP packet. IMEI in packets must match registration.",
  };
}

export function buildOwntracksSetup(
  vehicle: { vehicleNumber: string; deviceId: string; tid: string },
  env: Env,
) {
  const config = getPublicTrackerConfig(env);
  return {
    trackerType: "owntracks_phone" as const,
    tid: vehicle.tid,
    vehicleNumber: vehicle.vehicleNumber,
    deviceId: vehicle.deviceId,
    http: {
      mode: "HTTP",
      url: config.owntracks.httpUrl,
      authRequired: config.owntracks.ingestAuthRequired,
      authHint: config.owntracks.ingestAuthRequired
        ? "Use Bearer token or HTTP Basic (password = ingest token) in OwnTracks."
        : undefined,
    },
    mqtt: {
      mode: "MQTT",
      host: config.owntracks.mqttHost,
      port: config.owntracks.mqttPort,
      topic: config.owntracks.mqttTopic,
      tailscaleNote:
        "On mobile data, use your server's Tailscale IP as the MQTT broker host (install Tailscale on server and phone).",
    },
    note: "Set tracker ID (tid) in OwnTracks to match the value above.",
  };
}

export function deviceIdForTracker(
  trackerType: TrackerType,
  fields: { imei?: string; tid?: string },
): string {
  if (trackerType === "ais140") {
    if (!fields.imei) throw new Error("IMEI required");
    return ais140DeviceId(fields.imei);
  }
  if (!fields.tid) throw new Error("TID required");
  return `phone-${fields.tid}`;
}
