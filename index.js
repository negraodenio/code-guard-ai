const express = require('express');
const path = require('path');
const app = express();

// 1. Serve static files from the public directory
// This is the standard pattern for Vercel + Express to ensure assets are correctly bundled.
app.use(express.static(path.join(__dirname, 'public')));

// 2. Explicitly serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Health check and metadata
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'Operational',
        version: '1.2.0',
        environment: 'Vercel Serverless'
    });
});

module.exports = app;

