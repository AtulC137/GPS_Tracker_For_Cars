# GPS Car Tracking

Fleet tracking dashboard with a plugin-based backend. Phone locations arrive via **OwnTracks** (HTTP through ngrok or MQTT through Mosquitto). Car sensor hardware can be added later using the same ingestion pipeline.

## Architecture

```
OwnTracks (phone) ──HTTP/ngrok──► owntracks-http plugin ──┐
OwnTracks / AIS   ──MQTT────────► owntracks-mqtt plugin  ──┼──► normalized location ──► PostgreSQL + WebSocket ──► Frontend
Car sensor (future) ────────────► car-sensor plugin      ──┘
```

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

For **phone tracking** with OwnTracks, set `NGROK_AUTHTOKEN` in `.env` and use the phone profile:

```bash
docker compose --profile phone up --build
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:8080        |
| Backend API| http://localhost:3000        |
| WebSocket  | ws://localhost:3000/ws       |
| PostgreSQL | localhost:5432               |
| Mosquitto  | localhost:1883 (MQTT)        |
| ngrok dashboard | http://localhost:4040 (`--profile phone` only) |

Seeded vehicles (device IDs must match ingest payloads):

| Vehicle      | deviceId      | Use case              |
|--------------|---------------|-----------------------|
| My Phone     | `phone-AT`    | OwnTracks `tid: AT`   |
| Test Phone   | `phone-001`   | README curl example   |
| Demo Car     | `car-demo-001`| Future car sensor     |

## Local Development (without Docker)

### Backend

```bash
cd backend
cp ../.env.example .env
# Set DATABASE_URL=postgresql://fleet:fleet@localhost:5432/fleet if using local Postgres
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend/gps-tracker-for-cars
cp .env.example .env
npm install
npm run dev
```

## OwnTracks HTTP Setup (ngrok in Docker)

1. Create a free account at [ngrok.com](https://ngrok.com), reserve a static domain, and copy your authtoken into `.env`:

   ```env
   NGROK_AUTHTOKEN=your_token_here
   ```

2. Start the stack with the phone profile (detached/background):

   ```bash
   docker compose --profile phone up -d --build
   ```

3. The public HTTPS URL is fixed and does not change on restart:

   `https://intense-elf-lively.ngrok-free.app`

   Verify the tunnel is active:

   ```bash
   curl http://localhost:4040/api/tunnels
   curl https://intense-elf-lively.ngrok-free.app/health
   ```

   View ngrok logs:

   ```bash
   docker compose logs -f ngrok
   ```

4. In the **OwnTracks** app:
   - Preferences → Connection → Mode: **HTTP**
   - URL: `https://intense-elf-lively.ngrok-free.app/api/v1/ingest/owntracks`
   - If `INGEST_TOKEN` is set in `.env`, use **Bearer** auth or HTTP Basic (password = token).

5. Set your tracker ID (`tid`) to **AT** (maps to seeded vehicle `phone-AT`) or register a new vehicle with `deviceId: phone-<tid>`.

6. Send a manual location from OwnTracks — the map at http://localhost:8080/map should update live.

> The ingest endpoint returns HTTP `200` with an empty JSON array `[]` (OwnTracks protocol requirement).

### Example OwnTracks payload

```json
{
  "_type": "location",
  "lat": 18.52,
  "lon": 73.85,
  "vel": 40,
  "cog": 120,
  "tst": 1718181818,
  "tid": "AT"
}
```

The adapter at `backend/src/trackers/phone/owntracks.adapter.ts` converts this to:

```json
{
  "deviceId": "phone-AT",
  "latitude": 18.52,
  "longitude": 73.85,
  "speed": 40,
  "heading": 120,
  "timestamp": "2024-06-12T10:03:38.000Z",
  "source": "owntracks"
}
```

## MQTT (optional, for AIS / field testing)

Enable in `.env`:

```env
OWNTRACKS_MQTT_ENABLED=true
```

OwnTracks (or any publisher) sends the same JSON to topic `owntracks/<user>/<device>`. The MQTT plugin reuses `owntracks.adapter.ts`.

Test with Mosquitto:

```bash
docker compose up mosquitto backend
mosquitto_pub -h localhost -t "owntracks/user/phone" -m '{"_type":"location","lat":18.52,"lon":73.85,"vel":30,"cog":90,"tst":1718181818,"tid":"AT"}'
```

## Manual GPS ingest (testing)

```bash
curl -X POST http://localhost:3000/api/v1/gps/location \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"phone-001","latitude":18.5204,"longitude":73.8567,"speed":45,"heading":120,"timestamp":"2026-06-11T12:00:00Z"}'
```

With ingest token:

```bash
curl -X POST http://localhost:3000/api/v1/gps/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me" \
  -d '{"deviceId":"phone-001","latitude":18.5204,"longitude":73.8567,"speed":45,"heading":120,"timestamp":"2026-06-11T12:00:00Z"}'
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/vehicles` | List vehicles |
| GET | `/api/v1/vehicles/:id` | Vehicle detail |
| GET | `/api/v1/vehicles/:id/live` | Live state |
| GET | `/api/v1/vehicles/:id/history?start=&end=` | Track history (ISO dates) |
| POST | `/api/v1/gps/location` | Generic GPS ingest |
| POST | `/api/v1/ingest/owntracks` | OwnTracks HTTP ingest |
| WS | `/ws` | Realtime location/status events |

## Adding a Car Sensor Later

1. Create `backend/src/trackers/car/car-sensor.adapter.ts` — map hardware JSON → `NormalizedLocationUpdate` with `deviceId: car-<serial>`.
2. Implement routes or MQTT/TCP listener in `car-sensor.plugin.ts`.
3. Set `CAR_SENSOR_ENABLED=true` and seed vehicles with matching `deviceId`.
4. No changes needed to ingestion, REST API, or frontend.

## Environment Variables

See [`.env.example`](.env.example). Key settings:

- `INGEST_TOKEN` — optional auth for ingest endpoints
- `NGROK_AUTHTOKEN` — required for the ngrok container (`docker compose --profile phone up`)
- `OFFLINE_THRESHOLD_SEC` — seconds before a vehicle is marked offline (default 300)
- `OWNTRACKS_MQTT_ENABLED` — enable MQTT subscriber plugin
- `VITE_API_URL` / `VITE_WS_URL` — must be reachable from the **browser** (use `localhost:3000`, not Docker service names)

## Verification Checklist

1. `docker compose up --build` — all services start (without ngrok)
2. `docker compose --profile phone up --build` — ngrok starts; http://localhost:4040 shows tunnel URL
3. `curl http://localhost:3000/health` — returns `{ "status": "ok" }`
4. `curl http://localhost:3000/api/v1/vehicles` — returns seeded vehicles
5. POST `/api/v1/gps/location` — marker moves on `/map`
6. OwnTracks → ngrok → `/api/v1/ingest/owntracks` — live updates
7. History endpoint returns points for playback page
