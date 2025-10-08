# Authentication Server

Simple HTTP server for authenticating ESP32 devices based on SRAM PUF-derived tokens.

## 🚀 Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:8080` (and all network interfaces)

## 🧪 Testing

**Terminal 1:** Start server
```bash
npm start
```

**Terminal 2:** Run tests
```bash
node test_auth.js
```

Or test manually:
```bash
# Health check (no auth)
curl http://localhost:8080/health

# Try authentication (valid token)
curl -H "Authorization: Bearer c7cea8e27fee7d356cdf24a388c5757c802b014d28c8a13a17cccd49aac506a3" \
     http://localhost:8080/

# Try with invalid token
curl -H "Authorization: Bearer invalid_token" \
     http://localhost:8080/
```

## 📡 API Endpoints

### `GET /`
Authenticate device with Bearer token

**Request:**
```bash
curl -H "Authorization: Bearer <your_token>" http://localhost:8080/
```

**Response (success):**
```json
{
  "authenticated": true,
  "deviceId": "ESP32_001",
  "description": "Test Device 1",
  "message": "ESP32_001 authenticated successfully"
}
```

### `GET /health`
Health check (no authentication required)

```bash
curl http://localhost:8080/health
```

### `GET /debug/devices`
List registered devices (debug only)

```bash
curl http://localhost:8080/debug/devices
```

### `GET /debug/stats`
Show authentication statistics

```bash
curl http://localhost:8080/debug/stats
```

## 🔧 Configuration

### Option 1: config.js (Default)
Edit `config.js` to add your device tokens:

```javascript
apiKeys: {
    'your_token_here': {
        deviceId: 'ESP32_XXX',
        description: 'Your device',
        registered: '2024-10-07'
    },
}
```

### Option 2: Environment Variables
Create `.env` from `env.example`:

```bash
PORT=8080
NODE_ENV=production
DEBUG_ENDPOINTS=false  # Disable debug endpoints in production
LOG_ATTEMPTS=true
```

## 🔑 Adding New Devices

1. Collect measurements from ESP32
2. Generate token:
   ```bash
   cd ../../tools/puf-challenge-generator
   python3 pufchallenge.py -i measurements.txt -v
   ```
3. Copy token to `config.js`
4. Restart server

## 📊 Monitoring

Watch logs in real-time:
```
✅ SUCCESS: ESP32_001 authenticated
  ├─ Description: Test Device 1
  ├─ Token: c7cea8e2...aac506a3
  └─ Total successful: 5

❌ FAILED: Invalid/unknown token
  ├─ Token received: abc12345...xyz98765
  ├─ Reason: Device not registered
  └─ Total failed attempts: 2
```

Check statistics:
```bash
curl http://localhost:8080/debug/stats
```

## 🐛 Troubleshooting

### Server doesn't start
→ Port already in use? Change PORT in env.example
→ Check: `lsof -ti:8080`

### ESP32 can't connect
→ Server must listen on 0.0.0.0 (already configured)
→ Check firewall settings
→ Test from ESP32's network: `curl http://YOUR_IP:8080/health`

### Authentication always fails
→ Check token in config.js matches ESP32 output
→ Verify PBKDF2_ITERATIONS = 10000 in both
→ Use verification tools: `../../tools/verification/`

---

**See main README.md for complete documentation**
