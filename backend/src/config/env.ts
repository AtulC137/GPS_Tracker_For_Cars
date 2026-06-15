import { z } from "zod";



const envSchema = z.object({

  DATABASE_URL: z.string().min(1),

  PORT: z.coerce.number().default(3000),

  HOST: z.string().default("0.0.0.0"),

  INGEST_TOKEN: z.string().optional(),

  AUTO_REGISTER_OWTRACKS_PHONES: z

    .string()

    .optional()

    .transform((v) => v !== "false"),

  OFFLINE_THRESHOLD_SEC: z.coerce.number().default(300),

  STATUS_CHECK_INTERVAL_SEC: z.coerce.number().default(60),

  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:8080"),

  JWT_SECRET: z.string().default("dev-jwt-secret-change-in-production"),

  JWT_EXPIRES_IN: z.string().default("7d"),

  DEFAULT_ORG_ID: z.string().optional(),

  OWTRACKS_MQTT_ENABLED: z

    .string()

    .optional()

    .transform((v) => v === "true"),

  MQTT_URL: z.string().default("mqtt://mosquitto:1883"),

  OWTRACKS_MQTT_TOPIC: z.string().default("owntracks/#"),

  AIS140_TCP_ENABLED: z

    .string()

    .optional()

    .transform((v) => v === "true"),

  AIS140_TCP_PORT: z.coerce.number().default(5000),

  AIS140_TCP_HOST: z.string().default("0.0.0.0"),

  AIS140_VALIDATE_CHECKSUM: z

    .string()

    .optional()

    .transform((v) => v === "true"),

  AIS140_SEND_ACK: z

    .string()

    .optional()

    .transform((v) => v === "true"),

  AIS140_DEMO_IMEI: z.string().default("888888888888999"),
  PUBLIC_AIS140_TCP_HOST: z.string().optional(),
  PUBLIC_AIS140_TCP_PORT: z.coerce.number().optional(),
  PUBLIC_OWTRACKS_HTTP_URL: z.string().optional(),
  PUBLIC_OWTRACKS_MQTT_HOST: z.string().optional(),
  PUBLIC_OWTRACKS_MQTT_PORT: z.coerce.number().optional(),
});



export type Env = z.infer<typeof envSchema>;



export function loadEnv(): Env {

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {

    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);

    process.exit(1);

  }

  return parsed.data;

}



export function getCorsOrigins(env: Env): string[] {

  return env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);

}

