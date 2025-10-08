# Repository Structure

This document explains what files are where and what they do.

---

## Directory Layout

```
ESP32-SRAM-PUF-Authentication/
├── README.md                          # Project overview and documentation
├── QUICK_START.md                     # Step-by-step setup guide
├── STRUCTURE.md                       # This file
├── SALT_CONFIGURATION.md              # PBKDF2 salt customization guide
├── LICENSE                            # MIT License
├── measurements/                      # Local measurement storage (gitignored)
│
├── docs/                              # Research documentation and images
│   └── images/                        # Research visualization images
│       ├── esp32_sramvisualisation.png    # 8KB SRAM memory layout
│       ├── esp32_biased.png               # Bit pattern analysis
│       ├── hamming_distance_table.png     # Inter-device uniqueness table
│       ├── esp32_sram_bitstability.png    # Long-term stability analysis
│       └── esp32_rolling.png              # Rolling Hamming distance
│
├── hardware/                          # ESP32 Arduino sketches
│   ├── sram_reader_basic.ino          # Read and display SRAM via serial
│   ├── sram_reader_with_upload.ino    # Read SRAM and upload to server
│   ├── esp32_authenticate_simple.ino  # Full PUF authentication
│   ├── config.h.example               # Configuration template (WiFi, servers, etc.)
│   ├── README.md                      # Hardware documentation
│   └── USING_CONFIG_H.md              # How to use config.h
│
├── server/                            # Backend services
│   ├── docker-compose.yml             # Run both servers with Docker
│   ├── README.md                      # Server documentation
│   │
│   ├── auth-server/                   # Authentication server (port 8080)
│   │   ├── app.js                     # Express server with token validation
│   │   ├── config.js                  # API keys (mounted as Docker volume)
│   │   ├── package.json               # Node.js dependencies
│   │   ├── test_auth.js               # Test script (no hardware needed)
│   │   ├── Dockerfile                 # Docker container definition
│   │   ├── env.example                # Environment configuration template
│   │   ├── README.md                  # Auth server documentation
│   │   └── ADD_DEVICE.md              # Guide for adding new devices
│   │
│   └── measurement-server/            # Measurement collection server (port 3000)
│       ├── index.js                   # Express server with REST API
│       ├── database.js                # SQLite database setup
│       ├── package.json               # Node.js dependencies
│       ├── env.example                # Configuration template
│       ├── Dockerfile                 # Docker container definition
│       └── USAGE.md                   # API documentation
│
└── tools/                             # Python utilities
    ├── README.md                      # Tools documentation
    │
    ├── puf-challenge-generator/       # Generate PUF challenges
    │   └── pufchallenge.py            # Identify stable bits, derive API token
    │
    ├── analysis/                      # PUF quality analysis
    │   ├── hamming_analysis.py        # Bit stability analysis
    │   ├── compare_devices.py         # Inter-device uniqueness
    │   ├── requirements.txt           # Python dependencies (numpy, matplotlib)
    │   └── venv/                      # Python virtual environment (gitignored)
    │
    └── verification/                  # Debug tools
        ├── verify_algorithm.py        # Verify PBKDF2 implementation
        ├── README.md                  # Verification guide
        └── DEBUGGING_MISMATCH.md      # Token mismatch debugging
```

---

## Component Purposes

### Hardware

**sram_reader_basic.ino**  
Reads RTC SLOW Memory and prints hex values via serial. No WiFi required. Good for learning what SRAM PUF looks like.

**sram_reader_with_upload.ino**  
Reads RTC SLOW Memory and uploads to measurement server via HTTP. Used to collect data for PUF challenge generation.

**esp32_authenticate_simple.ino**  
Full authentication client. Reads SRAM, extracts stable bits using PUF challenge, derives PBKDF2 token, and authenticates with server.

### Server

**auth-server (port 8080)**  
Validates ESP32 devices using PUF-derived API tokens. Stores allowed tokens in `config.js`.

**measurement-server (port 3000)**  
Collects and stores SRAM measurements in SQLite database. Provides API for uploading and exporting measurements.

### Tools

**puf-challenge-generator**  
Analyzes measurements to identify stable bits. Outputs PUF challenge (for ESP32) and API token (for server).

**analysis**  
Python scripts to analyze PUF quality: Hamming distance, Hamming weight, bit stability visualization.

**verification**  
Debug tools to verify PBKDF2 algorithm matches between ESP32 and Python.

---

## Key Files Explained

### Configuration Files

| File | Purpose |
|------|---------|
| `hardware/config.h.example` | Template for ESP32 configuration (WiFi, servers) |
| `server/auth-server/config.js` | API keys and device registry |
| `server/measurement-server/env.example` | Server credentials template |
| `server/docker-compose.yml` | Docker deployment configuration |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `QUICK_START.md` | Step-by-step setup guide |
| `STRUCTURE.md` | This file - repository organization |
| `SALT_CONFIGURATION.md` | PBKDF2 salt customization |
| `LICENSE` | MIT License |

### Research Images

| File | Purpose |
|------|---------|
| `docs/images/esp32_sramvisualisation.png` | 8KB SRAM memory layout visualization |
| `docs/images/esp32_biased.png` | Bit pattern analysis showing biased bits |
| `docs/images/hamming_distance_table.png` | Inter-device uniqueness comparison table |
| `docs/images/esp32_sram_bitstability.png` | Long-term stability analysis over time |
| `docs/images/esp32_rolling.png` | Rolling Hamming distance patterns |

### Server Code

| File | Purpose |
|------|---------|
| `auth-server/app.js` | HTTP server, validates Bearer tokens |
| `auth-server/config.js` | Device registry (API tokens) |
| `auth-server/test_auth.js` | Automated tests |
| `measurement-server/index.js` | HTTP server, stores measurements |
| `measurement-server/database.js` | SQLite setup and queries |

### ESP32 Code

All sketches use Arduino framework. Key differences:

| Sketch | WiFi | Server Upload | Authentication |
|--------|------|---------------|----------------|
| `sram_reader_basic.ino` | No | No | No |
| `sram_reader_with_upload.ino` | Yes | Yes | No |
| `esp32_authenticate_simple.ino` | Yes | No | Yes |

---

## Data Flow

```
1. Collect Measurements:
   ESP32 → sram_reader_with_upload.ino → Measurement Server → SQLite

2. Generate Challenge:
   SQLite → Export → pufchallenge.py → PUF Challenge + API Token

3. Configure:
   API Token → config.js
   PUF Challenge → esp32_authenticate_simple.ino

4. Authenticate:
   ESP32 → Read SRAM → Extract Bits → PBKDF2 → Auth Server → ✓
```

---

## File Dependencies

### ESP32 → Measurement Server
- Requires: WiFi credentials, server IP
- Uploads to: `POST /api/sram`

### Measurement Server → Tools
- Exports via: `GET /api/export/:id`
- Format: Hex strings (one per line)

### Tools → Auth Server
- Generates: API token
- Configure in: `config.js`

### ESP32 → Auth Server
- Requires: PUF challenge, WiFi, server IP
- Authenticates via: `GET /` with Bearer token

---

## Docker vs Manual Setup

### Docker Setup Uses:
- `server/docker-compose.yml` - Container orchestration
- `server/*/Dockerfile` - Container definitions
- Mounted volumes for config.js (no rebuild needed)
- Default credentials in docker-compose.yml

### Manual Setup Uses:
- `server/measurement-server/.env` - Credentials
- `server/auth-server/config.js` - API keys
- `npm` for dependency management
- `nodemon` for auto-reload

---

## Where to Find Things

**Want to...** | **Check here...**
--- | ---
Understand the project | `README.md`
Get started quickly | `QUICK_START.md`
Add a new ESP32 device | `server/auth-server/ADD_DEVICE.md`
Fix hardware issues | `hardware/README.md` (Troubleshooting section)
Customize PBKDF2 salt | `SALT_CONFIGURATION.md`
Use the measurement API | `server/measurement-server/USAGE.md`
Debug token mismatches | `tools/verification/DEBUGGING_MISMATCH.md`
Understand config.h | `hardware/USING_CONFIG_H.md`
Change server credentials | `server/README.md`
View research visualizations | `docs/images/` (5 research images)

---

**For workflows and step-by-step instructions, see [QUICK_START.md](QUICK_START.md)**
