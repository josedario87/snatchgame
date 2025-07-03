const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${ENV}` });

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from current directory
app.use(express.static('.'));

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
        serverUrl: process.env.SERVER_URL,
        environment: ENV
    });
});

app.listen(PORT, () => {
    console.log(`
🎮 SnatchGame Client Server
📱 Environment: ${ENV}
🌐 Server URL: http://localhost:${PORT}
🔗 Game Server: ${process.env.SERVER_URL}
    `);
});