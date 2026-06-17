export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) || "ws://localhost:3000/ws";

// Default map center (Pune, India) and zoom for the demo.
export const DEFAULT_CENTER: [number, number] = [73.8567, 18.5204];
export const DEFAULT_ZOOM = 10;

// Free demo raster tiles (OpenStreetMap). Documented in README.
export const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};