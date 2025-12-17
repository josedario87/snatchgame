import { Request, Response, Router } from "express";
import { matchMaker } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import { NameManager } from "./utils/nameManager";
import { getAllowedUuidCount, listAllowedUuids } from "./utils/uuidRegistry";

// SSE connections storage
const sseClients = new Set<Response>(); // dashboard/rooms stream
const sseUuidClients = new Set<Response>(); // uuids stream
const ssePlayerActionsClients = new Set<Response>(); // per-player actions stream

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

adminRouter.post("/rooms/:roomId/close", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const rooms = await matchMaker.query({ roomId });
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["sendToLobby"]);
    
    res.json({ success: true, message: `Room ${roomId} closed and players sent to lobby` });
  } catch (error) {
    console.error(`[AdminAPI] Error closing room ${req.params.roomId}:`, error);
    res.status(500).json({ error: "Failed to close room" });
  }
});

adminRouter.post("/rooms/:roomId/variant", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { variant } = req.body;
    
    if (!variant || !['G1', 'G2', 'G3', 'G4', 'G5'].includes(variant)) {
      return res.status(400).json({ error: "Invalid variant. Must be one of: G1, G2, G3, G4, G5" });
    }

    const rooms = await matchMaker.query({ roomId });
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["setVariant", variant]);
    
    res.json({ success: true, message: `Room ${roomId} variant changed to ${variant}` });
  } catch (error) {
    console.error(`[AdminAPI] Error changing variant for room ${req.params.roomId}:`, error);
    res.status(500).json({ error: "Failed to change room variant" });
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

// Reset all stored UUID profiles (name, color, shame tokens)
adminRouter.post("/admin/reset-uuid-profiles", async (req: Request, res: Response) => {
  try {
    const allowlist = listAllowedUuids();
    const known = NameManager.getInstance().getAllKnownUuids();
    const all = Array.from(new Set([...(allowlist || []), ...(known || [])]));

    let resetCount = 0;
    all.forEach(uuid => {
      if (uuid) {
        NameManager.getInstance().clearPlayerProfile(uuid);
        resetCount++;
      }
    });

    // Optionally, we could also update active rooms, but we keep it as future joins behavior.
    // Broadcast dashboard update so clients refresh any derived data
    setTimeout(() => { try { broadcastDashboardUpdate(); } catch {} }, 100);

    res.json({ success: true, message: `Reset profiles for ${resetCount} UUIDs` });
  } catch (error) {
    console.error("[AdminAPI] Error resetting UUID profiles:", error);
    res.status(500).json({ error: "Failed to reset UUID profiles" });
  }
});

adminRouter.post("/admin/shuffle-players", async (req: Request, res: Response) => {
  console.log("[AdminAPI] Shuffle endpoint called!");
  
  try {
    console.log("[AdminAPI] Starting player shuffle...");
    
    // 1. Get all game rooms and their players
    const gameRooms = await matchMaker.query({ name: "game" });
    
    if (gameRooms.length === 0) {
      return res.json({ success: true, message: "No game rooms to shuffle" });
    }

    console.log(`[AdminAPI] Found ${gameRooms.length} game rooms for shuffle`);

    // 2. Extract all players from all rooms
    const allPlayers: any[] = [];
    const roomsInfo: { roomId: string; variant: string }[] = [];
    
    for (const room of gameRooms) {
      try {
        const roomState = await matchMaker.remoteRoomCall(room.roomId, "getState");
        
        roomsInfo.push({
          roomId: room.roomId,
          variant: roomState.variant || 'G1'
        });
        
        // Collect players with their full info
        if (roomState.players && roomState.players.length > 0) {
          roomState.players.forEach((player: any) => {
            const uuid = player.uuid || player.sessionId;
            const shame = Number(player.shameTokens || 0);
            // Persist sticky shame for this UUID before clearing rooms
            try { NameManager.getInstance().setShameTokens(uuid, shame); } catch {}
            allPlayers.push({
              uuid,
              name: player.name,
              color: player.color,
              sessionId: player.sessionId,
              shameTokens: shame
            });
          });
        }
      } catch (error) {
        console.error(`Failed to get state for room ${room.roomId}:`, error);
      }
    }

    console.log(`[AdminAPI] Collected ${allPlayers.length} players for shuffle`);

    if (allPlayers.length === 0) {
      return res.json({ success: true, message: "No players found to shuffle" });
    }

    // 3. Shuffle players array
    const shuffledPlayers = [...allPlayers];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }

    // 4. Create groups of 2 players
    const playerGroups: any[][] = [];
    const extraPlayers: any[] = [];
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      if (i + 1 < shuffledPlayers.length) {
        playerGroups.push([shuffledPlayers[i], shuffledPlayers[i + 1]]);
      } else {
        extraPlayers.push(shuffledPlayers[i]);
      }
    }

    console.log(`[AdminAPI] Created ${playerGroups.length} player groups, ${extraPlayers.length} extra players`);

    // 5. Start shuffle process
    NameManager.getInstance().startShuffle();

    // 6. Assign players to rooms and roles randomly
    const assignments: { [roomId: string]: { p1: any; p2: any } } = {};
    // Shuffle rooms so pairs go to random rooms
    const shuffledRooms = [...roomsInfo];
    for (let i = shuffledRooms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRooms[i], shuffledRooms[j]] = [shuffledRooms[j], shuffledRooms[i]];
    }
    
    for (let i = 0; i < playerGroups.length && i < shuffledRooms.length; i++) {
      const group = playerGroups[i];
      const roomInfo = shuffledRooms[i];
      
      // Randomize roles P1/P2
      const [player1, player2] = Math.random() < 0.5 ? [group[0], group[1]] : [group[1], group[0]];
      
      assignments[roomInfo.roomId] = {
        p1: { ...player1, role: 'P1' },
        p2: { ...player2, role: 'P2' }
      };
      
      // Store assignments in NameManager for lobby redirects
      NameManager.getInstance().assignPlayerToRoom(player1.uuid, roomInfo.roomId, 'P1');
      NameManager.getInstance().assignPlayerToRoom(player2.uuid, roomInfo.roomId, 'P2');
    }

    // 7. Clear all rooms first
    console.log("[AdminAPI] Clearing all game rooms for shuffle...");
    const clearPromises = gameRooms.map(room => 
      matchMaker.remoteRoomCall(room.roomId, "executeAdminCommand", ["clearForShuffle"])
        .catch(error => console.error(`Failed to clear room ${room.roomId}:`, error))
    );

    // Clear current-room and reconnection tokens for all players to avoid resume during shuffle
    try {
      allPlayers.forEach(p => {
        const u = p.uuid;
        if (u) {
          NameManager.getInstance().clearCurrentRoom(u);
          (NameManager.getInstance() as any).clearReconnectToken?.(u);
        }
      });
    } catch {}

    await Promise.allSettled(clearPromises);

    // 8. Wait a bit for rooms to clear, then assign new players
    setTimeout(async () => {
      console.log("[AdminAPI] Assigning shuffled players to rooms...");
      
      const assignPromises = Object.entries(assignments).map(([roomId, assignment]) => 
        matchMaker.remoteRoomCall(roomId, "executeAdminCommand", ["assignShuffledPlayers", assignment])
          .catch(error => console.error(`Failed to assign players to room ${roomId}:`, error))
      );

      await Promise.allSettled(assignPromises);
      
      // Handle extra players - they go to lobby
      extraPlayers.forEach(player => {
        console.log(`[AdminAPI] Player ${player.name} will remain in lobby (odd number of players)`);
      });
      
      console.log("[AdminAPI] Player shuffle completed!");
      
      // Cleanup after a delay
      setTimeout(() => {
        NameManager.getInstance().endShuffle();
        broadcastDashboardUpdate();
      }, 10000); // 10 seconds for all players to reconnect
      
    }, 3000); // 3 seconds delay

    res.json({ 
      success: true, 
      message: `Shuffle initiated for ${allPlayers.length} players across ${gameRooms.length} rooms. ${playerGroups.length} pairs created, ${extraPlayers.length} players will go to lobby.` 
    });
    
  } catch (error) {
    console.error("[AdminAPI] Error shuffling players:", error);
    console.error("[AdminAPI] Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
    NameManager.getInstance().endShuffle(); // Cleanup on error
    
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to shuffle players", details: error instanceof Error ? error.message : String(error) });
    }
  }
});

// UUID allowlist endpoint
adminRouter.get("/admin/uuids", async (req: Request, res: Response) => {
  try {
    const uuids = listAllowedUuids();
    res.json({ count: getAllowedUuidCount(), uuids });
  } catch (error) {
    console.error("[AdminAPI] Error fetching UUIDs:", error);
    res.status(500).json({ error: "Failed to fetch UUIDs" });
  }
});

// UUID with names endpoint
adminRouter.get("/admin/uuids-with-names", async (req: Request, res: Response) => {
  try {
    const uuids = listAllowedUuids();
    const nameManager = NameManager.getInstance();
    
    const uuidsWithInfo = uuids.map(uuid => {
      const name = nameManager.getPlayerName(uuid);
      const color = nameManager.getPlayerColor(uuid);
      const shameTokens = nameManager.getShameTokens(uuid);
      return {
        uuid,
        name: name || null,
        hasName: !!name,
        color: color || null,
        shameTokens: shameTokens || 0
      };
    });
    
    res.json({ uuids: uuidsWithInfo });
  } catch (error) {
    console.error("[AdminAPI] Error fetching UUIDs with names:", error);
    res.status(500).json({ error: "Failed to fetch UUIDs with names" });
  }
});

// SSE endpoint for real-time dashboard updates
adminRouter.get("/dashboard-stream", (req: Request, res: Response) => {
  // Set SSE headers (hardened for reverse proxies)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform', // avoid proxy transformations
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // hint nginx to disable buffering
  });
  // Flush headers immediately so proxies establish the stream
  try { (res as any).flushHeaders?.(); } catch {}

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

// SSE endpoint for real-time UUIDs (allowlist + known names)
adminRouter.get("/uuids-stream", (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });
  try { (res as any).flushHeaders?.(); } catch {}

  sseUuidClients.add(res);
  console.log(`[AdminAPI] UUID SSE client connected. Total: ${sseUuidClients.size}`);

  // Initial push
  sendUuidsUpdate(res);

  req.on('close', () => {
    sseUuidClients.delete(res);
    console.log(`[AdminAPI] UUID SSE client disconnected. Total: ${sseUuidClients.size}`);
  });

  const heartbeat = setInterval(() => {
    if ((res as any).destroyed) {
      clearInterval(heartbeat);
      sseUuidClients.delete(res);
      return;
    }
    res.write(':heartbeat\n\n');
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

async function sendUuidsUpdate(client?: Response) {
  try {
    const uuids = listAllowedUuids();
    const nameManager = NameManager.getInstance();
    const payload = {
      count: (uuids || []).length,
      uuids: (uuids || []).map(uuid => ({
        uuid,
        name: nameManager.getPlayerName(uuid) || null,
        hasName: !!nameManager.getPlayerName(uuid)
      }))
    };
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    if (client) {
      if (!(client as any).destroyed) client.write(message);
    } else {
      const dead: Response[] = [];
      sseUuidClients.forEach(c => {
        if ((c as any).destroyed) dead.push(c);
        else {
          try { c.write(message); } catch { dead.push(c); }
        }
      });
      dead.forEach(c => sseUuidClients.delete(c));
    }
  } catch (error) {
    console.error('[AdminAPI] Error sending UUIDs SSE update:', error);
  }
}

// Function to broadcast dashboard updates (called from room events)
function broadcastDashboardUpdate() {
  sendDashboardUpdate();
  // Also push UUIDs updates for any name/assignment changes indirectly affected
  sendUuidsUpdate();
  sendPlayersActionsUpdate();
}

// SSE endpoint for per-player actions made (real-time)
adminRouter.get("/players-actions-stream", (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });
  try { (res as any).flushHeaders?.(); } catch {}

  ssePlayerActionsClients.add(res);
  console.log(`[AdminAPI] Player actions SSE client connected. Total: ${ssePlayerActionsClients.size}`);

  sendPlayersActionsUpdate(res);

  req.on('close', () => {
    ssePlayerActionsClients.delete(res);
    console.log(`[AdminAPI] Player actions SSE client disconnected. Total: ${ssePlayerActionsClients.size}`);
  });

  const heartbeat = setInterval(() => {
    if ((res as any).destroyed) {
      clearInterval(heartbeat);
      ssePlayerActionsClients.delete(res);
      return;
    }
    res.write(':heartbeat\n\n');
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

function isActionMade(kind: string, role?: string) {
  const k = (kind || '').toString();
  if (!k) return false;
  const prefix = k.slice(0,3).toLowerCase();
  if (prefix === 'p1_' || prefix === 'p2_') {
    const evRole = prefix === 'p1_' ? 'P1' : 'P2';
    return ((role || '').toUpperCase() === evRole);
  }
  // System/agnostic events are ignored for this stream; only actions list below are counted
  return false;
}

const ACTION_EVENTS = [
  'p1_propose','p1_no_offer','p2_snatch','p2_accept','p2_force','p2_no_force','p2_reject','p1_shame','p1_no_shame','p1_report','p1_no_report'
];

// Calculate scores based on game variant and role
function calculateScore(pavoTokens: number, eloteTokens: number, role: string): number {
  if (role === 'P1') {
    return pavoTokens * 1 + eloteTokens * 2;
  } else if (role === 'P2') {
    return pavoTokens * 2 + eloteTokens * 1;
  }
  return 0;
}

// Check if event triggers score calculation for the game variant
function isScoreEvent(kind: string, gameVariant: string): boolean {
  const variant = (gameVariant || '').toUpperCase();
  
  switch (variant) {
    case 'G1':
    case 'G2':
    case 'G5':
      return ['p1_no_offer', 'p2_accept', 'p2_reject', 'p2_snatch'].includes(kind);
    case 'G3':
      return ['p1_no_offer', 'p2_accept', 'p2_reject', 'p1_shame', 'p1_no_shame'].includes(kind);
    case 'G4':
      return ['p1_no_offer', 'p2_accept', 'p2_reject', 'p1_report', 'p1_no_report'].includes(kind);
    default:
      return false;
  }
}

async function sendPlayersActionsUpdate(client?: Response) {
  try {
    const nameManager = NameManager.getInstance();
    const uuids = nameManager.getAllKnownUuids?.() || [];
    
    const players = uuids.map((uuid: string) => {
      const history = nameManager.getSystemHistory(uuid) || [];
      const counts: any = Object.fromEntries(ACTION_EVENTS.map(k => [k, 0]));
      const detailedHistory: any[] = [];
      
      // Track room scores for this specific player
      const playerRoomScoreMap = new Map<string, Array<{
        round: number;
        variant: string;
        increment: number;
        score: number;
        role: string;
      }>>();
      
      // Track round/variant/increment combinations per room for this player
      const roomGameTracker = new Map<string, Map<string, number>>(); // roomId -> "round-variant" -> increment
      
      // First pass: process all events for score calculation
      for (const entry of history) {
        const kind = (entry as any)?.kind || '';
        const roomId = (entry as any)?.roomId;
        const round = (entry as any)?.round;
        const gameVariant = (entry as any)?.gameVariant || (entry as any)?.variant;
        const role = (entry as any)?.role;
        const pavoTokens = (entry as any)?.pavoTokens || 0;
        const eloteTokens = (entry as any)?.eloteTokens || 0;
        
        // Process score calculation if this is a score-triggering event
        if (roomId && round && gameVariant && isScoreEvent(kind, gameVariant) && (pavoTokens > 0 || eloteTokens > 0)) {
          // Track game progression for increment calculation
          if (!roomGameTracker.has(roomId)) {
            roomGameTracker.set(roomId, new Map());
          }
          
          const gameKey = `${round}-${gameVariant}`;
          const currentIncrement = roomGameTracker.get(roomId)!.get(gameKey) || 0;
          roomGameTracker.get(roomId)!.set(gameKey, currentIncrement + 1);
          
          // Calculate score
          const score = calculateScore(pavoTokens, eloteTokens, role);
          
          // Add to this player's room score history
          if (!playerRoomScoreMap.has(roomId)) {
            playerRoomScoreMap.set(roomId, []);
          }
          
          playerRoomScoreMap.get(roomId)!.push({
            round: parseInt(round),
            variant: gameVariant,
            increment: currentIncrement + 1,
            score,
            role
          });
        }
      }
      
      // Second pass: process action events for counts and detailed history
      for (const entry of history) {
        const kind = (entry as any)?.kind || '';
        const roomId = (entry as any)?.roomId;
        const round = (entry as any)?.round;
        const gameVariant = (entry as any)?.gameVariant || (entry as any)?.variant;
        const role = (entry as any)?.role;
        const timestamp = (entry as any)?.timestamp;
        
        if (!ACTION_EVENTS.includes(kind)) continue;
        if (!isActionMade(kind, role)) continue;
        counts[kind] = (counts[kind] || 0) + 1;
        
        // Include detailed event info
        detailedHistory.push({
          kind,
          round,
          gameVariant,
          roomId,
          timestamp
        });
      }
      
      // Build RoomScoreHistory array for this player
      const roomScoreHistory = Array.from(playerRoomScoreMap.entries()).map(([roomId, scores]) => ({
        roomId,
        scores: scores.sort((a, b) => {
          // Sort by round, then variant, then increment
          if (a.round !== b.round) return a.round - b.round;
          if (a.variant !== b.variant) return a.variant.localeCompare(b.variant);
          return a.increment - b.increment;
        })
      }));

      const total = ACTION_EVENTS.reduce((acc, k) => acc + (counts[k] || 0), 0);
      return {
        uuid,
        name: nameManager.getPlayerName(uuid) || null,
        counts,
        total,
        detailedHistory,
        rawHistory: history,
        roomScoreHistory,
        shameTokens: nameManager.getShameTokens(uuid)
      };
    }).filter((p: any) => p.total > 0 || p.name);

    // Build aggregated data across all players
    const aggregatedCounts: Record<string, number> = Object.fromEntries(ACTION_EVENTS.map(k => [k, 0])) as any;
    const aggregatedDetailedEvents: Array<{ kind: string; round?: number; gameVariant?: string; roomId?: string; playerUuid?: string; timestamp?: number }>[] = [] as any;

    const roomsIndex: Record<string, { roomId: string; lastSeenIndex: number; lastEventAt?: number; messageCount: number }> = {};
    let idxCounter = 0;
    players.forEach((p: any) => {
      // Sum counts
      ACTION_EVENTS.forEach(k => {
        const c = Number(p?.counts?.[k] || 0);
        aggregatedCounts[k] = (aggregatedCounts[k] || 0) + c;
      });
      // Flatten detailed history and build rooms index
      (Array.isArray(p?.detailedHistory) ? p.detailedHistory : []).forEach((ev: any) => {
        const e = {
          kind: String(ev?.kind || ''),
          round: ev?.round != null ? Number(ev.round) : undefined,
          gameVariant: (ev?.gameVariant || ev?.variant) ? String(ev.gameVariant || ev.variant) : undefined,
          roomId: ev?.roomId ? String(ev.roomId) : undefined,
          playerUuid: p.uuid,
          timestamp: ev?.timestamp != null ? Number(ev.timestamp) : undefined
        };
        aggregatedDetailedEvents.push(e as any);
        const rid = e.roomId || '';
        if (rid) {
          if (!roomsIndex[rid]) {
            roomsIndex[rid] = { roomId: rid, lastSeenIndex: idxCounter, messageCount: 0 };
          }
          roomsIndex[rid].lastSeenIndex = idxCounter; // newer index wins
          roomsIndex[rid].messageCount += 1;
          if (e.timestamp) {
            roomsIndex[rid].lastEventAt = Math.max(roomsIndex[rid].lastEventAt || 0, e.timestamp);
          }
          idxCounter += 1;
        }
      });
    });

    // Optionally include snapshot of active rooms similar to /dashboard-stream
    let activeRoomsPayload: any | undefined = undefined;
    try {
      const rooms = await matchMaker.query({});
      const activeRoomDetails: any[] = [];
      const activeCounts: Record<string, number> = Object.fromEntries(ACTION_EVENTS.map(k => [k, 0]));
      for (const room of rooms) {
        if (room.name === 'game') {
          try {
            const detailData: any = await matchMaker.remoteRoomCall(room.roomId, "getState");
            // Map systemMessages to detailed events
            const msgs = Array.isArray(detailData?.systemMessages) ? detailData.systemMessages : [];
            const systemMessages = msgs.map((m: any) => ({
              kind: String(m?.kind || ''),
              round: m?.round != null ? Number(m.round) : undefined,
              gameVariant: (m?.gameVariant || m?.variant) ? String(m.gameVariant || m.variant) : undefined,
              roomId: String(m?.roomId || room.roomId),
              timestamp: m?.timestamp != null ? Number(m.timestamp) : undefined
            }));
            // Count events present in ACTION_EVENTS
            systemMessages.forEach((m: any) => {
              if (ACTION_EVENTS.includes(m.kind)) {
                activeCounts[m.kind] = (activeCounts[m.kind] || 0) + 1;
              }
            });
            activeRoomDetails.push({
              roomId: room.roomId,
              name: room.name,
              metadata: {
                gameStatus: room.metadata?.gameStatus || 'unknown',
                currentVariant: room.metadata?.currentVariant || detailData?.variant || undefined,
                currentRound: room.metadata?.currentRound || detailData?.round || undefined
              },
              players: (Array.isArray(detailData?.players) ? detailData.players : []).map((p: any) => ({
                uuid: String(p?.uuid || p?.sessionId || ''),
                name: p?.name || null,
                color: p?.color || null
              })),
              systemMessages
            });
          } catch (error) {
            // Ignore errors per room to not break the stream
          }
        }
      }
      activeRoomsPayload = {
        rooms: activeRoomDetails,
        counts: activeCounts
      };
    } catch (e) {
      // If querying active rooms fails, omit activeRooms in payload
      activeRoomsPayload = undefined;
    }

    // Build summary metrics
    const playersWithNames = players.filter((p: any) => !!p.name).length;
    let totalP1 = 0, cntP1 = 0;
    let totalP2 = 0, cntP2 = 0;
    players.forEach((p: any) => {
      (Array.isArray(p?.roomScoreHistory) ? p.roomScoreHistory : []).forEach((rs: any) => {
        (Array.isArray(rs?.scores) ? rs.scores : []).forEach((s: any) => {
          if (s?.role === 'P1') { totalP1 += Number(s.score || 0); cntP1 += 1; }
          else if (s?.role === 'P2') { totalP2 += Number(s.score || 0); cntP2 += 1; }
        });
      });
    });
    const avgP1 = cntP1 > 0 ? totalP1 / cntP1 : 0;
    const avgP2 = cntP2 > 0 ? totalP2 / cntP2 : 0;
    const overallCnt = cntP1 + cntP2;
    const overallAvg = overallCnt > 0 ? (totalP1 + totalP2) / overallCnt : 0;

    const payload = {
      version: '1.0',
      timestamp: Date.now(),
      players,
      aggregated: {
        detailedEvents: aggregatedDetailedEvents,
        counts: aggregatedCounts,
        rooms: Object.values(roomsIndex)
      },
      activeRooms: activeRoomsPayload,
      summary: {
        totalPlayers: playersWithNames,
        playersWithShame: players.filter((p: any) => Number(p?.shameTokens || 0) > 0).length,
        playersWithoutShame: Math.max(0, playersWithNames - players.filter((p: any) => Number(p?.shameTokens || 0) > 0).length),
        averageScore: {
          p1: Number(avgP1.toFixed(2)),
          p2: Number(avgP2.toFixed(2)),
          overall: Number(overallAvg.toFixed(2))
        }
      }
    };
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    if (client) {
      if (!(client as any).destroyed) client.write(message);
    } else {
      const dead: Response[] = [];
      ssePlayerActionsClients.forEach(c => {
        if ((c as any).destroyed) dead.push(c);
        else { try { c.write(message); } catch { dead.push(c); } }
      });
      dead.forEach(c => ssePlayerActionsClients.delete(c));
    }
  } catch (error) {
    console.error('[AdminAPI] Error sending players actions SSE update:', error);
  }
}

// NameManager export endpoint
adminRouter.get("/admin/namemanager/export", async (req: Request, res: Response) => {
  try {
    const nameManager = NameManager.getInstance();
    const state = nameManager.exportState();
    res.json(state);
  } catch (error) {
    console.error('[AdminAPI] Error exporting nameManager state:', error);
    res.status(500).json({ error: 'Failed to export nameManager state' });
  }
});

// NameManager import endpoint
adminRouter.post("/admin/namemanager/import", async (req: Request, res: Response) => {
  try {
    const nameManager = NameManager.getInstance();
    const state = req.body;
    
    // Validate request size and format
    if (!state) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    if (!state.data) {
      return res.status(400).json({ 
        error: 'Invalid state format - missing data property',
        hint: 'Ensure you are uploading a valid .snatchSave file'
      });
    }
    
    console.log(`[AdminAPI] Importing nameManager state - Version: ${state.version || 'unknown'}`);
    
    nameManager.importState(state);
    
    // Broadcast update to SSE clients after importing
    await sendUuidsUpdate();
    await sendPlayersActionsUpdate();
    
    const importedUuids = nameManager.getAllKnownUuids().length;
    console.log(`[AdminAPI] Successfully imported nameManager state with ${importedUuids} UUIDs`);
    
    res.json({ 
      success: true, 
      message: `NameManager state imported successfully. Version: ${state.version || 'unknown'}, UUIDs: ${importedUuids}`,
      importedUuids
    });
  } catch (error) {
    console.error('[AdminAPI] Error importing nameManager state:', error);
    
    // Handle specific error types
    if (error instanceof Error && error.message && error.message.includes('PayloadTooLargeError')) {
      return res.status(413).json({ 
        error: 'File too large', 
        details: 'The save file is too large to process. Maximum size: 50MB' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to import nameManager state', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// In-memory storage for community messages
interface Message {
  id: string;
  content: string;
  timestamp: number;
}

let communityMessages: Message[] = [];

// GET /api/messages - Get all messages
adminRouter.get("/messages", async (req: Request, res: Response) => {
  try {
    res.json({ messages: communityMessages });
  } catch (error) {
    console.error('[AdminAPI] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Add a new message
adminRouter.post("/messages", async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }
    
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }
    
    if (trimmedContent.length > 500) {
      return res.status(400).json({ error: 'Content cannot exceed 500 characters' });
    }
    
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      content: trimmedContent,
      timestamp: Date.now()
    };
    
    communityMessages.push(message);
    
    // Keep only the last 1000 messages to prevent memory issues
    if (communityMessages.length > 1000) {
      communityMessages = communityMessages.slice(-1000);
    }
    
    console.log(`[AdminAPI] New message added: ${message.id.slice(0, 12)}... (${trimmedContent.length} chars)`);
    
    res.json({ 
      success: true, 
      message: 'Message added successfully',
      id: message.id 
    });
  } catch (error) {
    console.error('[AdminAPI] Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export { adminRouter, broadcastDashboardUpdate };
