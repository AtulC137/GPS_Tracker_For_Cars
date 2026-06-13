import { z } from "zod";
import type { NormalizedLocationUpdate } from "../../core/types.js";

const IMEI_SCHEMA = z.string().regex(/^\d{15}$/);

export type Ais140PacketKind = "location" | "health" | "unknown";

export interface Ais140ParseResult {
  kind: Ais140PacketKind;
  update?: NormalizedLocationUpdate;
  health?: { imei: string; raw: string };
}

/** Build internal deviceId from AIS-140 IMEI. */
export function ais140DeviceId(imei: string): string {
  return `ais140-${IMEI_SCHEMA.parse(imei)}`;
}

/** Extract complete `$...*XX` frames from a TCP buffer. */
export function extractAis140Frames(buffer: string): { frames: string[]; remainder: string } {
  const frames: string[] = [];
  let i = 0;

  while (i < buffer.length) {
    const start = buffer.indexOf("$", i);
    if (start === -1) break;

    const star = buffer.indexOf("*", start + 1);
    if (star === -1) {
      return { frames, remainder: buffer.slice(start) };
    }

    if (star + 2 >= buffer.length) {
      return { frames, remainder: buffer.slice(start) };
    }

    const checksum = buffer.slice(star + 1, star + 3);
    if (!/^[0-9A-Fa-f]{2}$/.test(checksum)) {
      i = start + 1;
      continue;
    }

    let end = star + 3;
    if (buffer[end] === "\r") end++;
    if (buffer[end] === "\n") end++;

    frames.push(buffer.slice(start, star + 3));
    i = end;
  }

  return { frames, remainder: "" };
}

/** XOR checksum between `$` and `*` (exclusive). */
export function computeAis140Checksum(bodyWithDollar: string): string {
  let cs = 0;
  for (let i = 1; i < bodyWithDollar.length; i++) {
    cs ^= bodyWithDollar.charCodeAt(i);
  }
  return cs.toString(16).toUpperCase().padStart(2, "0");
}

function splitFrame(frame: string): { body: string; checksum: string } {
  const star = frame.lastIndexOf("*");
  if (star === -1) throw new Error("Missing checksum delimiter");
  return {
    body: frame.slice(0, star),
    checksum: frame.slice(star + 1).toUpperCase(),
  };
}

function validateChecksum(body: string, checksum: string, strict: boolean): void {
  if (!strict) return;
  const expected = computeAis140Checksum(body);
  if (expected !== checksum.toUpperCase()) {
    throw new Error(`Checksum mismatch: expected ${expected}, got ${checksum}`);
  }
}

function parseDdMmYyyyHhMmSsUtc(date: string, time: string): string {
  if (!/^\d{8}$/.test(date) || !/^\d{6}$/.test(time)) {
    throw new Error("Invalid NMP date/time");
  }
  const day = date.slice(0, 2);
  const month = date.slice(2, 4);
  const year = date.slice(4, 8);
  const hour = time.slice(0, 2);
  const minute = time.slice(2, 4);
  const second = time.slice(4, 6);
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

function parseEpbDatetime(value: string): string {
  if (!/^\d{14}$/.test(value)) {
    throw new Error("Invalid EPB datetime");
  }
  const date = value.slice(0, 8);
  const time = value.slice(8, 14);
  return parseDdMmYyyyHhMmSsUtc(date, time);
}

function signedCoordinate(value: string, direction: string, negativeDir: string): number {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) throw new Error(`Invalid coordinate: ${value}`);
  return direction.toUpperCase() === negativeDir ? -num : num;
}

function parseNmp(body: string, raw: string): NormalizedLocationUpdate {
  const parts = body.split(",");
  const header = parts[0]?.replace(/^\$/, "") ?? "";
  if (header !== "NMP") throw new Error("Not an NMP packet");

  if (parts.length < 17) throw new Error("NMP packet too short");

  const [
    ,
    ,
    ,
    packetType,
    alertId,
    packetStatus,
    imei,
    vehicleRegNo,
    gpsFix,
    date,
    time,
    latitude,
    latDir,
    longitude,
    lonDir,
    speed,
    heading,
  ] = parts;

  if (gpsFix !== "1") {
    throw new Error("NMP GPS fix invalid");
  }

  return {
    deviceId: ais140DeviceId(imei),
    latitude: signedCoordinate(latitude, latDir, "S"),
    longitude: signedCoordinate(longitude, lonDir, "W"),
    speed: Number.parseFloat(speed) || null,
    heading: Number.parseFloat(heading) || null,
    timestamp: parseDdMmYyyyHhMmSsUtc(date, time),
    source: "ais140",
    raw: {
      packetHeader: "NMP",
      packetType,
      alertId,
      packetStatus,
      imei,
      vehicleRegNo,
      line: raw,
    },
  };
}

function parseEpb(body: string, raw: string): NormalizedLocationUpdate {
  const parts = body.split(",");
  const header = parts[0]?.replace(/^\$/, "") ?? "";
  if (header !== "EPB") throw new Error("Not an EPB packet");

  if (parts.length < 12) throw new Error("EPB packet too short");

  const packetType = parts[1];
  const imei = parts[2];
  const packetStatus = parts[3];
  const datetime = parts[4];
  const gpsValidity = parts[5];
  const latitude = parts[6];
  const latDir = parts[7];
  const longitude = parts[8];
  const lonDir = parts[9];
  const speed = parts[11];

  if (gpsValidity !== "A") {
    throw new Error("EPB GPS invalid");
  }

  return {
    deviceId: ais140DeviceId(imei),
    latitude: signedCoordinate(latitude, latDir, "S"),
    longitude: signedCoordinate(longitude, lonDir, "W"),
    speed: Number.parseFloat(speed) || null,
    heading: null,
    timestamp: parseEpbDatetime(datetime),
    source: "ais140",
    raw: {
      packetHeader: "EPB",
      packetType,
      packetStatus,
      imei,
      line: raw,
    },
  };
}

function parseHlp(body: string, raw: string): Ais140ParseResult {
  const parts = body.split(",");
  const header = parts[0]?.replace(/^\$/, "") ?? "";
  if (header !== "HLP") throw new Error("Not an HLP packet");

  const imei = parts[3];
  if (!imei || !/^\d{15}$/.test(imei)) {
    throw new Error("HLP missing valid IMEI");
  }

  return {
    kind: "health",
    health: { imei, raw },
  };
}

/**
 * Parse a single Maharashtra AIS-140 frame (`$...*CC`).
 * Returns location updates for NMP (valid GPS) and EPB (valid GPS); health for HLP.
 */
export function parseAis140Frame(frame: string, strictChecksum = false): Ais140ParseResult {
  const trimmed = frame.trim();
  if (!trimmed.startsWith("$")) {
    throw new Error("Frame must start with $");
  }

  const { body, checksum } = splitFrame(trimmed);
  validateChecksum(body, checksum, strictChecksum);

  const header = body.slice(1, 4);

  if (header === "NMP") {
    return { kind: "location", update: parseNmp(body, trimmed) };
  }
  if (header === "EPB") {
    return { kind: "location", update: parseEpb(body, trimmed) };
  }
  if (header === "HLP") {
    return parseHlp(body, trimmed);
  }

  return { kind: "unknown" };
}
