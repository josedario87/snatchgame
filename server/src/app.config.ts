import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { matchMaker } from "@colyseus/core";
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
                version: "0.0.8-alpha",
                description: "Multiplayer game server for SnatchGame",
            });
        });

        app.get("/health", (req, res) => {
            res.json({ status: "healthy" });
        });

        // Colyseus official monitoring panel
        app.use("/monitor", monitor({
            columns: [
                'roomId',
                'name', 
                'clients',
                'maxClients',
                'locked',
                'elapsedTime'
            ]
        }));

        // CORS for admin interface
        app.use("/api/admin", (req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            
            if (req.method === "OPTIONS") {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Admin endpoints
        app.use(require('express').json());

        // Get game statistics using official matchMaker API
        app.get("/api/admin/stats", async (req, res) => {
            try {
                const rooms = await matchMaker.query({});
                let totalPlayers = 0;
                let activeGames = 0;
                const gameRooms = [];
                const allPlayers: any[] = [];

                for (const room of rooms) {
                    if (room.name === 'game') {
                        activeGames++;
                        totalPlayers += room.clients;
                        
                        // Get detailed room information including players
                        try {
                            const roomData = await matchMaker.remoteRoomCall(room.roomId, "getInspectData");
                            
                            gameRooms.push({
                                roomId: room.roomId,
                                players: room.clients,
                                maxPlayers: room.maxClients,
                                locked: room.locked,
                                createdAt: room.createdAt,
                                elapsedTime: Date.now() - new Date(room.createdAt).getTime()
                            });

                            // Extract player information with their tokens
                            if (roomData.state && roomData.state.players) {
                                // Use forEach to iterate over MapSchema properly
                                roomData.state.players.forEach((player: any, playerId: string) => {
                                    // Skip internal MapSchema properties
                                    if (playerId.startsWith('$') || playerId === 'deletedItems') {
                                        return;
                                    }
                                    
                                    allPlayers.push({
                                        id: playerId,
                                        name: player.name || 'Unknown',
                                        roomId: room.roomId,
                                        role: player.role || 'player',
                                        producerRole: player.producerRole || 'turkey',
                                        tokens: {
                                            turkeys: player.tokens?.turkey || 0,
                                            coffee: player.tokens?.coffee || 0,
                                            corn: player.tokens?.corn || 0
                                        },
                                        isReady: player.isReady || false,
                                        isConnected: player.isConnected !== false
                                    });
                                });
                            }
                        } catch (roomError) {
                            console.error(`Failed to get room data for ${room.roomId}:`, roomError);
                            // Still add basic room info even if detailed data fails
                            gameRooms.push({
                                roomId: room.roomId,
                                players: room.clients,
                                maxPlayers: room.maxClients,
                                locked: room.locked,
                                createdAt: room.createdAt,
                                elapsedTime: Date.now() - new Date(room.createdAt).getTime()
                            });
                        }
                    }
                }

                res.json({
                    connectedPlayers: totalPlayers,
                    activeGames,
                    currentRound: activeGames > 0 ? 'Ronda 1' : 'waiting',
                    gameState: activeGames > 0 ? 'in_progress' : 'waiting_for_players',
                    players: allPlayers,
                    rooms: gameRooms
                });
            } catch (error) {
                console.error('Admin stats error:', error);
                res.status(500).json({ 
                    error: 'Failed to get stats',
                    connectedPlayers: 0,
                    activeGames: 0,
                    currentRound: 'error',
                    gameState: 'error',
                    players: [],
                    rooms: []
                });
            }
        });

        // Kick player using official matchMaker API
        app.post("/api/admin/kick-player", async (req, res) => {
            try {
                const { playerId } = req.body;
                
                if (!playerId) {
                    return res.status(400).json({ success: false, message: 'Player ID is required' });
                }

                // Get all rooms to find the player
                const rooms = await matchMaker.query({});
                let playerFound = false;

                for (const room of rooms) {
                    if (room.name === 'game') {
                        try {
                            // Try to kick the player from this room
                            await matchMaker.remoteRoomCall(room.roomId, "_forceClientDisconnect", [playerId]);
                            console.log(`🚫 Admin kicked player ${playerId} from room ${room.roomId}`);
                            playerFound = true;
                            break;
                        } catch (error) {
                            // Player not in this room, continue searching
                            continue;
                        }
                    }
                }

                if (playerFound) {
                    res.json({ success: true, message: `Player ${playerId} kicked` });
                } else {
                    res.status(404).json({ success: false, message: 'Player not found' });
                }
            } catch (error) {
                console.error('Kick player error:', error);
                res.status(500).json({ success: false, message: 'Failed to kick player' });
            }
        });

        // Pause game using official matchMaker API
        app.post("/api/admin/pause-game", async (req, res) => {
            try {
                const rooms = await matchMaker.query({});
                let pausedGames = 0;
                
                // Pause all active games
                for (const room of rooms) {
                    if (room.name === 'game') {
                        try {
                            await matchMaker.remoteRoomCall(room.roomId, "pauseGame");
                            pausedGames++;
                            console.log(`⏸️ Admin paused game in room ${room.roomId}`);
                        } catch (error) {
                            console.error(`Failed to pause game in room ${room.roomId}:`, error);
                        }
                    }
                }
                
                res.json({ 
                    success: true, 
                    message: `${pausedGames} games paused`,
                    pausedGames
                });
            } catch (error) {
                console.error('Pause game error:', error);
                res.status(500).json({ success: false, message: 'Failed to pause games' });
            }
        });

        // Resume game using official matchMaker API
        app.post("/api/admin/resume-game", async (req, res) => {
            try {
                const rooms = await matchMaker.query({});
                let resumedGames = 0;
                
                // Resume all paused games
                for (const room of rooms) {
                    if (room.name === 'game') {
                        try {
                            await matchMaker.remoteRoomCall(room.roomId, "resumeGame");
                            resumedGames++;
                            console.log(`▶️ Admin resumed game in room ${room.roomId}`);
                        } catch (error) {
                            console.error(`Failed to resume game in room ${room.roomId}:`, error);
                        }
                    }
                }
                
                res.json({ 
                    success: true, 
                    message: `${resumedGames} games resumed`,
                    resumedGames
                });
            } catch (error) {
                console.error('Resume game error:', error);
                res.status(500).json({ success: false, message: 'Failed to resume games' });
            }
        });

        // Cancel game using official matchMaker API
        app.post("/api/admin/cancel-game", async (req, res) => {
            try {
                const { gameId } = req.body;
                
                if (gameId) {
                    // Cancel specific game
                    try {
                        await matchMaker.remoteRoomCall(gameId, "disconnect");
                        console.log(`❌ Admin cancelled game ${gameId}`);
                        res.json({ success: true, message: `Game ${gameId} cancelled` });
                    } catch (error) {
                        console.error(`Failed to cancel game ${gameId}:`, error);
                        res.status(404).json({ success: false, message: 'Game not found' });
                    }
                } else {
                    // Cancel all games
                    const rooms = await matchMaker.query({});
                    let cancelledGames = 0;
                    
                    for (const room of rooms) {
                        if (room.name === 'game') {
                            try {
                                await matchMaker.remoteRoomCall(room.roomId, "disconnect");
                                cancelledGames++;
                                console.log(`❌ Admin cancelled game ${room.roomId}`);
                            } catch (error) {
                                console.error(`Failed to cancel game ${room.roomId}:`, error);
                            }
                        }
                    }
                    
                    res.json({ 
                        success: true, 
                        message: `${cancelledGames} games cancelled`,
                        cancelledGames
                    });
                }
            } catch (error) {
                console.error('Cancel game error:', error);
                res.status(500).json({ success: false, message: 'Failed to cancel games' });
            }
        });

        // Kick all players - empty all rooms
        app.post("/api/admin/kick-all-players", async (req, res) => {
            try {
                const rooms = await matchMaker.query({});
                let kickedPlayers = 0;
                let roomsCleared = 0;

                for (const room of rooms) {
                    if (room.name === 'game') {
                        try {
                            // Get room data to get player information
                            const roomData = await matchMaker.remoteRoomCall(room.roomId, "getInspectData");
                            const playerCount = roomData.clients?.length || 0;
                            
                            if (playerCount > 0) {
                                // Kick each player individually to send proper notifications
                                await matchMaker.remoteRoomCall(room.roomId, "_forceDisconnectAllClients");
                                kickedPlayers += playerCount;
                                roomsCleared++;
                                console.log(`🚫🚫 Admin cleared room ${room.roomId} - ${playerCount} players kicked`);
                            }
                        } catch (error) {
                            console.error(`Failed to clear room ${room.roomId}:`, error);
                        }
                    }
                }

                res.json({
                    success: true,
                    message: `${kickedPlayers} jugadores expulsados de ${roomsCleared} salas`,
                    kickedPlayers,
                    roomsCleared
                });
            } catch (error) {
                console.error('Kick all players error:', error);
                res.status(500).json({ success: false, message: 'Failed to kick all players' });
            }
        });

        // Advance round globally - all active games
        app.post("/api/admin/advance-round", async (req, res) => {
            try {
                const rooms = await matchMaker.query({});
                let roundsAdvanced = 0;
                let newRound = 1;

                for (const room of rooms) {
                    if (room.name === 'game') {
                        try {
                            const result = await matchMaker.remoteRoomCall(room.roomId, "advanceRound");
                            if (result && result.success) {
                                roundsAdvanced++;
                                newRound = result.newRound;
                                console.log(`⏭️ Admin advanced round in ${room.roomId} to round ${newRound}`);
                            }
                        } catch (error) {
                            console.error(`Failed to advance round in room ${room.roomId}:`, error);
                        }
                    }
                }

                res.json({
                    success: true,
                    message: `Ronda avanzada a ${newRound} en ${roundsAdvanced} salas`,
                    roundsAdvanced,
                    newRound
                });
            } catch (error) {
                console.error('Advance round error:', error);
                res.status(500).json({ success: false, message: 'Failed to advance round' });
            }
        });

        // Go back round globally - all active games
        app.post("/api/admin/previous-round", async (req, res) => {
            try {
                const rooms = await matchMaker.query({});
                let roundsChanged = 0;
                let newRound = 1;

                for (const room of rooms) {
                    if (room.name === 'game') {
                        try {
                            const result = await matchMaker.remoteRoomCall(room.roomId, "previousRound");
                            if (result && result.success) {
                                roundsChanged++;
                                newRound = result.newRound;
                                console.log(`⏮️ Admin went back round in ${room.roomId} to round ${newRound}`);
                            }
                        } catch (error) {
                            console.error(`Failed to go back round in room ${room.roomId}:`, error);
                        }
                    }
                }

                res.json({
                    success: true,
                    message: `Ronda retrocedida a ${newRound} en ${roundsChanged} salas`,
                    roundsChanged,
                    newRound
                });
            } catch (error) {
                console.error('Previous round error:', error);
                res.status(500).json({ success: false, message: 'Failed to go back round' });
            }
        });
    }
});