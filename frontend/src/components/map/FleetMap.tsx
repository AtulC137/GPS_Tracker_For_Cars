import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE } from "@/config/env";
import type { MergedVehicle } from "@/hooks/useMergedVehicles";
import { formatHeading, formatSpeed, relativeTime } from "@/lib/format";

function markerInner(v: MergedVehicle): string {
  const online = v.live?.status === "online";
  return `<div style="transform:rotate(${
    v.live?.heading ?? 0
  }deg);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:20px solid ${
    online ? "#22c55e" : "#94a3b8"
  };filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));"></div>`;
}

function markerEl(v: MergedVehicle): HTMLElement {
  const el = document.createElement("div");
  el.className = "fleet-marker";
  el.style.cssText =
    "width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;";
  el.innerHTML = markerInner(v);
  return el;
}

function popupHtml(v: MergedVehicle): string {
  return `<div style="font-size:12px;min-width:150px">
    <div style="font-weight:600;margin-bottom:4px">${v.vehicleName}</div>
    <div style="color:#64748b">${v.vehicleNumber}</div>
    <div style="margin-top:6px">Speed: ${formatSpeed(v.live?.speed)}</div>
    <div>Heading: ${formatHeading(v.live?.heading)}</div>
    <div>Seen: ${relativeTime(v.live?.lastSeenAt)}</div>
  </div>`;
}

export function FleetMap({
  vehicles,
  focusId,
  className,
}: {
  vehicles: MergedVehicle[];
  focusId?: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const loadedRef = useRef(false);

  // init map once
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
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      loadedRef.current = false;
    };
  }, []);

  // sync markers without remounting the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const v of vehicles) {
      if (!v.live) continue;
      seen.add(v.id);
      const lngLat: [number, number] = [v.live.longitude, v.live.latitude];
      const existing = markersRef.current[v.id];
      if (existing) {
        existing.setLngLat(lngLat);
        existing.getElement().innerHTML = markerInner(v);
      } else {
        const marker = new maplibregl.Marker({ element: markerEl(v) })
          .setLngLat(lngLat)
          .setPopup(
            new maplibregl.Popup({ offset: 16 }).setHTML(popupHtml(v)),
          )
          .addTo(map);
        markersRef.current[v.id] = marker;
      }
    }
    // refresh popups + remove stale
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!seen.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      } else {
        const v = vehicles.find((x) => x.id === id);
        if (v) marker.getPopup()?.setHTML(popupHtml(v));
      }
    }
  }, [vehicles]);

  // focus a vehicle
  useEffect(() => {
    if (!focusId) return;
    const v = vehicles.find((x) => x.id === focusId);
    if (v?.live && mapRef.current) {
      mapRef.current.flyTo({
        center: [v.live.longitude, v.live.latitude],
        zoom: 14,
      });
      markersRef.current[focusId]?.togglePopup();
    }
  }, [focusId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={className} />;
}