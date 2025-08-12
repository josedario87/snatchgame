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

    await matchMaker.remoteRoomCall(roomId, "broadcast", ["admin:pause"]);
    
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

    await matchMaker.remoteRoomCall(roomId, "broadcast", ["admin:resume"]);
    
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

    await matchMaker.remoteRoomCall(roomId, "broadcast", ["admin:restart"]);
    
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

    await matchMaker.remoteRoomCall(roomId, "broadcast", ["admin:kick", playerId]);
    
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