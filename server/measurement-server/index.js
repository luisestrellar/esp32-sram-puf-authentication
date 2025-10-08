/**
 * SRAM PUF Measurement Server
 * 
 * Collects and stores SRAM measurements from ESP32 devices
 * for later analysis (temperature effects, stability over time, etc.)
 */

const express = require('express');
const basicAuth = require('express-basic-auth');
const db = require('./database.js');

const app = express();
const port = process.env.PORT || 3000;

// Body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

/**
 * Health check endpoint (no auth required)
 */
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'SRAM PUF Measurement Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * Basic authentication middleware
 * Username: esp
 * Password: password (change in production!)
 */
app.use(basicAuth({
    users: { 
        [process.env.ESP_USERNAME || 'esp']: process.env.ESP_PASSWORD || 'password'
    },
    unauthorizedResponse: (req) => {
        return {
            error: 'Unauthorized',
            message: req.auth 
                ? `Invalid credentials: ${req.auth.user}` 
                : 'No credentials provided',
            expected: `Basic Auth with username=${process.env.ESP_USERNAME || 'esp'}`
        };
    }
}));

/**
 * Get all SRAM measurements
 */
app.get("/api/srams", (req, res) => {
    const limit = parseInt(req.query.limit) || 1000;
    const espid = req.query.espid;
    
    let sql = "SELECT * FROM sram";
    let params = [];
    
    if (espid) {
        sql += " WHERE espid = ?";
        params.push(espid);
    }
    
    sql += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('[ERROR] Database query failed:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: 'success',
            count: rows.length,
            data: rows
        });
    });
});

/**
 * Get statistics about measurements
 */
app.get("/api/stats", (req, res) => {
    const sql = `
        SELECT 
            espid,
            COUNT(*) as count,
            MIN(timestamp) as first_measurement,
            MAX(timestamp) as last_measurement
        FROM sram
        GROUP BY espid
        ORDER BY espid
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: 'success',
            devices: rows
        });
    });
});

/**
 * Post new SRAM measurement
 */
app.post("/api/sram/", (req, res) => {
    const errors = [];
    
    // Validate input
    if (!req.body.espid) {
        errors.push("ESP32 ID missing");
    }
    if (!req.body.data) {
        errors.push("SRAM data missing");
    }
    
    if (errors.length) {
        res.status(400).json({ error: errors.join(", ") });
        return;
    }
    
    const data = {
        espid: parseInt(req.body.espid),
        data: req.body.data
    };
    
    console.log(`  [DATA] ESP ID: ${data.espid}`);
    console.log(`  [DATA] Data Length: ${data.data.length} chars`);
    
    const sql = 'INSERT INTO sram (espid, data) VALUES (?,?)';
    const params = [data.espid, data.data];
    
    db.run(sql, params, function (err) {
        if (err) {
            console.error('[ERROR] Database insert failed:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log(`  [SUCCESS] Stored measurement ID: ${this.lastID}`);
        
        res.json({
            message: 'success',
            id: this.lastID,
            data: data
        });
    });
});

/**
 * Export measurements for analysis
 * Returns measurements in a format suitable for Python analysis tools
 */
app.get("/api/export/:espid", (req, res) => {
    const espid = parseInt(req.params.espid);
    
    const sql = "SELECT data, timestamp FROM sram WHERE espid = ? ORDER BY timestamp ASC";
    
    db.all(sql, [espid], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Return as plain text, one measurement per line
        const output = rows.map(row => row.data).join('\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="esp${espid}_measurements.txt"`);
        res.send(output);
    });
});

/**
 * Delete old measurements (cleanup)
 */
app.delete("/api/sram/cleanup", (req, res) => {
    const days = parseInt(req.query.days) || 30;
    
    const sql = "DELETE FROM sram WHERE timestamp < datetime('now', '-' || ? || ' days')";
    
    db.run(sql, [days], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: 'success',
            deleted: this.changes,
            older_than_days: days
        });
    });
});

/**
 * Start server
 */
app.listen(port, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    // Get all network addresses
    for (const [name, nets] of Object.entries(networkInterfaces)) {
        for (const net of nets) {
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push(net.address);
            }
        }
    }
    
    console.log('========================================');
    console.log('SRAM PUF Measurement Server');
    console.log('========================================');
    console.log(`Server running on port: ${port}`);
    console.log(`Listening on: 0.0.0.0 (all interfaces)`);
    console.log(`Basic Auth Username: ${process.env.ESP_USERNAME || 'esp'}`);
    console.log('');
    console.log('Access URLs:');
    console.log(`  Local:    http://localhost:${port}`);
    addresses.forEach(addr => {
        console.log(`  Network:  http://${addr}:${port}`);
    });
    console.log('');
    console.log('Endpoints:');
    console.log('  GET    /                 - Health check');
    console.log('  GET    /api/srams        - Get measurements (auth required)');
    console.log('  GET    /api/stats        - Get statistics (auth required)');
    console.log('  POST   /api/sram         - Store measurement (auth required)');
    console.log('  GET    /api/export/:id   - Export measurements (auth required)');
    console.log('  DELETE /api/sram/cleanup - Cleanup old data (auth required)');
    console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n[INFO] SIGTERM received, closing database...');
    db.close(() => {
        console.log('[INFO] Database closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n[INFO] SIGINT received, closing database...');
    db.close(() => {
        console.log('[INFO] Database closed');
        process.exit(0);
    });
});

