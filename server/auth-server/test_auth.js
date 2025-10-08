/**
 * Test script for authentication server
 * 
 * PREREQUISITES: Server must be running!
 * 1. In terminal 1: npm start (start server)
 * 2. In terminal 2: node test_auth.js (run this test)
 */

const http = require('http');

const SERVER_URL = 'http://localhost:8080';
const VALID_TOKEN = 'c7cea8e27fee7d356cdf24a388c5757c802b014d28c8a13a17cccd49aac506a3';
const INVALID_TOKEN = 'invalid_token_12345';

// Helper function to make HTTP requests
function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SERVER_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: JSON.parse(data)
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Test cases
async function runTests() {
    console.log('=========================================');
    console.log('Testing SRAM PUF Authentication Server');
    console.log('=========================================');
    console.log('');
    console.log('⚠️  Make sure server is running in another terminal:');
    console.log('   Terminal 1: npm start');
    console.log('   Terminal 2: node test_auth.js (this)');
    console.log('');

    try {
        // Test 1: Health check
        console.log('[Test 1] Health check endpoint...');
        const health = await makeRequest('/health');
        console.log(`  Status: ${health.statusCode}`);
        console.log(`  Response: ${JSON.stringify(health.body, null, 2)}`);
        console.log(`  Result: ${health.statusCode === 200 ? '✓ PASS' : '✗ FAIL'}\n`);

        // Test 2: Missing Authorization header
        console.log('[Test 2] Request without Authorization header...');
        const noAuth = await makeRequest('/');
        console.log(`  Status: ${noAuth.statusCode}`);
        console.log(`  Response: ${JSON.stringify(noAuth.body, null, 2)}`);
        console.log(`  Result: ${noAuth.statusCode === 401 ? '✓ PASS' : '✗ FAIL'}\n`);

        // Test 3: Valid token
        console.log('[Test 3] Request with valid token...');
        const validAuth = await makeRequest('/', {
            'Authorization': `Bearer ${VALID_TOKEN}`
        });
        console.log(`  Status: ${validAuth.statusCode}`);
        console.log(`  Response: ${JSON.stringify(validAuth.body, null, 2)}`);
        console.log(`  Result: ${validAuth.statusCode === 200 && validAuth.body.authenticated ? '✓ PASS' : '✗ FAIL'}\n`);

        // Test 4: Invalid token
        console.log('[Test 4] Request with invalid token...');
        const invalidAuth = await makeRequest('/', {
            'Authorization': `Bearer ${INVALID_TOKEN}`
        });
        console.log(`  Status: ${invalidAuth.statusCode}`);
        console.log(`  Response: ${JSON.stringify(invalidAuth.body, null, 2)}`);
        console.log(`  Result: ${invalidAuth.statusCode === 401 ? '✓ PASS' : '✗ FAIL'}\n`);

        // Test 5: Debug endpoints
        console.log('[Test 5] Debug devices endpoint...');
        const devices = await makeRequest('/debug/devices');
        console.log(`  Status: ${devices.statusCode}`);
        console.log(`  Response: ${JSON.stringify(devices.body, null, 2)}`);
        console.log(`  Result: ${devices.statusCode === 200 ? '✓ PASS' : '✗ FAIL'}\n`);

        console.log('=========================================');
        console.log('All tests completed!');
        console.log('=========================================');

    } catch (error) {
        console.error('\n✗ Test failed with error:');
        console.error(error.message);
        console.log('\nMake sure the server is running: npm start');
    }
}

// Run tests
runTests();

