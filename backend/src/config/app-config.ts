import { createRequire } from "node:module";
import { z } from "zod";

const require = createRequire(import.meta.url);

const fileConfigSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default("0.0.0.0"),
    corsOrigins: z.array(z.string()).default(["http://localhost:5173", "http://localhost:8080"]),
  }),
  tracking: z.object({
    autoRegisterOwntracksPhones: z.boolean().default(true),
    defaultOrgId: z.string().nullable().default(null),
    offlineThresholdSec: z.number().default(300),
    statusCheckIntervalSec: z.number().default(60),
    phoneDevicePrefix: z.string().default("phone-"),
    ais140: z.object({
      tcpEnabled: z.boolean().default(true),
      tcpPort: z.number().default(5000),
      tcpHost: z.string().default("0.0.0.0"),
      validateChecksum: z.boolean().default(false),
      sendAck: z.boolean().default(false),
      demoImei: z.string().default("888888888888999"),
    }),
    owntracks: z.object({
      mqttEnabled: z.boolean().default(false),
      mqttUrl: z.string().default("mqtt://mosquitto:1883"),
      mqttTopic: z.string().default("owntracks/#"),
      publicHttpPath: z.string().default("/api/v1/ingest/owntracks"),
    }),
    public: z.object({
      ais140TcpHost: z.string().default("localhost"),
      ais140TcpPort: z.number().default(5000),
      owntracksHttpUrl: z
        .string()
        .default("http://localhost:3000/api/v1/ingest/owntracks"),
      owntracksMqttHost: z.string().default("localhost"),
      owntracksMqttPort: z.number().default(1883),
    }),
  }),
  status: z.object({
    offlineThresholdSec: z.number().default(300),
    checkIntervalSec: z.number().default(60),
  }),
  websocket: z.object({
    path: z.string().default("/ws"),
  }),
  features: z.object({
    jwtExpiresIn: z.string().default("7d"),
    ingestOpenForTesting: z.boolean().default(false),
  }),
});

const appConfigSchema = fileConfigSchema.extend({
  secrets: z.object({
    databaseUrl: z.string().min(1),
    jwtSecret: z.string().min(1),
    ingestToken: z.string().optional(),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

/** Flat env shape consumed by existing services, routes, and tracker plugins. */
export type Env = {
  DATABASE_URL: string;
  PORT: number;
  HOST: string;
  INGEST_TOKEN?: string;
  INGEST_OPEN_FOR_TESTING: boolean;
  AUTO_REGISTER_OWTRACKS_PHONES: boolean;
  OFFLINE_THRESHOLD_SEC: number;
  STATUS_CHECK_INTERVAL_SEC: number;
  CORS_ORIGINS: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DEFAULT_ORG_ID?: string;
  OWTRACKS_MQTT_ENABLED: boolean;
  MQTT_URL: string;
  OWTRACKS_MQTT_TOPIC: string;
  AIS140_TCP_ENABLED: boolean;
  AIS140_TCP_PORT: number;
  AIS140_TCP_HOST: string;
  AIS140_VALIDATE_CHECKSUM: boolean;
  AIS140_SEND_ACK: boolean;
  AIS140_DEMO_IMEI: string;
  PUBLIC_AIS140_TCP_HOST?: string;
  PUBLIC_AIS140_TCP_PORT?: number;
  PUBLIC_OWTRACKS_HTTP_URL?: string;
  PUBLIC_OWTRACKS_MQTT_HOST?: string;
  PUBLIC_OWTRACKS_MQTT_PORT?: number;
};

function getDefaultFileConfig(): z.infer<typeof fileConfigSchema> {
  return fileConfigSchema.parse({
    server: {},
    tracking: { ais140: {}, owntracks: {}, public: {} },
    status: {},
    websocket: {},
    features: {},
  });
}

function parseOptionalBoolEnv(value: string | undefined): boolean {
  return value === "true";
}

function mergeWithEnv(fileConfig: z.infer<typeof fileConfigSchema>): AppConfig {
  const env = process.env;

  const corsOrigins =
    env.CORS_ORIGINS !== undefined
      ? env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : fileConfig.server.corsOrigins;

  const merged = {
    server: {
      port: env.PORT !== undefined ? Number(env.PORT) : fileConfig.server.port,
      host: env.HOST ?? fileConfig.server.host,
      corsOrigins,
    },
    tracking: {
      autoRegisterOwntracksPhones:
        env.AUTO_REGISTER_OWTRACKS_PHONES !== undefined
          ? env.AUTO_REGISTER_OWTRACKS_PHONES !== "false"
          : fileConfig.tracking.autoRegisterOwntracksPhones,
      defaultOrgId: env.DEFAULT_ORG_ID ?? fileConfig.tracking.defaultOrgId,
      offlineThresholdSec:
        env.OFFLINE_THRESHOLD_SEC !== undefined
          ? Number(env.OFFLINE_THRESHOLD_SEC)
          : fileConfig.tracking.offlineThresholdSec,
      statusCheckIntervalSec:
        env.STATUS_CHECK_INTERVAL_SEC !== undefined
          ? Number(env.STATUS_CHECK_INTERVAL_SEC)
          : fileConfig.tracking.statusCheckIntervalSec,
      phoneDevicePrefix: fileConfig.tracking.phoneDevicePrefix,
      ais140: {
        tcpEnabled:
          env.AIS140_TCP_ENABLED !== undefined
            ? parseOptionalBoolEnv(env.AIS140_TCP_ENABLED)
            : fileConfig.tracking.ais140.tcpEnabled,
        tcpPort:
          env.AIS140_TCP_PORT !== undefined
            ? Number(env.AIS140_TCP_PORT)
            : fileConfig.tracking.ais140.tcpPort,
        tcpHost: env.AIS140_TCP_HOST ?? fileConfig.tracking.ais140.tcpHost,
        validateChecksum:
          env.AIS140_VALIDATE_CHECKSUM !== undefined
            ? parseOptionalBoolEnv(env.AIS140_VALIDATE_CHECKSUM)
            : fileConfig.tracking.ais140.validateChecksum,
        sendAck:
          env.AIS140_SEND_ACK !== undefined
            ? parseOptionalBoolEnv(env.AIS140_SEND_ACK)
            : fileConfig.tracking.ais140.sendAck,
        demoImei: env.AIS140_DEMO_IMEI ?? fileConfig.tracking.ais140.demoImei,
      },
      owntracks: {
        mqttEnabled:
          env.OWNTRACKS_MQTT_ENABLED !== undefined
            ? parseOptionalBoolEnv(env.OWNTRACKS_MQTT_ENABLED)
            : fileConfig.tracking.owntracks.mqttEnabled,
        mqttUrl: env.MQTT_URL ?? fileConfig.tracking.owntracks.mqttUrl,
        mqttTopic: env.OWNTRACKS_MQTT_TOPIC ?? fileConfig.tracking.owntracks.mqttTopic,
        publicHttpPath: fileConfig.tracking.owntracks.publicHttpPath,
      },
      public: {
        ais140TcpHost:
          env.PUBLIC_AIS140_TCP_HOST ?? fileConfig.tracking.public.ais140TcpHost,
        ais140TcpPort:
          env.PUBLIC_AIS140_TCP_PORT !== undefined
            ? Number(env.PUBLIC_AIS140_TCP_PORT)
            : fileConfig.tracking.public.ais140TcpPort,
        owntracksHttpUrl:
          env.PUBLIC_OWTRACKS_HTTP_URL ?? fileConfig.tracking.public.owntracksHttpUrl,
        owntracksMqttHost:
          env.PUBLIC_OWTRACKS_MQTT_HOST ?? fileConfig.tracking.public.owntracksMqttHost,
        owntracksMqttPort:
          env.PUBLIC_OWTRACKS_MQTT_PORT !== undefined
            ? Number(env.PUBLIC_OWTRACKS_MQTT_PORT)
            : fileConfig.tracking.public.owntracksMqttPort,
      },
    },
    status: {
      offlineThresholdSec:
        env.OFFLINE_THRESHOLD_SEC !== undefined
          ? Number(env.OFFLINE_THRESHOLD_SEC)
          : fileConfig.status.offlineThresholdSec,
      checkIntervalSec:
        env.STATUS_CHECK_INTERVAL_SEC !== undefined
          ? Number(env.STATUS_CHECK_INTERVAL_SEC)
          : fileConfig.status.checkIntervalSec,
    },
    websocket: fileConfig.websocket,
    features: {
      jwtExpiresIn: env.JWT_EXPIRES_IN ?? fileConfig.features.jwtExpiresIn,
      ingestOpenForTesting:
        env.INGEST_OPEN_FOR_TESTING !== undefined
          ? parseOptionalBoolEnv(env.INGEST_OPEN_FOR_TESTING)
          : fileConfig.features.ingestOpenForTesting,
    },
    secrets: {
      databaseUrl: env.DATABASE_URL ?? "",
      jwtSecret: env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
      ingestToken: env.INGEST_TOKEN || undefined,
    },
  };

  const parsed = appConfigSchema.safeParse(merged);
  if (!parsed.success) {
    console.error("Invalid configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export function toFlatEnv(config: AppConfig): Env {
  return {
    DATABASE_URL: config.secrets.databaseUrl,
    PORT: config.server.port,
    HOST: config.server.host,
    INGEST_TOKEN: config.secrets.ingestToken,
    INGEST_OPEN_FOR_TESTING: config.features.ingestOpenForTesting,
    AUTO_REGISTER_OWTRACKS_PHONES: config.tracking.autoRegisterOwntracksPhones,
    OFFLINE_THRESHOLD_SEC: config.status.offlineThresholdSec,
    STATUS_CHECK_INTERVAL_SEC: config.status.checkIntervalSec,
    CORS_ORIGINS: config.server.corsOrigins.join(","),
    JWT_SECRET: config.secrets.jwtSecret,
    JWT_EXPIRES_IN: config.features.jwtExpiresIn,
    DEFAULT_ORG_ID: config.tracking.defaultOrgId ?? undefined,
    OWTRACKS_MQTT_ENABLED: config.tracking.owntracks.mqttEnabled,
    MQTT_URL: config.tracking.owntracks.mqttUrl,
    OWTRACKS_MQTT_TOPIC: config.tracking.owntracks.mqttTopic,
    AIS140_TCP_ENABLED: config.tracking.ais140.tcpEnabled,
    AIS140_TCP_PORT: config.tracking.ais140.tcpPort,
    AIS140_TCP_HOST: config.tracking.ais140.tcpHost,
    AIS140_VALIDATE_CHECKSUM: config.tracking.ais140.validateChecksum,
    AIS140_SEND_ACK: config.tracking.ais140.sendAck,
    AIS140_DEMO_IMEI: config.tracking.ais140.demoImei,
    PUBLIC_AIS140_TCP_HOST: config.tracking.public.ais140TcpHost,
    PUBLIC_AIS140_TCP_PORT: config.tracking.public.ais140TcpPort,
    PUBLIC_OWTRACKS_HTTP_URL: config.tracking.public.owntracksHttpUrl,
    PUBLIC_OWTRACKS_MQTT_HOST: config.tracking.public.owntracksMqttHost,
    PUBLIC_OWTRACKS_MQTT_PORT: config.tracking.public.owntracksMqttPort,
  };
}

export function loadAppConfig(): AppConfig {
  return mergeWithEnv(getDefaultFileConfig());
}

export function loadEnv(): Env {
  return toFlatEnv(loadAppConfig());
}

export function getCorsOrigins(env: Env): string[] {
  return env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
}

export function getCorsOriginsFromConfig(config: AppConfig): string[] {
  return config.server.corsOrigins;
}

export function getStartupMetadata(config: AppConfig): {
  version: string;
  environment: string;
  databaseHost: string;
} {
  let version = "0.0.0";
  try {
    const pkg = require("../../package.json") as { version?: string };
    version = pkg.version ?? version;
  } catch {
    // package.json not found — use default
  }

  let databaseHost = "unknown";
  try {
    const url = new URL(config.secrets.databaseUrl);
    databaseHost = url.host;
  } catch {
    // invalid URL — leave as unknown
  }

  return {
    version,
    environment: process.env.NODE_ENV ?? "development",
    databaseHost,
  };
}
