import type { Feature, LineString } from "geojson";
import type { HistoryPoint } from "@/api/types";

export function pointsToLineString(
  points: HistoryPoint[],
): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: points.map((p) => [p.longitude, p.latitude]),
    },
  };
}

export function boundsOf(
  points: { latitude: number; longitude: number }[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}