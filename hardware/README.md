# ESP32 Hardware Code

Arduino sketches for ESP32 SRAM PUF authentication.

---

## Available Sketches

### sram_reader_basic.ino

Reads uninitialized RTC SLOW Memory and prints to serial monitor.

**Use for:** First test, understanding SRAM PUF  
**Requires:** Nothing - works standalone  
**WiFi:** No

### sram_reader_with_upload.ino

Reads SRAM and uploads to measurement server via WiFi.

**Use for:** Collecting measurements for challenge generation  
**Requires:** WiFi credentials, measurement server URL, device ID  
**WiFi:** Yes

### esp32_authenticate_simple.ino

Full authentication client using SRAM PUF.

**Use for:** Testing authentication, production deployments  
**Requires:** WiFi credentials, auth server URL, PUF challenge  
**WiFi:** Yes

---

## Quick Setup

### 1. Create config.h

```bash
cp config.h.example config.h
```

### 2. Edit config.h

Open `config.h` and update:
- `WIFI_SSID` and `WIFI_PASSWORD`
- Server URLs
- `PUF_CHALLENGE` (after generating it)
- `ESP_DEVICE_ID`

### 3. Upload Sketch

1. Open `.ino` file in Arduino IDE or PlatformIO
2. Select your ESP32 board (Tools → Board → ESP32 Dev Module)
3. Upload!

**Note:** Using `config.h` is optional. You can hardcode values directly in the sketch if you prefer.

See [USING_CONFIG_H.md](USING_CONFIG_H.md) for details.

---

## Hardware Requirements

**Minimum:**
- ESP32 development board (any variant)
- USB cable
- Computer with Arduino IDE

**Tested boards:**
- ESP32-WROOM-32
- ESP32-WROVER-B
- ESP32-S

**WiFi:** 2.4 GHz only (ESP32 doesn't support 5 GHz)

---

## Understanding SRAM PUF Power Cycles

### Why Power Cycle is Required

SRAM PUF relies on the physical startup state of memory cells when power is applied. Each cell has manufacturing variations that cause it to prefer 0 or 1 at power-on.

**Power cycle vs. Reset:**

| Action | SRAM Changes? | Use For |
|--------|---------------|---------|
| Power cycle (disconnect/reconnect) | Yes | New PUF measurement |
| Reset button (soft reset) | No | Restarting program |
| Upload new code | No | Testing code |
| Deep sleep wake | No* | Not reliable |

*RTC SLOW memory survives deep sleep on ESP32

### Correct Measurement Collection

```
For each measurement:
1. Disconnect USB cable
2. Wait 1-2 seconds (capacitors discharge)
3. Reconnect USB cable
4. SRAM is read and uploaded
5. Repeat for next measurement
```

**Common mistake:** Pressing reset button → SRAM doesn't change (stays powered)  
**Correct:** Disconnect power completely → SRAM resets

---

## Configuration

### What to Configure

| Setting | Purpose | Required For |
|---------|---------|--------------|
| `WIFI_SSID` | WiFi network name | All WiFi sketches |
| `WIFI_PASSWORD` | WiFi password | All WiFi sketches |
| `AUTH_SERVER_URL` | Authentication server | Auth sketch |
| `MEASUREMENT_SERVER_URL` | Measurement server | Upload sketch |
| `PUF_CHALLENGE` | Device PUF challenge | Auth sketch |
| `ESP_DEVICE_ID` | Device identifier | Upload sketch |
| `SRAM_ADDRESS` | Memory address | All sketches (default: 0x50000000) |
| `PBKDF2_SALT` | Key derivation salt | Auth sketch (default: "ESP32-SRAM-PUF-Auth-v1") |

### SRAM_READ_SIZE

**Don't define this in config.h!** Each sketch has the correct default:
- Reader sketches: 8192 bytes (full analysis)
- Auth sketch: 128 bytes (fast authentication)

Both sizes work for authentication. Use 8192 only if you plan to run Python analysis scripts.

---

## Compatibility

**Tested with:** ESP32 Arduino Core 3.x (recommended)

If using Core 2.x, the mbedTLS function names may differ. Update to Core 3.x for best results.

**Check version:** Arduino IDE → Tools → Board Manager → Search "esp32"

---

## Troubleshooting

### config.h not found
```bash
cp config.h.example config.h
```

### WiFi connection failed
- Check SSID and password (case-sensitive)
- Ensure 2.4 GHz WiFi (ESP32 doesn't support 5 GHz)
- Verify WiFi signal strength

### Authentication failed
- Verify PUF challenge matches the measurements
- Check PBKDF2 iterations = 10000
- Collect more measurements (30+ recommended)

### Serial monitor shows garbage
Set baud rate to 115200

### SRAM values always the same
**This is normal after soft reset!** SRAM only changes on complete power cycle:
- Reset button → SRAM stays the same (expected)
- Disconnect power → Wait → Reconnect → SRAM resets

### Cannot connect to server
- Verify server IP address
- Check that server is running
- Test: `curl http://YOUR_IP:3000/`

---

## Serial Monitor Examples

### sram_reader_basic.ino
```
========================================
ESP32 SRAM PUF Reader
========================================

[INFO] Reading uninitialized SRAM...
      Address: 0x50000000
      Size: 8192 bytes

[DATA] SRAM Contents (Hex):
a3f5c2e8b1... (8192 bytes of hex data)

Done! Power cycle for new measurement.
========================================
```

### esp32_authenticate_simple.ino
```
[1/4] Reading RTC SLOW Memory...
[2/4] Extracting PUF bits...
[3/4] Generating PBKDF2 key...
[4/4] Connecting to WiFi...

[AUTH] Attempting authentication...

✓ AUTHENTICATION SUCCESSFUL!
Device: ESP32_001
```

---

**For complete setup instructions, see [QUICK_START.md](../QUICK_START.md)**
