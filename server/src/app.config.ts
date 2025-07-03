import config from "@colyseus/tools";
import { GameRoom } from "./rooms/GameRoom";

export default config({
    options: {
        devMode: process.env.NODE_ENV !== "production",
        gracefullyShutdown: true,
    },
    
    initializeGameServer: (gameServer) => {
        // Define game room handler
        gameServer.define('game', GameRoom)
            .filterBy(['gameMode'])
            .sortBy({ clients: 1 }); // Prefer rooms with fewer clients
    },
    
    initializeExpress: (app) => {
        app.get("/", (req, res) => {
            res.json({
                name: "SnatchGame Server",
                status: "running",
                version: "1.0.0"
            });
        });

        app.get("/health", (req, res) => {
            res.json({ status: "healthy" });
        });
    }
});