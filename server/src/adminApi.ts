import { Request, Response, Router } from "express";
import { matchMaker } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";

// SSE connections storage
const sseClients = new Set<Response>();

const adminRouter = Router();

adminRouter.get("/rooms", async (req: Request, res: Response) => {
  try {
    const rooms = await matchMaker.query({});
    const roomStats = rooms.map(room => ({
      roomId: room.roomId,
      name: room.name,
      clients: room.clients,
      maxClients: room.maxClients,
      metadata: room.metadata,
      locked: room.locked,
      private: room.private,
      createdAt: room.createdAt
    }));
    
    res.json(roomStats);
  } catch (error) {
    console.error("[AdminAPI] Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

adminRouter.get("/rooms/:roomId/stats", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const roomData = await matchMaker.remoteRoomCall(roomId, "getState");
    
    res.json(roomData);
  } catch (error) {
    console.error(`[AdminAPI] Error fetching room ${req.params.roomId} stats:`, error);
    res.status(500).json({ error: "Failed to fetch room stats" });
  }
});

adminRouter.post("/rooms/:roomId/pause", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const rooms = await matchMaker.query({ roomId });
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["pause"]);
    
    res.json({ success: true, message: "Room paused" });
  } catch (error) {
    console.error(`[AdminAPI] Error pausing room ${req.params.roomId}:`, error);
    res.status(500).json({ error: "Failed to pause room" });
  }
});

adminRouter.post("/rooms/:roomId/resume", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const rooms = await matchMaker.query({ roomId });
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["resume"]);
    
    res.json({ success: true, message: "Room resumed" });
  } catch (error) {
    console.error(`[AdminAPI] Error resuming room ${req.params.roomId}:`, error);
    res.status(500).json({ error: "Failed to resume room" });
  }
});

adminRouter.post("/rooms/:roomId/restart", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const rooms = await matchMaker.query({ roomId });
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["restart"]);
    
    res.json({ success: true, message: "Room restarted" });
  } catch (error) {
    console.error(`[AdminAPI] Error restarting room ${req.params.roomId}:`, error);
    res.status(500).json({ error: "Failed to restart room" });
  }
});

adminRouter.post("/rooms/:roomId/kick/:playerId", async (req: Request, res: Response) => {
  try {
    const { roomId, playerId } = req.params;
    const rooms = await matchMaker.query({ roomId });
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["kick", playerId]);
    
    res.json({ success: true, message: `Player ${playerId} kicked` });
  } catch (error) {
    console.error(`[AdminAPI] Error kicking player from room ${req.params.roomId}:`, error);
    res.status(500).json({ error: "Failed to kick player" });
  }
});

adminRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await matchMaker.stats.fetchAll();
    const globalCCU = await matchMaker.stats.getGlobalCCU();
    
    res.json({
      processes: stats,
      globalCCU,
      localCCU: matchMaker.stats.local.ccu,
      localRoomCount: matchMaker.stats.local.roomCount
    });
  } catch (error) {
    console.error("[AdminAPI] Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Global admin endpoints
adminRouter.post("/admin/pause-all", async (req: Request, res: Response) => {
  try {
    const gameRooms = await matchMaker.query({ name: "game" });
    
    if (gameRooms.length === 0) {
      return res.json({ success: true, message: "No game rooms to pause" });
    }

    const promises = gameRooms.map(room => 
      matchMaker.remoteRoomCall(room.roomId, "executeAdminCommand", ["pause"])
        .catch(error => console.error(`Failed to pause room ${room.roomId}:`, error))
    );

    await Promise.allSettled(promises);
    
    res.json({ 
      success: true, 
      message: `Pause command sent to ${gameRooms.length} game rooms` 
    });
  } catch (error) {
    console.error("[AdminAPI] Error pausing all games:", error);
    res.status(500).json({ error: "Failed to pause all games" });
  }
});

adminRouter.post("/admin/resume-all", async (req: Request, res: Response) => {
  try {
    const gameRooms = await matchMaker.query({ name: "game" });
    
    if (gameRooms.length === 0) {
      return res.json({ success: true, message: "No game rooms to resume" });
    }

    const promises = gameRooms.map(room => 
      matchMaker.remoteRoomCall(room.roomId, "executeAdminCommand", ["resume"])
        .catch(error => console.error(`Failed to resume room ${room.roomId}:`, error))
    );

    await Promise.allSettled(promises);
    
    res.json({ 
      success: true, 
      message: `Resume command sent to ${gameRooms.length} game rooms` 
    });
  } catch (error) {
    console.error("[AdminAPI] Error resuming all games:", error);
    res.status(500).json({ error: "Failed to resume all games" });
  }
});

adminRouter.post("/admin/restart-all", async (req: Request, res: Response) => {
  try {
    const gameRooms = await matchMaker.query({ name: "game" });
    
    if (gameRooms.length === 0) {
      return res.json({ success: true, message: "No game rooms to restart" });
    }

    const promises = gameRooms.map(room => 
      matchMaker.remoteRoomCall(room.roomId, "executeAdminCommand", ["restart"])
        .catch(error => console.error(`Failed to restart room ${room.roomId}:`, error))
    );

    await Promise.allSettled(promises);
    
    res.json({ 
      success: true, 
      message: `Restart command sent to ${gameRooms.length} game rooms` 
    });
  } catch (error) {
    console.error("[AdminAPI] Error restarting all games:", error);
    res.status(500).json({ error: "Failed to restart all games" });
  }
});

adminRouter.post("/admin/change-variant", async (req: Request, res: Response) => {
  try {
    const { variant } = req.body;
    
    if (!variant || !['G1', 'G2', 'G3', 'G4', 'G5'].includes(variant)) {
      return res.status(400).json({ error: "Invalid variant. Must be one of: G1, G2, G3, G4, G5" });
    }

    const gameRooms = await matchMaker.query({ name: "game" });
    
    if (gameRooms.length === 0) {
      return res.json({ success: true, message: "No game rooms to change variant" });
    }

    const promises = gameRooms.map(room => 
      matchMaker.remoteRoomCall(room.roomId, "executeAdminCommand", ["setVariant", variant])
        .catch(error => console.error(`Failed to change variant in room ${room.roomId}:`, error))
    );

    await Promise.allSettled(promises);
    
    res.json({ 
      success: true, 
      message: `Variant change to ${variant} sent to ${gameRooms.length} game rooms` 
    });
  } catch (error) {
    console.error("[AdminAPI] Error changing global variant:", error);
    res.status(500).json({ error: "Failed to change global variant" });
  }
});

adminRouter.post("/admin/send-all-to-lobby", async (req: Request, res: Response) => {
  try {
    const gameRooms = await matchMaker.query({ name: "game" });
    
    if (gameRooms.length === 0) {
      return res.json({ success: true, message: "No game rooms to close" });
    }

    console.log(`[AdminAPI] Sending ${gameRooms.length} game rooms to lobby and disposing them`);

    // Send command to all game rooms
    const promises = gameRooms.map(room => 
      matchMaker.remoteRoomCall(room.roomId, "executeAdminCommand", ["sendToLobby"])
        .catch(error => console.error(`Failed to send room ${room.roomId} to lobby:`, error))
    );

    await Promise.allSettled(promises);
    
    // Wait a bit for rooms to dispose themselves, then force dispose any remaining
    setTimeout(async () => {
      try {
        const remainingGameRooms = await matchMaker.query({ name: "game" });
        
        if (remainingGameRooms.length > 0) {
          console.log(`[AdminAPI] Force disposing ${remainingGameRooms.length} remaining game rooms`);
          
          const disposePromises = remainingGameRooms.map(room => 
            matchMaker.remoteRoomCall(room.roomId, "disconnect").catch(() => {
              // If remote call fails, try direct disposal
              console.log(`[AdminAPI] Force disposing room ${room.roomId} directly`);
            })
          );
          
          await Promise.allSettled(disposePromises);
        }
        
        // Broadcast dashboard update after cleanup
        setTimeout(() => {
          broadcastDashboardUpdate();
        }, 500);
        
      } catch (error) {
        console.error("[AdminAPI] Error in cleanup phase:", error);
      }
    }, 3000);
    
    res.json({ 
      success: true, 
      message: `Send to lobby command sent to ${gameRooms.length} game rooms. Rooms will be disposed.` 
    });
  } catch (error) {
    console.error("[AdminAPI] Error sending all to lobby:", error);
    res.status(500).json({ error: "Failed to send all players to lobby" });
  }
});

// SSE endpoint for real-time dashboard updates
adminRouter.get("/dashboard-stream", (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to our set
  sseClients.add(res);
  console.log(`[AdminAPI] SSE client connected. Total clients: ${sseClients.size}`);

  // Send initial data
  sendDashboardUpdate(res);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`[AdminAPI] SSE client disconnected. Total clients: ${sseClients.size}`);
  });

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (res.destroyed) {
      clearInterval(heartbeat);
      sseClients.delete(res);
      return;
    }
    res.write(':heartbeat\n\n');
  }, 30000); // 30 seconds

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Function to send dashboard data to SSE clients
async function sendDashboardUpdate(client?: Response) {
  try {
    const rooms = await matchMaker.query({});
    const roomStats = rooms.map(room => ({
      roomId: room.roomId,
      name: room.name,
      clients: room.clients,
      maxClients: room.maxClients,
      metadata: room.metadata,
      locked: room.locked,
      private: room.private,
      createdAt: room.createdAt
    }));

    // Get detailed stats for all game rooms
    const roomDetails: { [key: string]: any } = {};
    
    for (const room of rooms) {
      if (room.name === 'game') {
        try {
          const detailData = await matchMaker.remoteRoomCall(room.roomId, "getState");
          roomDetails[room.roomId] = detailData;
        } catch (error) {
          console.warn(`[AdminAPI] Failed to get details for room ${room.roomId}:`, error);
          // Set empty details if room call fails
          roomDetails[room.roomId] = {
            players: [],
            gameStatus: room.metadata?.gameStatus || 'waiting',
            variant: room.metadata?.currentVariant || 'G1',
            round: room.metadata?.currentRound || 1
          };
        }
      }
    }

    const stats = await matchMaker.stats.fetchAll();
    const globalCCU = await matchMaker.stats.getGlobalCCU();
    
    const dashboardData = {
      rooms: roomStats,
      roomDetails: roomDetails,
      globalStats: {
        processes: stats,
        globalCCU,
        localCCU: matchMaker.stats.local.ccu,
        localRoomCount: matchMaker.stats.local.roomCount
      }
    };

    const message = `data: ${JSON.stringify(dashboardData)}\n\n`;

    if (client) {
      // Send to specific client (for initial connection)
      if (!client.destroyed) {
        client.write(message);
      }
    } else {
      // Broadcast to all clients
      const deadClients: Response[] = [];
      
      sseClients.forEach(client => {
        if (client.destroyed) {
          deadClients.push(client);
        } else {
          try {
            client.write(message);
          } catch (error) {
            console.error('[AdminAPI] Error writing to SSE client:', error);
            deadClients.push(client);
          }
        }
      });

      // Clean up dead connections
      deadClients.forEach(client => sseClients.delete(client));
    }
  } catch (error) {
    console.error('[AdminAPI] Error sending dashboard update:', error);
  }
}

// Function to broadcast dashboard updates (called from room events)
function broadcastDashboardUpdate() {
  sendDashboardUpdate();
}

export { adminRouter, broadcastDashboardUpdate };