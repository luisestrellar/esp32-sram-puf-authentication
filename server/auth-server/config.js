/**
 * Configuration for SRAM PUF Authentication Server
 */

module.exports = {
    // Server port
    port: process.env.PORT || 8080,

    // API Keys Registry
    // These are derived from SRAM PUF measurements using PBKDF2
    // Format: token -> device information
    apiKeys: {
        // Example tokens from test measurements
        // Replace these with tokens generated from your ESP32 using tools/puf-challenge-generator/pufchallenge.py

        '260f1105f729c7afcd71b62eacb5c0b94fcca4c16f6be36c4b2a297a975d358a': {
            deviceId: 'ESP32_001',
            description: 'Test Device 1',
            registered: '2024-01-01'
        },

        'de8b88829965fa9a3615d11b0703c42697ef5bea7ea341983b317ef0e482a852': {
            deviceId: 'ESP32_001',
            description: 'Test Device 1 (Alternative measurement)',
            registered: '2024-01-01'
        },

        // Add your own device tokens here:
        // 'your_pbkdf2_token_here': {
        //     deviceId: 'ESP32_XXX',
        //     description: 'Your device description',
        //     registered: '2024-XX-XX'
        // },
    },

    // Security settings
    security: {
        // Enable/disable debug endpoints (disable in production!)
        debugEndpoints: true,

        // Log authentication attempts
        logAttempts: true
    }
};

