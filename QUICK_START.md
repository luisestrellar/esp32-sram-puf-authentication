# 🚀 Quick Start Guide

Get your ESP32 authenticating with SRAM PUF in 30 minutes!

---

## Terminal Setup

**This guide uses multiple terminal windows for clarity.**

I recommend opening **3 terminals** and labeling them:

```
┌─────────────────────────────────────────────────────────┐
│ Terminal 1: Server Management                           │
│ → Start/stop Docker containers                          │
│ → Restart servers after config changes                  │
│ → Always in: server/                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Terminal 2: Server Logs (Optional)                      │
│ → Monitor uploads and authentication in real-time       │
│ → See what's happening on the server                    │
│ → Always in: server/                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Terminal 3: Tools & Analysis                            │
│ → Generate PUF challenges                               │
│ → Download measurements                                 │
│ → Run analysis scripts                                  │
└─────────────────────────────────────────────────────────┘
```

**All commands show full paths from repository root!**

---

## Prerequisites

### Hardware
- ESP32 development board (WROOM-32, WROVER-B, or ESP32-S)
- USB cable
- WiFi network (2.4 GHz)

### Software

**Required:**
- [Arduino IDE](https://www.arduino.cc/en/software) with [ESP32 support](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)
- [Python 3.7+](https://www.python.org/downloads/) (for PUF challenge generation)

**Server (choose one):**
- **Option A:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended - includes everything)
- **Option B:** [Node.js](https://nodejs.org/) v14+ (if you prefer manual setup)

**Note:** If you use Docker, you don't need Node.js installed!

---

## Step 1: Setup Measurement Server

Choose **one** deployment method:

### Option A: Docker (Recommended)

**Terminal 1 (Server Management):**
```bash
# Navigate to server directory (from repository root)
cd server

# Start servers in background
docker compose up -d --build

# Note: Older Docker versions use 'docker-compose' (with hyphen)
# If you get "command not found", try: docker-compose ps
```

**Verify servers are running:**
```bash
# In Terminal 1 (still in server/)
docker compose ps
```

You should see both services with status "Up":
```
NAME                   IMAGE                       COMMAND                  SERVICE              CREATED         STATUS                            PORTS
sram-puf-auth          server-auth-server          "docker-entrypoint.s…"   auth-server          9 seconds ago   Up 8 seconds (health: starting)   0.0.0.0:8080->8080/tcp
sram-puf-measurement   server-measurement-server   "docker-entrypoint.s…"   measurement-server   9 seconds ago   Up 8 seconds (health: starting)   0.0.0.0:3000->3000/tcp
```

Both servers are now running:
- Authentication Server: http://localhost:8080
- Measurement Server: http://localhost:3000

**Default credentials (for testing):**
- Username: `esp`
- Password: `password`

To change credentials, edit `docker-compose.yml` and restart:
```bash
# Edit environment variables in docker-compose.yml
nano docker-compose.yml

# Look for ESP_USERNAME and ESP_PASSWORD, then:
docker compose down
docker compose up -d
```

**Useful commands (Terminal 1):**
```bash
# Still in server/
docker compose ps                    # Check status
docker compose logs -f               # View all logs
docker compose down                  # Stop servers
docker compose restart auth-server   # Restart one service
```

**Done!** Skip to Step 2.

---

### Option B: Manual Setup

**Terminal 1 (Measurement Server):**
```bash
# From repository root
cd server/measurement-server

# Create .env file from template
cp env.example .env

# Optional: Edit credentials
# nano .env

# Install and start
npm install
npm start
```

Server runs on http://localhost:3000

**Default credentials:** `esp` / `password` (see `.env` file)

**Terminal 2 (Authentication Server):**
```bash
# From repository root (new terminal!)
cd server/auth-server
npm install
npm start
```

Server runs on http://localhost:8080

---

## Step 2: Collect SRAM Measurements

### Configure ESP32

1. Open `hardware/sram_reader_with_upload.ino` in Arduino IDE

2. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   ```

3. Update server URL (replace with your computer's IP):
   ```cpp
   const char* MEASUREMENT_SERVER_URL = "http://192.168.1.XXX:3000/api/sram";
   ```
   
   **Find your IP:**
   - **macOS/Linux:** `ifconfig | grep "inet "`
   - **Windows:** `ipconfig`

4. Set ESP ID (use 1 for your first device):
   ```cpp
   const int ESP_DEVICE_ID = 1;
   ```

5. **Optional:** Use 128 bytes for faster collection:
   ```cpp
   #define SRAM_READ_SIZE 128  // Sufficient for authentication
   ```

### Upload & Collect

1. Select your ESP32 board: **Tools → Board → ESP32 Dev Module**
2. Upload the sketch
3. Open Serial Monitor (115200 baud)

You should see:
```
WiFi connected!
Uploading measurement...
✓ Upload successful!
```

**Monitor uploads live (if using Docker):**

**Terminal 2 (Server Logs):**
```bash
# From repository root
cd server
docker compose logs measurement-server -f
```

You'll see each upload in real-time:
```
sram-puf-measurement  | [2025-10-08T11:42:44.795Z] POST /api/sram
sram-puf-measurement  |   [DATA] ESP ID: 1
sram-puf-measurement  |   [DATA] Data Length: 256 chars
sram-puf-measurement  |   [SUCCESS] Stored measurement ID: 1
sram-puf-measurement  | [2025-10-08T11:42:56.761Z] POST /api/sram
sram-puf-measurement  |   [DATA] ESP ID: 1
sram-puf-measurement  |   [DATA] Data Length: 256 chars
sram-puf-measurement  |   [SUCCESS] Stored measurement ID: 2
```

Note: Press `Ctrl+C` if you want to stop viewing logs.

### Power Cycle for Measurements

**CRITICAL:** SRAM PUF only changes on complete power loss!

```
❌ Reset button → Same SRAM values
✅ Disconnect USB → Wait 2 seconds → Reconnect → New values
```

**Collect measurements:**
1. Disconnect USB cable
2. Wait 2 seconds
3. Reconnect USB
4. Wait for upload confirmation
5. Repeat as many times as you want (minimum 30 recommended)

**Why 30+?** More measurements = better stable bit identification = higher authentication success rate. You can collect 50, 100, or more for even better results.

See the success rate table in Step 5 for detailed statistics.

---

## Step 3: Download & Generate PUF Challenge

### Download Measurements

**Terminal 3 (Tools):**
```bash
# Download measurements for ESP ID 1
curl -u "esp:password" http://localhost:3000/api/export/1 -o measurements.txt

# Or with your network IP (if server is remote)
# curl -u "esp:password" http://192.168.1.155:3000/api/export/1 -o measurements.txt
```

**Credentials:** See `server/measurement-server/env.example` (default: `esp` / `password`)

### Generate PUF Challenge & API Token

**Terminal 3:**
```bash
# Navigate to tools
cd tools/puf-challenge-generator

# Generate challenge from measurements
python pufchallenge.py -i ../../measurements.txt
```

**Output:**
```
[ESP32]  PUF Challenge: f3f3dfffefbabffff3fbff7fb6efbeff...
[Server] API-Token:     9b6fa081f05bc4b197f4ff7e79f01...
```

**Copy both values!** You'll need them in the next steps.

---

## Step 4: Configure Authentication

### Configure Server

**Terminal 3 (Tools):**
Edit config file (use your preferred editor):
```bash
# From anywhere - use full path
vim auth-server/config.js
# Or: nano, code, etc.
```

**Add your API token:**
```javascript
const apiKeys = {
    '9b6fa081f05bc4b197f4ff7e79f01...': {  // Your API token from Step 3
        deviceId: 'ESP32_001',
        description: 'My first ESP32',
        registered: '2024-01-15'
    },
};
```

**Apply changes:**

**Terminal 1 (Server Management):**
```bash
# In ./server/
docker compose restart auth-server

# If running manually, the server auto-reloads (with nodemon)
```

**Note:** The config.js file is mounted as a volume in Docker, so you can edit it directly without rebuilding the container!

### Configure ESP32

1. Open `hardware/esp32_authenticate_simple.ino`

2. Update configuration:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   const char* AUTH_SERVER_URL = "http://192.168.1.155:8080/";
   
   // Paste your PUF Challenge here:
   const char* pufChallenge = "f3f3dfffefbabffff3fbff7fb6efbeff...";
   ```

3. Upload to ESP32

---

## Step 5: Test Authentication

Open Serial Monitor (115200 baud). You should see:

```
========================================
ESP32 RTC SLOW Memory PUF Authentication
========================================

[1/4] Reading RTC SLOW Memory...
      Address: 0x50000000
      Size: 128 bytes
      Expected stability: ~94% (thesis)

[2/4] Extracting PUF bits...
      Challenge: ff2ee7f75f7effeffefbfffbe7ffe5fe
      Extracted bits: 10101011100110001011101000100101011111101011110011000001101011000100011000100000000000001010110101110001100
      Bit count: 107

[3/4] Generating PBKDF2 key...
      Iterations: 10000
      Derived Key: 260f1105f729c7afcd71b62eacb5c0b94fcca4c16f6be36c4b2a297a975d358a

[4/4] Connecting to WiFi...
      SSID: [censored]
......
      Connected!
      IP: 192.168.1.XXX

[AUTH] Attempting authentication...
      Server: http://192.168.1.XXX:8080/
[INFO] Bearer Token: Bearer 260f1105f729c7afcd71b62eacb5c0b94fcca4c16f6be36c4b2a297a975d358a
[INFO] HTTP Response Code: 200
[INFO] Response: {"authenticated":true,"deviceId":"ESP32_001","description":"Test Device 1","message":"ESP32_001 authenticated successfully","timestamp":"2025-10-08T11:56:49.581Z"}

✓ AUTHENTICATION SUCCESSFUL!

========================================
Done. Reset ESP32 to try again.
========================================
```

**Monitor authentication live (if using Docker):**

**Terminal 2 (Server Logs):**

If you still have the logs from the measurement server running, press `Ctrl+C` to stop viewing logs.

```bash
# From repository root
cd server
docker compose logs auth-server -f
```

You'll see each authentication attempt:
```
sram-puf-auth  | [2025-10-08T11:51:22.641Z] GET / from 192.168.65.1
sram-puf-auth  |   ✅ SUCCESS: ESP32_001 authenticated
sram-puf-auth  |   ├─ Description: Test Device 1
sram-puf-auth  |   ├─ Token: 260f1105...975d358a
sram-puf-auth  |   └─ Total successful: 1
sram-puf-auth  |
sram-puf-auth  | [2025-10-08T11:50:56.018Z] GET / from 192.168.65.1
sram-puf-auth  |   ✅ SUCCESS: ESP32_001 authenticated
sram-puf-auth  |   ├─ Description: Test Device 1
sram-puf-auth  |   ├─ Token: 260f1105...975d358a
sram-puf-auth  |   └─ Total successful: 2
sram-puf-auth  |
sram-puf-auth  | [2025-10-08T11:50:38.400Z] GET / from 192.168.65.1
sram-puf-auth  |   ❌ FAILED: Invalid/unknown token
sram-puf-auth  |   ├─ Token received: 458095b1...092a9d11
sram-puf-auth  |   ├─ Reason: Device not registered
sram-puf-auth  |   └─ Total failed attempts: 1
```

Press `Ctrl+C` to stop viewing logs.

---

**Success!** Your ESP32 is authenticating using SRAM PUF!

---

## Understanding Authentication Success Rates

The number of measurements you collect directly affects authentication reliability:

| Measurements Collected | Authentication Success Rate | Note |
|------------------------|----------------------------|------|
| 5 measurements | ~50% | Not recommended |
| 10 measurements | ~60% | Minimum for testing |
| 30 measurements | 100% | Recommended (tested with 10 auth attempts) |

**Key takeaway:** More measurements = better stable bit identification = higher success rate.

**Recommendation:** Collect at least 30 measurements for reliable authentication. More measurements (50-100+) will improve reliability further.

If authentication fails occasionally, collect more measurements and regenerate the PUF challenge.

---

## Troubleshooting

### Authentication Failed

**Most Common Cause: Not Enough Measurements**
- Collect 30+ measurements instead of 10-20
- Regenerate PUF challenge with more data
- See success rates table above

**Check PUF Challenge:**
- Verify you copied the complete challenge (no truncation)
- Ensure challenge matches the measurements used

**Verify PBKDF2 Settings:**
- Iterations must be **10000** in both ESP32 and Python
- Salt must match: `"ESP32-SRAM-PUF-Auth-v1"`

**Note:** `SRAM_READ_SIZE` can be 128 or 8192 bytes - both work for authentication. Use 8192 only if you plan to run analysis scripts on the measurements.

### WiFi Connection Failed

- Verify SSID and password (case-sensitive!)
- ESP32 only supports **2.4 GHz** WiFi (not 5 GHz)
- Check WiFi signal strength

### Cannot Connect to Server

- Verify server is running (`docker ps` or check terminal)
- Test server: `curl http://localhost:8080/health`
- Check firewall settings
- Verify IP address is correct

### Serial Monitor Shows Garbage

- Set baud rate to **115200**
- Select correct COM port
- Try unplugging and reconnecting ESP32

### Measurements Not Uploading

- Check server logs for errors
- Verify ESP_DEVICE_ID matches URL (`/api/export/1` → ID = 1)
- Test server endpoint:
  ```bash
  curl http://localhost:3000/health
  ```

---

## Next Steps

### Analyze PUF Quality

Check bit stability and randomness. Choose one method:

#### Option A: Virtual Environment (Recommended)

**Terminal 3 (Tools):**
```bash
# From repository root
cd tools/analysis

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate          # On macOS/Linux
# venv\Scripts\activate           # On Windows

# Install dependencies
pip install -r requirements.txt

# Analyze measurements
python hamming_analysis.py -i ../../measurements.txt -n ESP32_01 -c 1

# When done, deactivate virtual environment
deactivate
```

#### Option B: Global Installation

**Terminal 3 (Tools):**
```bash
# From repository root
cd tools/analysis

# Install dependencies globally
pip install -r requirements.txt

# Analyze measurements
python hamming_analysis.py -i ../../measurements.txt -n ESP32_01 -c 1
```

**Good PUF metrics:**
- Intra-device stability: >90%
- Hamming weight: ~50%

### Test Multiple Devices

If you have multiple ESP32s:

1. Collect measurements from each (use different ESP_DEVICE_ID: 2, 3, 4...)
2. Generate separate challenges for each
3. Add all API tokens to `config.js`
4. Compare uniqueness:
   ```bash
   python tools/analysis/compare_devices.py -d measurements/
   ```

**Good uniqueness:** ~50% Hamming distance between devices

### Add Security (Production)

This PoC uses HTTP for simplicity. For production:

- **Use HTTPS/TLS** instead of HTTP
- **Add replay protection** (nonce-based challenges)
- **Implement rate limiting** on authentication server
- **Enable key rotation** mechanism

See [README.md](README.md) → Security Considerations

---

## Optional: Testing & Development

### Test Servers Without Hardware

Want to verify servers work before connecting ESP32?

**Terminal 1:**
```bash
# From repository root
cd server/auth-server
npm start
```

**Terminal 2:**
```bash
# From repository root (new terminal!)
cd server/auth-server
node test_auth.js
```

Expected output:
```
✓ Health check passed
✓ Valid token authenticated
✗ Invalid token rejected (expected)
```

### Read SRAM Without Upload

Want to see raw SRAM data?

1. Flash `hardware/sram_reader_basic.ino`
2. Open Serial Monitor
3. See hexadecimal SRAM values

**Remember:** Power cycle (not reset) to see different values!

### Manual Analysis

Download and inspect measurements:

**Terminal 3 (or any terminal):**
```bash
# Get all measurements for device 1
curl -u "esp:password" http://localhost:3000/api/export/1

# Check server statistics
curl http://localhost:3000/api/stats
```

---

## Important Notes

- This is a **Proof-of-Concept** for learning and research
- **Not production-ready** - add security hardening before deployment
- SRAM PUF responses can vary with temperature (~10% at -20°C)
- **Power cycle required** - soft reset doesn't change SRAM values
- Minimum **30 measurements** recommended (more is better - 50-100+ for higher reliability)

---

## Learn More

- [README.md](README.md) - Complete documentation
- [STRUCTURE.md](STRUCTURE.md) - Repository organization
- [SALT_CONFIGURATION.md](SALT_CONFIGURATION.md) - Customize PBKDF2 salt
- [hardware/README.md](hardware/README.md) - ESP32-specific details
- [server/measurement-server/USAGE.md](server/measurement-server/USAGE.md) - API documentation

---

**Questions?** Open an issue on GitHub or check the troubleshooting docs!

Happy experimenting!
