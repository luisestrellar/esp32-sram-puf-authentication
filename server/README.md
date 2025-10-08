# Server Components

Two Node.js servers for ESP32 SRAM PUF authentication and measurement collection.

## Quick Start

### With Docker (Recommended)

```bash
cd server
docker compose up -d --build
```

Both servers start automatically with default credentials.

### Without Docker (Manual)

**Terminal 1:**
```bash
cd measurement-server
cp env.example .env
npm install && npm start
```

**Terminal 2:**
```bash
cd auth-server
npm install && npm start
```

---

## Configuration

### Docker Setup

**Credentials:** Edit `docker-compose.yml`

```yaml
environment:
  - ESP_USERNAME=esp        # ← Change this
  - ESP_PASSWORD=password   # ← Change this
```

**Apply changes:**
```bash
docker compose down
docker compose up -d
```

### Manual Setup

**Credentials:** Edit `measurement-server/.env`

```bash
cd measurement-server
cp env.example .env
nano .env
```

Change values:
```env
ESP_USERNAME=esp        # ← Change this
ESP_PASSWORD=password   # ← Change this
```

**Apply changes:** Server auto-reloads with nodemon.

---

## Servers

### Authentication Server (Port 8080)

**Purpose:** Validates ESP32 devices using PUF-derived API tokens

**Endpoints:**
- `GET /health` - Health check
- `GET /` - Authenticate device (requires Bearer token)
- `GET /debug/stats` - View authentication statistics

**Configuration:**
- API Keys: Edit `auth-server/config.js`
- Mounted as Docker volume (no rebuild needed!)

**Add new device:**
1. Generate API token: `tools/puf-challenge-generator/pufchallenge.py`
2. Add to `config.js`
3. Restart: `docker compose restart auth-server`

See [auth-server/ADD_DEVICE.md](auth-server/ADD_DEVICE.md) for details.

### Measurement Server (Port 3000)

**Purpose:** Collects SRAM measurements from ESP32 devices

**Endpoints:**
- `GET /` - Health check
- `POST /api/sram` - Store measurement (auth required)
- `GET /api/export/:id` - Export measurements (auth required)
- `GET /api/stats` - Statistics (auth required)

**Authentication:** HTTP Basic Auth
- Username: `esp` (configurable)
- Password: `password` (configurable)

**Database:** SQLite stored in Docker volume `/data/measurements.sqlite`

See [measurement-server/USAGE.md](measurement-server/USAGE.md) for API documentation.

---

## Docker Commands

```bash
# Start servers
docker compose up -d

# View logs
docker compose logs -f
docker compose logs auth-server -f        # Specific service

# Check status
docker compose ps

# Restart server (e.g., after config.js change)
docker compose restart auth-server

# Stop servers
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

---

## Troubleshooting

### "Cannot find module 'express'"

Install dependencies:
```bash
cd auth-server
npm install
```

### "EADDRINUSE: Port already in use"

Another service is using the port:
```bash
# Check what's using the port
lsof -i :8080    # Auth server
lsof -i :3000    # Measurement server

# Change port in docker-compose.yml or .env
```

### "Database locked" errors

Stop and restart:
```bash
docker compose down -v
docker compose up -d --build
```

### Config changes not applied

**For config.js:**
```bash
docker compose restart auth-server
```

**For docker-compose.yml:**
```bash
docker compose down
docker compose up -d
```

---

## Development

Both servers use **nodemon** for auto-reload during development.

Edit files and they restart automatically (manual setup only).

For Docker: Changes to `config.js` are live (volume mounted), but code changes require rebuild.

---

## Production Notes

Before deploying to production:

1. **Change credentials** in `docker-compose.yml` or `.env`
2. **Add HTTPS/TLS** (use reverse proxy like nginx or Cloudflare Tunnel)
3. **Set NODE_ENV=production** (already set in docker-compose.yml)
4. **Backup database** regularly
5. **Monitor logs** for suspicious activity
6. **Add rate limiting** to prevent brute force

This PoC uses HTTP for simplicity. Add TLS for production!

---

## File Structure

```
server/
├── docker-compose.yml       # Docker orchestration
├── auth-server/
│   ├── app.js               # Main server
│   ├── config.js            # API keys (volume mounted!)
│   ├── package.json
│   ├── Dockerfile
│   └── test_auth.js         # Test script
└── measurement-server/
    ├── index.js             # Main server
    ├── database.js          # SQLite setup
    ├── package.json
    ├── env.example          # Configuration template
    ├── Dockerfile
    └── USAGE.md             # API documentation
```

---

**See also:**
- [measurement-server/USAGE.md](measurement-server/USAGE.md) - API documentation
- [auth-server/ADD_DEVICE.md](auth-server/ADD_DEVICE.md) - Adding new devices

