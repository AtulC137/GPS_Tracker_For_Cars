import assert from "node:assert/strict";
import {
  computeRouteStats,
  haversineKm,
  segmentTrips,
} from "./route-analysis.js";

const t0 = "2025-01-01T10:00:00.000Z";
const t1 = "2025-01-01T10:01:00.000Z";
const t2 = "2025-01-01T10:02:00.000Z";
const tGap = "2025-01-01T12:00:00.000Z";

const points = [
  { latitude: 18.52, longitude: 73.85, speed: 40, timestamp: t0 },
  { latitude: 18.521, longitude: 73.851, speed: 42, timestamp: t1 },
  { latitude: 18.522, longitude: 73.852, speed: 0, timestamp: t2 },
  { latitude: 18.53, longitude: 73.86, speed: 30, timestamp: tGap },
];

assert.ok(haversineKm(18.52, 73.85, 18.521, 73.851) > 0);

const trips = segmentTrips(points, 30);
assert.equal(trips.length, 2);

const stats = computeRouteStats(points);
assert.equal(stats.pointCount, 4);
assert.equal(stats.tripCount, 2);
assert.ok(stats.distanceKm > 0);
assert.equal(stats.firstTimestamp, t0);
assert.equal(stats.lastTimestamp, tGap);

console.log("route-analysis tests passed");
