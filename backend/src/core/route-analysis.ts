export type RoutePoint = {
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
};

export type TripSummary = {
  start: string;
  end: string;
  distanceKm: number;
  durationSec: number;
};

export type RouteStats = {
  pointCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  distanceKm: number;
  durationSec: number;
  avgSpeedKmh: number | null;
  maxSpeedKmh: number | null;
  movingSec: number;
  idleSec: number;
  stopCount: number;
  tripCount: number;
  trips: TripSummary[];
};

export const MAX_HISTORY_RANGE_DAYS = 31;
export const MAX_HISTORY_POINTS = 10_000;
export const MAX_SUMMARY_POINTS = 50_000;
export const IDLE_SPEED_KMH = 5;
export const STOP_MINUTES = 5;
export const TRIP_GAP_MINUTES = 30;

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function segmentTrips(
  points: RoutePoint[],
  gapMinutes = TRIP_GAP_MINUTES,
): RoutePoint[][] {
  if (points.length === 0) return [];
  const gapMs = gapMinutes * 60 * 1000;
  const trips: RoutePoint[][] = [[points[0]]];

  for (let i = 1; i < points.length; i++) {
    const prev = new Date(points[i - 1].timestamp).getTime();
    const curr = new Date(points[i].timestamp).getTime();
    if (curr - prev > gapMs) {
      trips.push([points[i]]);
    } else {
      trips[trips.length - 1].push(points[i]);
    }
  }

  return trips;
}

function distanceOfPoints(points: RoutePoint[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    km += haversineKm(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }
  return km;
}

function isIdle(speed?: number | null): boolean {
  return speed == null || speed < IDLE_SPEED_KMH;
}

function countStops(points: RoutePoint[]): number {
  if (points.length < 2) return 0;

  const stopMs = STOP_MINUTES * 60 * 1000;
  let stops = 0;
  let idleStart: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const t = new Date(points[i].timestamp).getTime();
    const idle = isIdle(points[i].speed);

    if (idle) {
      if (idleStart == null) idleStart = new Date(points[i - 1].timestamp).getTime();
    } else if (idleStart != null) {
      if (t - idleStart >= stopMs) stops++;
      idleStart = null;
    }
  }

  if (idleStart != null) {
    const last = new Date(points[points.length - 1].timestamp).getTime();
    if (last - idleStart >= stopMs) stops++;
  }

  return stops;
}

function movingIdleSec(points: RoutePoint[]): { movingSec: number; idleSec: number } {
  let movingSec = 0;
  let idleSec = 0;

  for (let i = 1; i < points.length; i++) {
    const dt =
      (new Date(points[i].timestamp).getTime() -
        new Date(points[i - 1].timestamp).getTime()) /
      1000;
    if (dt <= 0) continue;
    if (isIdle(points[i].speed) && isIdle(points[i - 1].speed)) {
      idleSec += dt;
    } else {
      movingSec += dt;
    }
  }

  return { movingSec, idleSec };
}

export function computeRouteStats(points: RoutePoint[]): RouteStats {
  if (points.length === 0) {
    return {
      pointCount: 0,
      firstTimestamp: null,
      lastTimestamp: null,
      distanceKm: 0,
      durationSec: 0,
      avgSpeedKmh: null,
      maxSpeedKmh: null,
      movingSec: 0,
      idleSec: 0,
      stopCount: 0,
      tripCount: 0,
      trips: [],
    };
  }

  const trips = segmentTrips(points);
  const first = points[0].timestamp;
  const last = points[points.length - 1].timestamp;
  const durationSec = Math.max(
    0,
    (new Date(last).getTime() - new Date(first).getTime()) / 1000,
  );
  const distanceKm = distanceOfPoints(points);
  const speeds = points
    .map((p) => p.speed)
    .filter((s): s is number => s != null && !Number.isNaN(s));
  const maxSpeedKmh = speeds.length ? Math.max(...speeds) : null;
  const avgSpeedKmh =
    durationSec > 0 ? (distanceKm / durationSec) * 3600 : null;
  const { movingSec, idleSec } = movingIdleSec(points);

  return {
    pointCount: points.length,
    firstTimestamp: first,
    lastTimestamp: last,
    distanceKm,
    durationSec,
    avgSpeedKmh,
    maxSpeedKmh,
    movingSec,
    idleSec,
    stopCount: countStops(points),
    tripCount: trips.length,
    trips: trips.map((trip) => {
      const tripFirst = trip[0].timestamp;
      const tripLast = trip[trip.length - 1].timestamp;
      return {
        start: tripFirst,
        end: tripLast,
        distanceKm: distanceOfPoints(trip),
        durationSec: Math.max(
          0,
          (new Date(tripLast).getTime() - new Date(tripFirst).getTime()) / 1000,
        ),
      };
    }),
  };
}

export function downsamplePoints<T>(points: T[], step: number): T[] {
  if (step <= 1 || points.length <= 2) return points;
  const out: T[] = [points[0]];
  for (let i = step; i < points.length - 1; i += step) {
    out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function validateHistoryRange(start: Date, end: Date): string | null {
  if (end < start) return "end must be after start";
  const maxMs = MAX_HISTORY_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxMs) {
    return `Date range cannot exceed ${MAX_HISTORY_RANGE_DAYS} days`;
  }
  return null;
}
