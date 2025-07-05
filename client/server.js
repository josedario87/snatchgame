const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${ENV}` });

const app = express();
const PORT = process.env.PORT || 3000;

// Configure MIME types for modules
express.static.mime.define({'application/javascript': ['js', 'mjs']});

// Serve static files based on environment
if (ENV === 'production') {
    // Production: serve from dist first
    app.use(express.static('dist'));
    app.use(express.static('.'));
} else {
    // Development: serve from current directory only
    app.use(express.static('.'));
}

// Serve main HTML file based on environment
app.get('/', (req, res) => {
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'snatchgame-client',
        environment: ENV,
        serverUrl: process.env.SERVER_URL
    });
});

// API endpoint to get environment config for client
app.get('/api/config', (req, res) => {
    res.json({
        serverUrl: process.env.PUBLIC_SERVER_URL || process.env.SERVER_URL,
        environment: ENV
    });
});

app.listen(PORT, () => {
    const publicUrl = ENV === 'production' ? 'https://snatchGame.interno.com' : `http://localhost:${PORT}`;
    console.log(`
🎮 SnatchGame Client Server
📱 Environment: ${ENV}
🌐 Server URL: ${publicUrl}
🔗 Game Server: ${process.env.SERVER_URL}
    `);
});