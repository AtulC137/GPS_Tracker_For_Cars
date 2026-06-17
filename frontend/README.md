# Fleet Tracker — Realtime GPS Fleet Dashboard

A production-style realtime GPS fleet tracking dashboard. Live vehicle
positions stream over WebSocket; vehicle metadata and history come from a REST
backend at `http://localhost:3000`.

## Tech Stack

- React 19 + TypeScript (strict) + Vite (TanStack Start framework)
- TanStack Router (file-based routing) + TanStack React Query (server state)
- Zustand (realtime client state) + Zod (payload validation)
- MapLibre GL (maps) + TailwindCSS + Lucide React

> Routing uses TanStack Router instead of `react-router-dom`, and pages live in
> `src/routes/` (thin) delegating to components in `src/pages/`. All other
> architecture (api / hooks / store / components split) matches the spec.

## Getting Started

```bash
npm install
cp .env.example .env   # adjust if your backend runs elsewhere
npm run dev
```

App runs at the Vite dev URL and connects to the backend out of the box.

## Environment Variables

| Variable       | Default                     | Purpose            |
| -------------- | --------------------------- | ------------------ |
| `VITE_API_URL` | `http://localhost:3000`     | REST base URL      |
| `VITE_WS_URL`  | `ws://localhost:3000/ws`    | WebSocket endpoint |

## Backend Contracts

REST:
- `GET /api/v1/vehicles`
- `GET /api/v1/vehicles/:id`
- `GET /api/v1/vehicles/:id/live`
- `GET /api/v1/vehicles/:id/history?start=ISO&end=ISO`

WebSocket (`ws://localhost:3000/ws`): `vehicle_location_update` and
`vehicle_status_update` events. The client auto-reconnects with exponential
backoff and updates the Zustand store per event (it never refetches the full
list on a message). Payloads are validated with Zod; snake_case can be
normalized in `src/api/vehicles.ts` if your backend differs.

## State Architecture

- **React Query** owns server state: `useVehicles`, `useVehicle`,
  `useVehicleLive`, `useVehicleHistory`.
- **Zustand** (`src/store/vehicleStore.ts`) owns realtime positions/status.
- Merge strategy: vehicle list seeds the store; WebSocket events override.
  UI reads `zustandPosition ?? apiCurrentState` via `useMergedVehicles`.

## Pages

| Path                      | Page            |
| ------------------------- | --------------- |
| `/`                       | Dashboard       |
| `/map`                    | Live Map        |
| `/vehicles`               | Vehicle List    |
| `/vehicles/:id`           | Vehicle Detail  |
| `/vehicles/:id/playback`  | Route Playback  |

## Map Tiles

Uses free OpenStreetMap raster tiles
(`https://tile.openstreetmap.org/{z}/{x}/{y}.png`), configured in
`src/config/env.ts` (`MAP_STYLE`). Default center: Pune, India, zoom 10.
Swap the tile URL there to use another provider.

## Testing Realtime Updates

With the backend running, simulate a GPS update:

```bash
curl -X POST http://localhost:3000/api/v1/gps/location \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"phone-001","latitude":18.5204,"longitude":73.8567,"speed":45,"heading":120,"timestamp":"2026-06-11T12:00:00Z"}'
```

The marker should move on the map and the vehicle row/cards should update with
no page refresh.
