import { Request, Response, Router } from "express";
import { matchMaker } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";

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

export { adminRouter };