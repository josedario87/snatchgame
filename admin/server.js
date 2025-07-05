const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${ENV}` });

const app = express();
const PORT = process.env.PORT || 3002;

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('que pedos');
    
    res.json({ 
        status: 'healthy',
        service: 'snatchgame-admin',
        environment: ENV,
        serverUrl: process.env.SERVER_URL
    });
});

// API endpoint to get environment config for client
app.get('/api/config', (req, res) => {
    res.json({
        serverUrl: process.env.SERVER_URL,
        environment: ENV
    });
});

// SSE endpoint for real-time updates
app.get('/api/sse', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type": "connected", "message": "SSE connection established"}\n\n');

    // Set up polling interval for game state updates
    const pollInterval = setInterval(async () => {
        try {
            // Fetch game state from Colyseus server
            const gameServerUrl = process.env.SERVER_URL || 'http://localhost:2567';
            const response = await fetch(`${gameServerUrl}/api/admin/stats`);
            
            if (response.ok) {
                const gameStats = await response.json();
                res.write(`data: ${JSON.stringify({
                    type: 'gameStats',
                    timestamp: new Date().toISOString(),
                    data: gameStats
                })}\n\n`);
            } else {
                // Send error status if server is not reachable
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    timestamp: new Date().toISOString(),
                    message: 'Cannot connect to game server'
                })}\n\n`);
            }
        } catch (error) {
            console.error('Error fetching game stats:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                timestamp: new Date().toISOString(),
                message: 'Error fetching game stats'
            })}\n\n`);
        }
    }, 500); // Poll every 500ms

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(pollInterval);
    });
});

// Admin control endpoints - proxy to Colyseus server

// Kick player endpoint
app.post('/api/admin/kick-player', async (req, res) => {
    try {
        const gameServerUrl = process.env.SERVER_URL || 'http://localhost:2567';
        const response = await fetch(`${gameServerUrl}/api/admin/kick-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error communicating with game server' });
    }
});

// Pause game endpoint
app.post('/api/admin/pause-game', async (req, res) => {
    try {
        const gameServerUrl = process.env.SERVER_URL || 'http://localhost:2567';
        const response = await fetch(`${gameServerUrl}/api/admin/pause-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error communicating with game server' });
    }
});

// Resume game endpoint
app.post('/api/admin/resume-game', async (req, res) => {
    try {
        const gameServerUrl = process.env.SERVER_URL || 'http://localhost:2567';
        const response = await fetch(`${gameServerUrl}/api/admin/resume-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error communicating with game server' });
    }
});

// Cancel game endpoint
app.post('/api/admin/cancel-game', async (req, res) => {
    try {
        const gameServerUrl = process.env.SERVER_URL || 'http://localhost:2567';
        const response = await fetch(`${gameServerUrl}/api/admin/cancel-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error communicating with game server' });
    }
});

// Configure MIME types for modules
express.static.mime.define({'application/javascript': ['js', 'mjs']});

// Serve static files based on environment (AFTER API routes)
if (ENV === 'production') {
    // Production: serve from dist first
    app.use(express.static('dist'));
    app.use(express.static('.'));
} else {
    // Development: serve from current directory only
    app.use(express.static('.'));
}

// Serve main HTML file for SPA routes based on environment
app.get('*', (req, res) => {
    if (ENV === 'production') {
        const distIndexPath = path.join(__dirname, 'dist', 'index.html');
        const fs = require('fs');
        if (fs.existsSync(distIndexPath)) {
            res.sendFile(distIndexPath);
        } else {
            res.status(500).send('Production build not found. Run npm run build first.');
        }
    } else {
        // Development: serve dev index.html
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    const publicUrl = ENV === 'production' ? 'https://snatchgGameAdmin.interno.com' : `http://localhost:${PORT}`;
    console.log(`
📊 SnatchGame Admin Dashboard
📱 Environment: ${ENV}
🌐 Server URL: ${publicUrl}
🔗 Game Server: ${process.env.SERVER_URL}
📡 SSE Endpoint: ${publicUrl}/api/sse
    `);
});