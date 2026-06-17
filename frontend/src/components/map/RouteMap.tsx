import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE } from "@/config/env";
import type { HistoryPoint } from "@/api/types";
import { boundsOf, pointsToLineString } from "@/lib/geo";

export function RouteMap({
  points,
  marker,
  className,
}: {
  points: HistoryPoint[];
  marker?: { latitude: number; longitude: number } | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const playMarkerRef = useRef<maplibregl.Marker | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE as maplibregl.StyleSpecification,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => {
      loadedRef.current = true;
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#10b981", "line-width": 4 },
      });
      drawRoute();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  const drawRoute = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: points.length ? [pointsToLineString(points)] : [],
    });
    const b = boundsOf(points);
    if (b) {
      map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
    }
  };

  // redraw when points change
  useEffect(() => {
    drawRoute();
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  // animated playback marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!marker) {
      playMarkerRef.current?.remove();
      playMarkerRef.current = null;
      return;
    }
    const lngLat: [number, number] = [marker.longitude, marker.latitude];
    if (playMarkerRef.current) {
      playMarkerRef.current.setLngLat(lngLat);
    } else {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)";
      playMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);
    }
  }, [marker]);

  return <div ref={containerRef} className={className} />;
}