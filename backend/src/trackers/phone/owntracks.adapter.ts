import { z } from "zod";
import type { NormalizedLocationUpdate } from "../../core/types.js";

const OwnTracksLocationSchema = z.object({
  _type: z.literal("location"),
  lat: z.number(),
  lon: z.number(),
  vel: z.number().optional(),
  cog: z.number().optional(),
  tst: z.number(),
  tid: z.string().min(1),
});

export type OwnTracksLocation = z.infer<typeof OwnTracksLocationSchema>;

export function parseOwnTracksPayload(payload: unknown): OwnTracksLocation {
  return OwnTracksLocationSchema.parse(payload);
}

/**
 * Converts native OwnTracks location JSON to normalized internal format.
 * OwnTracks `vel` is km/h; `tst` is Unix epoch seconds.
 */
export function owntracksToNormalized(payload: unknown): NormalizedLocationUpdate {
  const ot = parseOwnTracksPayload(payload);
  return {
    deviceId: `phone-${ot.tid}`,
    latitude: ot.lat,
    longitude: ot.lon,
    speed: ot.vel ?? null,
    heading: ot.cog ?? null,
    timestamp: new Date(ot.tst * 1000).toISOString(),
    source: "owntracks",
    raw: payload,
  };
}
