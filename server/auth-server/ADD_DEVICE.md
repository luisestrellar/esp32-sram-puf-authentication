# Adding New Devices

Two methods to add new ESP32 devices to the authentication server:

## Method 1: Edit config.js (Recommended for PoC)

### With Docker

1. Edit `server/auth-server/config.js`:
   ```javascript
   const apiKeys = {
       'existing_token_123': {
           deviceId: 'ESP32_001',
           description: 'First device',
           registered: '2024-01-15'
       },
       'new_token_456': {  // Add new device here
           deviceId: 'ESP32_002',
           description: 'Second device',
           registered: '2024-01-20'
       },
   };
   ```

2. Restart only the auth server:
   ```bash
   cd server
   docker compose restart auth-server
   ```

3. Verify in logs:
   ```bash
   docker compose logs auth-server
   ```

**Note:** The `config.js` file is mounted as a volume, so changes take effect immediately after restart (no rebuild needed).

### Without Docker (Manual)

Just edit `config.js` - the server auto-reloads with nodemon.

---

## Method 2: Multiple Devices Workflow

### For Each New ESP32:

1. **Collect measurements:**
   ```bash
   # Flash sram_reader_with_upload.ino with unique ESP_DEVICE_ID
   # Power cycle at least 30 times (more is better)
   ```

2. **Download measurements:**
   ```bash
   curl -u "esp:password" http://localhost:3000/api/export/2 -o esp32_002.txt
   ```

3. **Generate PUF challenge:**
   ```bash
   cd tools/puf-challenge-generator
   python pufchallenge.py -i ../../esp32_002.txt
   ```

4. **Add to config.js:**
   ```javascript
   'generated_token_here': {
       deviceId: 'ESP32_002',
       description: 'Lab device 2',
       registered: '2024-01-20'
   },
   ```

5. **Restart server:**
   ```bash
   docker compose restart auth-server
   ```

---

## Production Note

For production deployments, consider:
- **Database backend** (PostgreSQL, MySQL) instead of config.js
- **API endpoint** for device registration
- **Web dashboard** for device management
- **Key rotation** mechanism
- **Revocation** capabilities

This PoC uses config.js for simplicity and educational purposes.

---

## Troubleshooting

### "Authentication failed" after adding device

1. Check config.js syntax (valid JavaScript)
2. Verify no trailing commas
3. Check server logs:
   ```bash
   docker compose logs auth-server
   ```

### Changes not applied

1. Verify you restarted the server:
   ```bash
   docker compose restart auth-server
   ```

2. Check if config.js has syntax errors:
   ```bash
   node -c server/auth-server/config.js
   ```

### Need to remove a device?

Just delete the entry from config.js and restart:
```javascript
const apiKeys = {
    // 'old_token': { ... },  // Commented out = disabled
    'active_token': { ... }
};
```

