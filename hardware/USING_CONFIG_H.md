# Using config.h (Optional)

Configuration file for managing WiFi credentials and server URLs across sketches.

---

## What is config.h?

`config.h` is a header file where you store WiFi credentials, server URLs, and device-specific settings. It's **optional** - you can hardcode values directly in sketches if you prefer.

**Why use it?**
- Keep credentials separate from code
- Safe to share sketches (config.h is in .gitignore)
- Easy to manage multiple devices

**Works with:** Arduino IDE and PlatformIO

---

## How to Use

### 1. Create config.h

```bash
cd hardware/
cp config.h.example config.h
```

### 2. Edit Your Values

Open `config.h` and update:
```cpp
#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"
#define AUTH_SERVER_URL "http://192.168.1.100:8080/"
#define MEASUREMENT_SERVER_URL "http://192.168.1.100:3000/api/sram"
#define PUF_CHALLENGE "f3f3dfffefbabffff3fbff7fb6efbeff"
#define ESP_DEVICE_ID 1
```

### 3. Upload Sketch

The sketches automatically use `config.h` if it exists. No code changes needed!

---

## What Can You Configure?

| Setting | Purpose | Required For |
|---------|---------|--------------|
| `WIFI_SSID` | WiFi network name | All WiFi sketches |
| `WIFI_PASSWORD` | WiFi password | All WiFi sketches |
| `AUTH_SERVER_URL` | Authentication server | Auth sketch |
| `MEASUREMENT_SERVER_URL` | Measurement server | Upload sketch |
| `PUF_CHALLENGE` | Device PUF challenge | Auth sketch |
| `ESP_DEVICE_ID` | Device identifier | Upload sketch |
| `SRAM_ADDRESS` | Memory address | All sketches (optional) |
| `PBKDF2_SALT` | Custom salt | Auth sketch (optional) |

---

## Note on SRAM_READ_SIZE

**Don't define `SRAM_READ_SIZE` in config.h!**

Each sketch has the correct default:
- Authentication sketches: 128 bytes (fast)
- Reader sketches: 8192 bytes (full analysis)

Only define it if you have a specific reason.

---

## Multiple Devices

**Option 1:** Create separate config files:
```bash
cp config.h.example config_device1.h
cp config.h.example config_device2.h

# Before uploading, copy the right one:
cp config_device1.h config.h
```

**Option 2:** Use PlatformIO build flags:
```ini
[env:device1]
build_flags = -D WIFI_SSID=\"WiFi1\" -D ESP_DEVICE_ID=1

[env:device2]
build_flags = -D WIFI_SSID=\"WiFi2\" -D ESP_DEVICE_ID=2
```

---

## Troubleshooting

**Error: "config.h: No such file or directory"**
```bash
cp config.h.example config.h
```

**Error: "'WIFI_SSID' was not declared"**  
Check that you defined all required values in config.h.

---

**That's it!** Config.h is simple - just credentials in one place.

See [config.h.example](config.h.example) for a complete template.
