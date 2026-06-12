import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  INGEST_TOKEN: z.string().optional(),
  OFFLINE_THRESHOLD_SEC: z.coerce.number().default(300),
  STATUS_CHECK_INTERVAL_SEC: z.coerce.number().default(60),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:8080"),
  OWTRACKS_MQTT_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  MQTT_URL: z.string().default("mqtt://mosquitto:1883"),
  OWTRACKS_MQTT_TOPIC: z.string().default("owntracks/#"),
  CAR_SENSOR_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
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
