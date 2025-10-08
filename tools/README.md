# Analysis & Tools

Python scripts for analyzing SRAM PUF quality and generating authentication challenges.

## Setup

### Using Virtual Environment (Recommended)

```bash
# From repository root
cd publish/tools

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate          # On macOS/Linux
# venv\Scripts\activate           # On Windows

# Install all dependencies
pip install -r analysis/requirements.txt

# You're ready to run scripts!
```

**To deactivate when done:**
```bash
deactivate
```

### Global Installation

```bash
# From repository root
cd publish/tools/analysis
pip install -r requirements.txt
```

**Note:** Virtual environments keep your system Python clean and avoid dependency conflicts.

---

## Tools Overview

### 1. PUF Challenge Generator

**Location:** `puf-challenge-generator/`

**Purpose:** Generate PUF challenge and API token from measurements

**Usage:**
```bash
# With venv activated
cd puf-challenge-generator
python pufchallenge.py -i ../../measurements.txt

# With verbose output
python pufchallenge.py -i ../../measurements.txt -v
```

**Output:**
- PUF Challenge (for ESP32 firmware)
- API Token (for authentication server)

---

### 2. Analysis Scripts

**Location:** `analysis/`

**Purpose:** Analyze PUF quality metrics (Hamming distance, stability, etc.)

**Available scripts:**
- `hamming_analysis.py` - Analyze single device stability
- `compare_devices.py` - Compare multiple devices for uniqueness

**Usage:**
```bash
# With venv activated
cd analysis

# Single device analysis
python hamming_analysis.py -i ../../measurements.txt -n ESP32_01 -c 1

# Compare multiple devices
python compare_devices.py -d ../../device_measurements/
```

---

### 3. Verification Tools

**Location:** `verification/`

**Purpose:** Debug authentication issues and verify PBKDF2 implementation

**Usage:**
```bash
# With venv activated
cd verification
python verify_algorithm.py
```

See [verification/README.md](verification/README.md) for details.

---

## Common Workflows

### First Time Setup

```bash
cd publish/tools
python3 -m venv venv
source venv/bin/activate
pip install -r analysis/requirements.txt
```

### Daily Use

```bash
# Activate venv
cd publish/tools
source venv/bin/activate

# Run your scripts
cd puf-challenge-generator
python pufchallenge.py -i ../../measurements.txt

# Deactivate when done
deactivate
```

### Update Dependencies

```bash
source venv/bin/activate
pip install --upgrade -r analysis/requirements.txt
deactivate
```

---

## Troubleshooting

### "No module named 'numpy'"

You forgot to activate the virtual environment:
```bash
cd publish/tools
source venv/bin/activate
```

### "python: command not found"

Try `python3` instead:
```bash
python3 -m venv venv
python3 pufchallenge.py -i measurements.txt
```

### Virtual environment conflicts

Delete and recreate:
```bash
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r analysis/requirements.txt
```

---

## What's Inside

- **analysis/** - Quality metrics and visualization scripts
  - `requirements.txt` - Numpy, Matplotlib dependencies
  
- **puf-challenge-generator/** - Generate challenges from measurements
  - No external dependencies (uses hashlib)
  
- **verification/** - Debug tools for algorithm verification
  - No external dependencies

---

**Tip:** Keep the virtual environment activated while working with multiple tools!

