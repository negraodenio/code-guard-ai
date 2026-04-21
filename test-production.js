#!/usr/bin/env node

/**
 * CodeGuard API - Production Test Script
 *
 * Testa as APIs em produção no Vercel
 *
 * Uso:
 * node test-production.js https://your-app.vercel.app your-api-key
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = process.argv[3] || 'demo-key-123';

async function testAPI(endpoint, method = 'POST', data = null) {
    console.log(`\n🧪 Testing ${method} ${endpoint}`);

    try {
        const config = {
            method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        if (data && method === 'POST') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        const result = await response.json();

        if (response.ok) {
            console.log(`✅ ${response.status} - Success`);
            console.log(`📊 Response:`, JSON.stringify(result, null, 2).substring(0, 200) + '...');
        } else {
            console.log(`❌ ${response.status} - Error: ${result.error || result.message}`);
        }

        return { status: response.status, result };
    } catch (error) {
        console.log(`💥 Network Error: ${error.message}`);
        return { status: 0, error: error.message };
    }
}

async function runTests() {
    console.log(`🚀 Testing CodeGuard APIs at ${BASE_URL}`);
    console.log(`🔑 Using API Key: ${API_KEY.substring(0, 8)}...`);

    // Test 1: Health check (if available)
    await testAPI('/', 'GET');

    // Test 2: OpenAPI spec
    await testAPI('/api/openapi', 'GET');

    // Test 3: Scan API
    await testAPI('/api/scan', 'POST', {
        region: 'BR',
        frameworks: ['gdpr']
    });

    // Test 4: Graph API
    await testAPI('/api/graph', 'POST');

    // Test 5: Shadow APIs
    await testAPI('/api/shadow-apis', 'POST', {
        content: `
        app.get('/api/users', (req, res) => {
            // This is a potential shadow API
            const users = getAllUsers();
            res.json(users);
        });

        app.post('/api/admin/reset', (req, res) => {
            // Admin endpoint without proper auth
            resetDatabase();
            res.send('OK');
        });
        `
    });

    // Test 6: Invalid API key
    console.log(`\n🧪 Testing invalid API key`);
    const invalidResponse = await fetch(`${BASE_URL}/api/scan`, {
        method: 'POST',
        headers: {
            'x-api-key': 'invalid-key',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ region: 'BR' })
    });

    if (invalidResponse.status === 401) {
        console.log(`✅ 401 - Authentication works correctly`);
    } else {
        console.log(`❌ Expected 401, got ${invalidResponse.status}`);
    }

    // Test 7: Invalid data
    await testAPI('/api/scan', 'POST', {
        region: 'INVALID',
        frameworks: 'not-an-array'
    });

    console.log(`\n🎉 Test completed!`);
    console.log(`📖 Check VERCEL_DEPLOYMENT.md for more examples`);
}

runTests().catch(console.error);