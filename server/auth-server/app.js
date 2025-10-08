/**
 * SRAM PUF Authentication Server
 * 
 * Simple HTTP server for authenticating ESP32 devices based on
 * SRAM PUF-derived tokens using Bearer authentication.
 */

const express = require('express');
const config = require('./config');

const app = express();
app.use(express.json());

// Statistics tracking
const stats = {
    totalRequests: 0,
    successfulAuth: 0,
    failedAuth: 0,
    startTime: new Date()
};

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`\n[${timestamp}] ${req.method} ${req.path} from ${ip}`);
    stats.totalRequests++;
    next();
});

/**
 * Health check endpoint
 * No authentication required
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'SRAM PUF Authentication Server',
        version: '1.0.0',
        registeredDevices: Object.keys(config.apiKeys).length,
        timestamp: new Date().toISOString()
    });
});

/**
 * Main authentication endpoint
 * Requires Bearer token in Authorization header
 */
app.get('/', (req, res) => {
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists and has correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        stats.failedAuth++;
        
        if (config.security.logAttempts) {
            console.log('  ❌ FAILED: Missing or invalid Authorization header');
            console.log(`  └─ Total failed attempts: ${stats.failedAuth}`);
        }
        
        return res.status(401).json({
            authenticated: false,
            error: 'Authentication failed',
            message: 'Missing or invalid Authorization header',
            expected: 'Authorization: Bearer <token>'
        });
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];
    const tokenPreview = token.substring(0, 8) + '...' + token.substring(token.length - 8);
    const deviceInfo = config.apiKeys[token];

    if (deviceInfo) {
        // Authentication successful
        stats.successfulAuth++;
        
        if (config.security.logAttempts) {
            console.log(`  ✅ SUCCESS: ${deviceInfo.deviceId} authenticated`);
            console.log(`  ├─ Description: ${deviceInfo.description}`);
            console.log(`  ├─ Token: ${tokenPreview}`);
            console.log(`  └─ Total successful: ${stats.successfulAuth}`);
        }
        
        res.json({
            authenticated: true,
            deviceId: deviceInfo.deviceId,
            description: deviceInfo.description,
            message: `${deviceInfo.deviceId} authenticated successfully`,
            timestamp: new Date().toISOString()
        });
    } else {
        // Authentication failed
        stats.failedAuth++;
        
        if (config.security.logAttempts) {
            console.log(`  ❌ FAILED: Invalid/unknown token`);
            console.log(`  ├─ Token received: ${tokenPreview}`);
            console.log(`  ├─ Reason: Device not registered`);
            console.log(`  └─ Total failed attempts: ${stats.failedAuth}`);
        }
        
        res.status(401).json({
            authenticated: false,
            error: 'Invalid token',
            message: 'Device not recognized',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Debug endpoint - List registered devices
 * WARNING: Remove in production!
 */
if (config.security.debugEndpoints) {
    app.get('/debug/devices', (req, res) => {
        const devices = Object.entries(config.apiKeys).map(([token, info]) => ({
            deviceId: info.deviceId,
            description: info.description,
            registered: info.registered,
            tokenPreview: token.substring(0, 8) + '...' + token.substring(token.length - 8)
        }));
        
        res.json({
            totalDevices: devices.length,
            devices: devices,
            warning: 'This endpoint should be disabled in production!'
        });
    });
    
    app.get('/debug/config', (req, res) => {
        res.json({
            port: config.port,
            security: config.security,
            registeredDevices: Object.keys(config.apiKeys).length
        });
    });
    
    app.get('/debug/stats', (req, res) => {
        const uptime = Math.floor((new Date() - stats.startTime) / 1000);
        const successRate = stats.totalRequests > 0 
            ? ((stats.successfulAuth / stats.totalRequests) * 100).toFixed(2) 
            : 0;
        
        res.json({
            uptime: `${uptime} seconds`,
            totalRequests: stats.totalRequests,
            successful: stats.successfulAuth,
            failed: stats.failedAuth,
            successRate: `${successRate}%`,
            startTime: stats.startTime
        });
    });
}

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableEndpoints: [
            'GET  /',
            'GET  /health',
            ...(config.security.debugEndpoints ? [
                'GET  /debug/devices',
                'GET  /debug/config',
                'GET  /debug/stats'
            ] : [])
        ]
    });
});

/**
 * Start server
 */
app.listen(config.port, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    // Get all network addresses
    for (const [name, nets] of Object.entries(networkInterfaces)) {
        for (const net of nets) {
            // Skip internal and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push(net.address);
            }
        }
    }
    
    console.log('========================================');
    console.log('SRAM PUF Authentication Server');
    console.log('========================================');
    console.log(`Server running on port: ${config.port}`);
    console.log(`Listening on: 0.0.0.0 (all interfaces)`);
    console.log('');
    console.log('Access URLs:');
    console.log(`  Local:    http://localhost:${config.port}`);
    addresses.forEach(addr => {
        console.log(`  Network:  http://${addr}:${config.port}`);
    });
    console.log('');
    console.log(`Registered devices: ${Object.keys(config.apiKeys).length}`);
    console.log(`Logging: ${config.security.logAttempts ? 'ENABLED ✓' : 'DISABLED'}`);
    console.log('');
    console.log('Endpoints:');
    console.log('  GET  /              - Authenticate (requires Bearer token)');
    console.log('  GET  /health        - Health check');
    if (config.security.debugEndpoints) {
        console.log('  GET  /debug/devices - List devices (DEBUG ONLY)');
        console.log('  GET  /debug/config  - Show config (DEBUG ONLY)');
        console.log('  GET  /debug/stats   - Show statistics (DEBUG ONLY)');
    }
    console.log('========================================');
    console.log('');
    console.log('Authentication attempts will be logged below:');
    console.log('  ✅ = Successful authentication');
    console.log('  ❌ = Failed authentication');
    console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n[INFO] SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n[INFO] SIGINT received, shutting down gracefully...');
    process.exit(0);
});

