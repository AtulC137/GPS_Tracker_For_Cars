import { useEffect, useRef } from "react";
import { WS_URL } from "@/config/env";
import { WsEventSchema } from "@/api/types";
import { useVehicleStore } from "@/store/vehicleStore";
import { getAuthToken, getWsUrlWithToken } from "@/lib/auth";

/**
 * Single WebSocket connection with exponential-backoff reconnect.
 * Updates the Zustand store on each event — never refetches the full list.
 */
export function useVehicleWebSocket() {
  const updatePosition = useVehicleStore((s) => s.updatePosition);
  const updateStatus = useVehicleStore((s) => s.updateStatus);
  const setConnected = useVehicleStore((s) => s.setConnected);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;

      const token = getAuthToken();
      if (!token) {
        setConnected(false);
        return;
      }

      let ws: WebSocket;
      try {
        ws = new WebSocket(getWsUrlWithToken(WS_URL, token));
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setConnected(true);
      };

      ws.onmessage = (msg) => {
        try {
          const parsed = WsEventSchema.safeParse(JSON.parse(msg.data));
          if (!parsed.success) return;
          if (parsed.data.type === "vehicle_location_update") {
            updatePosition(parsed.data);
          } else {
            updateStatus(parsed.data);
          }
        } catch {
          /* ignore malformed */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      const delay = Math.min(1000 * 2 ** attemptRef.current, 30_000);
      attemptRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [updatePosition, updateStatus, setConnected]);
}
