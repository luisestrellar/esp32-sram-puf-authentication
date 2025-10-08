# Measurement Server Usage Guide

## Authentication

All API endpoints (except `/`) require **Basic Authentication**.

**Default credentials:**
- Username: `esp`
- Password: `password`

**Change in production:** Edit `env.example` and copy to `.env`

---

## API Endpoints

### 1. Health Check (No Auth)
```bash
curl http://localhost:3000/

# Response:
# {"status":"ok","service":"SRAM PUF Measurement Server",...}
```

### 2. Get All Measurements
```bash
# Get all measurements
curl -u "esp:password" http://localhost:3000/api/srams

# Limit results
curl -u "esp:password" "http://localhost:3000/api/srams?limit=10"

# Filter by ESP ID
curl -u "esp:password" "http://localhost:3000/api/srams?espid=1"
```

### 3. Get Statistics
```bash
curl -u "esp:password" http://localhost:3000/api/stats

# Shows: device count, first/last measurement per device
```

### 4. Export Measurements (for Analysis)
```bash
# Download measurements for ESP ID 1
curl -u "esp:password" http://localhost:3000/api/export/1 -o measurements.txt

# View in terminal
curl -u "esp:password" http://localhost:3000/api/export/1

# Different device
curl -u "esp:password" http://localhost:3000/api/export/2 -o esp2_data.txt
```

**Output format:** One hex string per line (perfect for Python analysis tools)

### 5. Store New Measurement (from ESP32)
```bash
curl -u "esp:password" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"espid":1,"data":"a3f5c2d8..."}' \
  http://localhost:3000/api/sram
```

### 6. Cleanup Old Data
```bash
# Delete measurements older than 30 days
curl -u "esp:password" \
  -X DELETE \
  "http://localhost:3000/api/sram/cleanup?days=30"
```

---

## Remote Access

If accessing from another computer on the network:

```bash
# Find your server's IP
# Server shows this on startup:
#   Network: http://192.168.1.155:3000

# Then use that IP
curl -u "esp:password" http://192.168.1.155:3000/api/export/1 -o measurements.txt
```

---

## Testing with curl

### Quick test sequence:
```bash
# 1. Check server is running
curl http://localhost:3000/
# Should return: {"status":"ok"}

# 2. Check authentication works
curl -u "esp:password" http://localhost:3000/api/stats
# Should return stats, not 401

# 3. Try wrong password
curl -u "esp:wrongpass" http://localhost:3000/api/stats
# Should return 401 Unauthorized

# 4. Export data
curl -u "esp:password" http://localhost:3000/api/export/1
# Should return hex strings (or empty if no data)
```

---

## Common Use Cases

### Workflow 1: Collect & Analyze
```bash
# 1. Collect 20 measurements (power-cycle ESP32 20 times)
#    Measurements auto-upload to server

# 2. Download for analysis
curl -u "esp:password" http://localhost:3000/api/export/1 -o measurements.txt

# 3. Generate challenge
cd ../../tools/puf-challenge-generator
python3 pufchallenge.py -i measurements.txt -v
```

### Workflow 2: Check Collection Progress
```bash
# How many measurements collected?
curl -u "esp:password" http://localhost:3000/api/stats | jq

# View last 5 measurements
curl -u "esp:password" "http://localhost:3000/api/srams?limit=5" | jq
```

### Workflow 3: Multiple Devices
```bash
# Export each device separately
curl -u "esp:password" http://localhost:3000/api/export/1 -o esp1.txt
curl -u "esp:password" http://localhost:3000/api/export/2 -o esp2.txt
curl -u "esp:password" http://localhost:3000/api/export/3 -o esp3.txt

# Compare devices
cd ../../tools/analysis
python3 compare_devices.py -d /path/to/exports/
```

---

## Troubleshooting

### "401 Unauthorized"
→ Check username and password match env.example
→ Username default: `esp`, password default: `password`

### "Connection refused"
→ Server not running? `npm start` in server/measurement-server/
→ Check port: Default 3000

### "Empty export file"
→ No measurements collected yet for that ESP ID
→ Check with: `curl -u "esp:password" http://localhost:3000/api/stats`

### Browser doesn't work
→ Browsers can't easily send Basic Auth
→ Use curl instead
→ Or browser extensions like "ModHeader" to add auth

---

## Database Location

Measurements stored in: `db/measurements.sqlite`

**View directly:**
```bash
sqlite3 db/measurements.sqlite "SELECT * FROM sram LIMIT 5;"
```

**Backup:**
```bash
cp db/measurements.sqlite db/backup_$(date +%Y%m%d).sqlite
```

---

## Configuration via .env

Create `.env` from `env.example`:
```bash
PORT=3000
DB_PATH=./db/measurements.sqlite
ESP_USERNAME=myuser      # Change default username
ESP_PASSWORD=mysecret    # Change default password
```

Then restart server: `npm start`

---

**For more details, see main README.md**
