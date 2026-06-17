# GPS Car Tracking

Fleet tracking dashboard with a plugin-based backend. Phone locations arrive via **OwnTracks** (HTTP through ngrok or MQTT through Mosquitto). **AIS-140** car trackers push Maharashtra SOP packets over **raw TCP**.

> **Not included in GitHub:** `.env` files (secrets) and Cursor IDE files (`.cursor/`, rules, plans). Copy `.env` from the examples below or get them from the project author separately.

## Architecture

```
OwnTracks (phone) ──HTTP/ngrok──► owntracks-http plugin ──┐
OwnTracks         ──MQTT────────► owntracks-mqtt plugin  ──┼──► normalized location ──► PostgreSQL + WebSocket ──► Frontend
AIS-140 VLT (car) ──TCP────────► ais140-tcp plugin       ──┘
```

## Quick Start (Docker)

```bash
cp backend/.env.example backend/.env
cp frontend/gps-tracker-for-cars/.env.example frontend/gps-tracker-for-cars/.env
# edit both files, then:
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env up --build
```

On Windows, use the wrapper script instead:

```powershell
.\compose.ps1 up --build
```

For **database UI** (Adminer), include the dev profile:

```bash
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile dev up -d --build
```

For **phone tracking** with OwnTracks, set `NGROK_AUTHTOKEN` and `NGROK_DOMAIN` in `backend/.env` and use the phone profile:

```bash
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile phone up --build
```

For **AIS-140 car tracking**, reserve a [ngrok TCP address](https://ngrok.com/docs/universal-gateway/tcp-addresses) (paid plan), set `NGROK_TCP_ADDRESS` in `backend/.env`, and use the ais140 profile:

```bash
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile ais140 up --build
```

For **OwnTracks MQTT** (optional), set `OWNTRACKS_MQTT_ENABLED=true` in `backend/.env` and use the mqtt profile:

```bash
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile mqtt up -d --build
```

Combine with the phone profile for HTTP + MQTT together:

```bash
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile phone --profile mqtt up -d --build
```

On Windows, use the preset shortcut:

```powershell
.\compose.ps1 up-phone-mqtt
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:8080        |
| Backend API| http://localhost:3000        |
| WebSocket  | ws://localhost:3000/ws?token=`JWT` |
| AIS-140 TCP| localhost:5000 (or ngrok reserved TCP host:port) |
| PostgreSQL | localhost:5432               |
| Adminer (DB UI) | http://localhost:8081 (`--profile dev` only) |
| Mosquitto  | localhost:1883 (`--profile mqtt` only) |
| ngrok dashboard | http://localhost:4040 (`--profile phone` only) |

## Database UI (Adminer)

Browse tables in the browser at **http://localhost:8081** (requires `--profile dev`).

| Setting | Value |
|---------|--------|
| System | PostgreSQL |
| Server | `postgres` (pre-filled) |
| Username | `fleet` |
| Password | `fleet` |
| Database | `fleet` |

Tables: `Organization`, `User`, `Vehicle`, `VehicleLiveState`, `LocationHistory`.

## Accounts and login

**New organization:** register at **http://localhost:8080/register** (organization name + admin email/password). One admin account per organization — add trackers from the Vehicles page after sign-in.

**Demo fleet** (after seed):

| Role   | Email                     | Password    |
|--------|---------------------------|-------------|
| Admin  | `admin@demo-fleet.local`  | `Admin123!` |
| Viewer | `viewer@demo-fleet.local` | `Viewer123!` |

Each organization can track up to **100 vehicles** (configurable via `maxVehicles`). Dashboard APIs require a JWT; GPS ingest still uses `INGEST_TOKEN` when set.

## Add trackers (Vehicles page)

Admins use **Add tracker** on `/vehicles` to register:

| Type | Device ID pattern | Client configures |
|------|-------------------|-------------------|
| AIS-140 VLT | `ais140-<15-digit-IMEI>` | TCP host + port on VLT (MH SOP) |
| OwnTracks phone | `phone-<tid>` | HTTP URL (ngrok) or MQTT broker (Tailscale/LAN) |

Set these in `backend/.env` so setup instructions show the correct public endpoints:

- `PUBLIC_AIS140_TCP_HOST` / `PUBLIC_AIS140_TCP_PORT` — VLT primary server
- `PUBLIC_OWTRACKS_HTTP_URL` — e.g. `https://your-ngrok-domain/api/v1/ingest/owntracks`
- `PUBLIC_OWTRACKS_MQTT_HOST` / `PUBLIC_OWTRACKS_MQTT_PORT` — Mosquitto (use Tailscale IP on mobile data)

Optional: `DEFAULT_ORG_ID` for legacy OwnTracks auto-register to the demo org only.

> Dev only — do not enable the `dev` profile on production servers.

Seeded vehicles (device IDs must match ingest payloads):

| Vehicle      | deviceId                    | Use case              |
|--------------|-----------------------------|-----------------------|
| My Phone     | `phone-AT`                  | OwnTracks `tid: AT`   |
| Test Phone   | `phone-001`                 | README curl example   |
| AIS-140 Demo | `ais140-888888888888999`    | Maharashtra SOP TCP (`AIS140_DEMO_IMEI`) |

## Local Development (without Docker)

Use **npm only** for local dev — do not run `docker compose` backend/frontend at the same time (they also bind ports **3000** and **5000** and will conflict).

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| WebSocket | ws://localhost:3000/ws?token=`JWT` |
| Frontend dev (Vite) | http://localhost:5173 |
| AIS-140 TCP | localhost:5000 |

Restart the frontend dev server after changing `frontend/gps-tracker-for-cars/.env` (Vite reads env at startup).

### Backend

```bash
cd backend
cp .env.example .env
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

Open **http://localhost:5173** (not 3000 — that port is the backend).

## OwnTracks HTTP Setup (ngrok in Docker)

1. Create a free account at [ngrok.com](https://ngrok.com), reserve a static domain, and copy your authtoken into `backend/.env`:

   ```env
   NGROK_AUTHTOKEN=your_token_here
   NGROK_DOMAIN=your-reserved-domain.ngrok-free.app
   ```

2. Start the stack with the phone profile (detached/background):

   ```bash
   docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile phone up -d --build
   ```

   Or on Windows: `.\compose.ps1 --profile phone up -d --build`

3. The public HTTPS URL is fixed and does not change on restart (matches `NGROK_DOMAIN` in `backend/.env`):

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
   - If `INGEST_TOKEN` is set in `backend/.env`, use **Bearer** auth or HTTP Basic (password = token).

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

## AIS-140 TCP Setup (Maharashtra SOP)

AIS-140 VLT devices connect to your server over **raw TCP** and send `$NMP` (normal), `$EPB` (emergency), or `$HLP` (health) packets. The adapter at `backend/src/trackers/car/ais140-mh.adapter.ts` maps IMEI → `deviceId: ais140-<15-digit-IMEI>`.

### Local test (no ngrok)

With backend running and `AIS140_TCP_ENABLED=true`:

```bash
cd backend
npm run test:ais140
```

Send a sample packet (PowerShell):

```powershell
$body = '$NMP,ABCD01A,1.6.5,NR,6,L,888888888888999,MH01P80000,1,24032019,060122,29.7599630,N,77.6277844,E,022.5,320.55*XX'
# Replace *XX with correct checksum — use npm run test:ais140 to verify parser
```

Or use netcat / `nc` on Linux/macOS:

```bash
echo '$NMP,ABCD01A,1.6.5,NR,6,L,888888888888999,MH01P80000,1,24032019,060122,29.7599630,N,77.6277844,E,022.5,320.55,...*CC' | nc localhost 5000
```

The map at http://localhost:8080/map should update when the seeded IMEI matches.

### ngrok TCP (pre-production)

1. Reserve a **TCP address** in the ngrok dashboard (paid plan).
2. Add to `backend/.env`:

   ```env
   NGROK_AUTHTOKEN=your_token
   NGROK_TCP_ADDRESS=1.tcp.in.ngrok.io:21234
   ```

3. Start with AIS-140 profile:

   ```bash
   docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile ais140 up -d --build
   ```

4. Configure each VLT device:
   - **Server host:** hostname from `NGROK_TCP_ADDRESS` (e.g. `1.tcp.in.ngrok.io`)
   - **Port:** port from `NGROK_TCP_ADDRESS` (e.g. `21234`)
   - **Protocol:** TCP

5. Register each vehicle in the database with `deviceId: ais140-<IMEI>` before devices connect.

> For production, replace ngrok with a VPS static public IP on port `5000` — no parser changes needed.

### Onboarding client vehicles

| Field in DB | Value |
|-------------|-------|
| `deviceId` | `ais140-<15-digit-IMEI>` |
| `vehicleNumber` | Client VRN (e.g. `MH01P80000`) |
| `vehicleName` | Friendly label |

Swap `AIS140_DEMO_IMEI` in `backend/.env` when the client's real IMEI arrives, then re-seed or upsert the vehicle row.

## OwnTracks MQTT Setup (optional)

Use this when the OwnTracks app is in **MQTT** mode instead of HTTP. The HTTP/ngrok workflow above is unchanged — both can run at the same time.

1. Enable in `backend/.env`:

   ```env
   OWNTRACKS_MQTT_ENABLED=true
   ```

2. Start Mosquitto with the mqtt profile:

   ```bash
   docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile mqtt up -d --build
   ```

   For HTTP + MQTT together:

   ```bash
   docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile phone --profile mqtt up -d --build
   ```

   Or on Windows: `.\compose.ps1 up-phone-mqtt`

3. In the **OwnTracks** app:
   - Preferences → Connection → Mode: **MQTT**
   - Host / port (see table below)
   - No TLS or auth (matches current Mosquitto config)
   - Topic: default `owntracks/<user>/<device>` (backend listens on `owntracks/#`)
   - Tracker ID (`tid`): **AT** → seeded vehicle `phone-AT`

   | Scenario | Broker host in OwnTracks |
   |----------|--------------------------|
   | Same Wi‑Fi | Laptop LAN IP (e.g. `192.168.1.5`), port `1883` |
   | Mobile data | Laptop **Tailscale IP** — install [Tailscale](https://tailscale.com) separately on laptop and phone |

   > The HTTP ngrok URL does **not** work for MQTT. Point OwnTracks at Mosquitto directly (LAN or Tailscale).

4. Send a manual location — the map at http://localhost:8080/map should update live.

5. Verify backend subscribed:

   ```bash
   docker compose logs backend | findstr MQTT
   ```

   Expected: `MQTT subscribed to owntracks/#`

### Local test (mosquitto_pub)

```bash
docker compose --profile mqtt up -d backend
mosquitto_pub -h localhost -t "owntracks/user/phone" -m '{"_type":"location","lat":18.52,"lon":73.85,"vel":30,"cog":90,"tst":1718181818,"tid":"AT"}'
```

OwnTracks (or any publisher) sends the same JSON to topic `owntracks/<user>/<device>`. The MQTT plugin reuses `owntracks.adapter.ts`.

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
| POST | `/api/v1/auth/login` | Sign in (JWT) |
| POST | `/api/v1/auth/register` | Create organization + admin user |
| GET | `/api/v1/vehicles` | List vehicles |
| POST | `/api/v1/vehicles` | Register tracker (admin only) |
| GET | `/api/v1/tracker-setup` | Public connection settings for setup UI |
| GET | `/api/v1/vehicles/:id` | Vehicle detail |
| GET | `/api/v1/vehicles/:id/live` | Live state |
| GET | `/api/v1/vehicles/:id/history?start=&end=` | Track history (ISO dates) |
| POST | `/api/v1/gps/location` | Generic GPS ingest |
| POST | `/api/v1/ingest/owntracks` | OwnTracks HTTP ingest |
| TCP | `:5000` | AIS-140 Maharashtra SOP ingest (`AIS140_TCP_ENABLED`) |
| WS | `/ws` | Realtime location/status events |

## Environment Variables

Configuration is split across two files for independent deployment:

| File | Used by |
|------|---------|
| [`backend/.env.example`](backend/.env.example) | Backend API, Docker Compose profiles (ngrok, Adminer) |
| [`frontend/gps-tracker-for-cars/.env.example`](frontend/gps-tracker-for-cars/.env.example) | Frontend build (Vite) |

Copy each example to `.env` in the same directory and edit as needed.

### Backend (`backend/.env`)

- `DATABASE_URL` — PostgreSQL connection string (local dev; Docker overrides in compose)
- `JWT_SECRET` / `JWT_EXPIRES_IN` — dashboard auth tokens
- `DEFAULT_ORG_ID` — org for legacy OwnTracks auto-register (dev)
- `PUBLIC_AIS140_TCP_HOST` / `PUBLIC_AIS140_TCP_PORT` — shown in AIS-140 setup instructions
- `PUBLIC_OWTRACKS_HTTP_URL` — OwnTracks HTTP ingest URL shown to users
- `PUBLIC_OWTRACKS_MQTT_HOST` / `PUBLIC_OWTRACKS_MQTT_PORT` — MQTT broker shown to users
- `INGEST_TOKEN` — optional auth for ingest endpoints
- `AUTO_REGISTER_OWTRACKS_PHONES` — auto-create `phone-<tid>` vehicles on first OwnTracks ingest (default `true`)
- `NGROK_AUTHTOKEN` — required for ngrok containers (`--profile phone` or `--profile ais140`)
- `NGROK_DOMAIN` — reserved HTTP domain for OwnTracks (`--profile phone`)
- `NGROK_TCP_ADDRESS` — reserved TCP host:port for AIS-140 (`--profile ais140`)
- `AIS140_TCP_ENABLED` — enable TCP listener (default `true` in Docker)
- `AIS140_TCP_PORT` — TCP listen port (default `5000`)
- `AIS140_DEMO_IMEI` — IMEI used in seed for demo AIS-140 vehicle
- `OFFLINE_THRESHOLD_SEC` — seconds before a vehicle is marked offline (default 300)
- `OWNTRACKS_MQTT_ENABLED` — enable MQTT subscriber plugin (requires `--profile mqtt`)
- `RUN_SEED` — seed database on container start (default `true`)
- `ADMINER_PORT` — Adminer UI port (default `8081`, `--profile dev` only)

### Frontend (`frontend/gps-tracker-for-cars/.env`)

- `VITE_API_URL` / `VITE_WS_URL` — must be reachable from the **browser** (use `localhost:3000`, not Docker service names)

### Docker Compose

Load both env files when running compose (or use `compose.ps1` / `compose.sh`):

```bash
docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env up --build
```

### Deployment

| Deploy target | Env file | Key production values |
|---------------|----------|-------------------------|
| Backend (VPS/container) | `backend/.env` | `DATABASE_URL`, `INGEST_TOKEN`, `CORS_ORIGINS` (frontend origin URL) |
| Frontend (static/build) | `frontend/gps-tracker-for-cars/.env` | `VITE_API_URL`, `VITE_WS_URL` pointing to public backend (baked in at build) |
| Local Docker | both via `--env-file` | `localhost:3000` for VITE vars (browser reaches host, not Docker DNS) |

## Verification Checklist

1. `docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env up --build` — core services start (no Mosquitto; AIS-140 TCP on port 5000)
2. `docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile phone up --build` — ngrok HTTP starts for OwnTracks
3. `docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile ais140 up --build` — ngrok TCP forwards to port 5000
4. `docker compose --env-file backend/.env --env-file frontend/gps-tracker-for-cars/.env --profile mqtt up --build` with `OWNTRACKS_MQTT_ENABLED=true` in `backend/.env` — Mosquitto starts; backend logs MQTT subscribe
5. `curl http://localhost:3000/health` — returns `{ "status": "ok" }`
6. `curl http://localhost:3000/api/v1/vehicles` — returns seeded vehicles including `ais140-*`
7. `npm run test:ais140` (in `backend/`) — parser unit tests pass
8. TCP `$NMP` packet to `localhost:5000` — marker moves on `/map`
9. OwnTracks → ngrok → `/api/v1/ingest/owntracks` — live updates (HTTP)
10. OwnTracks MQTT or `mosquitto_pub` with `tid: AT` — live updates on `/map`
11. History endpoint returns points for playback page

## Troubleshooting

### Frontend won't open (http://localhost:8080)

Check which containers are running:

```powershell
.\compose.ps1 ps
```

You should see `postgres`, `backend`, and `frontend` all **Up**. If only profile services (`ngrok`, `mosquitto`, `adminer`) are running, the core stack is down.

**Fix:** start the full stack (not individual service names):

```powershell
.\compose.ps1 up-phone-mqtt
```

Or for core services only:

```powershell
.\compose.ps1 up -d --build
```

Inspect crash logs:

```powershell
.\compose.ps1 logs core
```

### Always use the compose wrapper

Bare `docker compose` commands skip `--env-file` loading. Use `.\compose.ps1` (Windows) or `./compose.sh` (Linux/macOS) for all compose operations:

| Preset / command | What it does |
|------------------|--------------|
| `.\compose.ps1 up-phone-mqtt` | Start core + ngrok + Mosquitto |
| `.\compose.ps1 ps` | List containers with env files loaded |
| `.\compose.ps1 logs core` | Tail logs for postgres, backend, frontend |

### Port conflicts

If a core container exits immediately, check whether ports are already in use:

```powershell
netstat -ano | findstr "8080 3000 5432"
```

Stop the conflicting process or change the port mapping in `docker-compose.yml`.

### OwnTracks HTTP 404 (phone queue growing)

OwnTracks logs `HTTP request failed. Status: 404` when the backend rejects the location. Common causes:

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTTP 404, queue growing | Unknown `phone-<tid>` | Set `tid` to `AT`, or keep `AUTO_REGISTER_OWTRACKS_PHONES=true` (default) |
| HTTP 401 | Missing/wrong Bearer token | OwnTracks → HTTP headers: `Authorization: Bearer <INGEST_TOKEN>` |
| Connection refused / timeout | ngrok or backend down | `.\compose.ps1 --profile phone up -d --build` |
| Works on Wi‑Fi only | Laptop/ngrok offline on mobile data | Keep laptop + ngrok running for HTTP ingest |

**OwnTracks HTTP checklist** (one-time phone config):

- Mode: **HTTP**
- URL: `https://<NGROK_DOMAIN>/api/v1/ingest/owntracks` (e.g. `https://intense-elf-lively.ngrok-free.app/api/v1/ingest/owntracks`)
- HTTP header: `Authorization: Bearer <INGEST_TOKEN>` (if set in `backend/.env`)
- Tracker ID (`tid`): any value works with auto-register; `AT` matches the seeded vehicle

**Smoke-test after starting ngrok:**

```powershell
.\scripts\test-owntracks-ingest.ps1
.\scripts\test-owntracks-ingest.ps1 -Tid ZZ
```

Expect `PASS: OwnTracks HTTP ingest accepted (200 + [])`.
