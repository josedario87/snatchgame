import { Room, Client, matchMaker } from "colyseus";
import { LobbyState, AvailableRoom } from "./schemas/LobbyState";
import { NameManager } from "../utils/nameManager";

export class LobbyRoom extends Room<LobbyState> {
  private updateInterval?: NodeJS.Timeout;
  private sessionToUuid: Map<string, string> = new Map();

  onCreate(options: any) {
    this.setState(new LobbyState());
    this.setPrivate(false);

    this.onMessage("setName", (client, data: { name: string; uuid: string }) => {
      this.handleSetName(client, data);
    });

    this.onMessage("setColor", (client, color: string) => {
      this.handleSetColor(client, color);
    });

    this.onMessage("quickPlay", (client) => {
      this.handleQuickPlay(client);
    });

    this.onMessage("joinRoom", (client, roomId: string) => {
      this.handleJoinRoom(client, roomId);
    });

    this.updateInterval = setInterval(() => {
      this.updateAvailableRooms();
    }, 2000);
  }

  onJoin(client: Client, options: any) {
    console.log(`[LobbyRoom] ${client.sessionId} joined lobby with UUID: ${options.uuid}`);
    
    // Store UUID mapping if provided
    if (options.uuid) {
      this.sessionToUuid.set(client.sessionId, options.uuid);
      
      // Check if this UUID already has a name
      const existingName = NameManager.getInstance().getPlayerName(options.uuid);
      this.state.addPlayer(client.sessionId, existingName || "");
      
      client.send("welcome", {
        sessionId: client.sessionId,
        name: existingName || "",
        color: this.state.players.get(client.sessionId)?.color || "#667eea"
      });
    } else {
      // Fallback for clients without UUID (shouldn't happen in normal flow)
      this.state.addPlayer(client.sessionId, "");
      client.send("welcome", {
        sessionId: client.sessionId,
        color: this.state.players.get(client.sessionId)?.color || "#667eea"
      });
    }

    this.updateAvailableRooms();
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[LobbyRoom] ${client.sessionId} left lobby`);
    
    // Clean up UUID mapping
    this.sessionToUuid.delete(client.sessionId);
    
    this.state.removePlayer(client.sessionId);
  }

  onDispose() {
    console.log("[LobbyRoom] Disposing lobby room");
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Clear UUID mappings
    this.sessionToUuid.clear();
  }

  private handleSetName(client: Client, data: { name: string; uuid: string }) {
    const currentPlayer = this.state.players.get(client.sessionId);
    if (!currentPlayer) return;

    // Update UUID mapping if provided
    if (data.uuid) {
      this.sessionToUuid.set(client.sessionId, data.uuid);
    }
    
    const uuid = this.sessionToUuid.get(client.sessionId) || client.sessionId;
    const uniqueName = NameManager.getInstance().generateUniquePlayerName(data.name, uuid);
    
    currentPlayer.name = uniqueName;

    client.send("nameUpdated", {
      name: uniqueName
    });
  }

  private handleSetColor(client: Client, color: string) {
    const currentPlayer = this.state.players.get(client.sessionId);
    if (!currentPlayer) return;
    const sanitized = (color || '').toString().trim();
    // Basic validation for hex color (#rgb or #rrggbb)
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(sanitized)) {
      return;
    }
    currentPlayer.color = sanitized;
    client.send("colorUpdated", { color: sanitized });
  }

  private async handleQuickPlay(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.inGame) return;
    // Prevent players without a confirmed name from joining games
    if (!player.name || !player.name.trim()) {
      client.send("error", { message: "Please set a name before joining a game." });
      return;
    }

    try {
      // First try to find an available room
      const rooms = await matchMaker.query({ name: "game", locked: false });
      let targetRoomId: string;
      
      // Find a room with less than 2 players
      const availableRoom = rooms.find(room => room.clients < 2);
      
      if (availableRoom) {
        targetRoomId = availableRoom.roomId;
      } else {
        // If no room available, create a new one
        const newRoom = await matchMaker.createRoom("game", {});
        targetRoomId = newRoom.roomId;
      }

      this.state.setPlayerInGame(client.sessionId, true);

      // Send the roomId to the client
      client.send("gameJoined", {
        roomId: targetRoomId
      });

      // Don't auto-leave, let the client handle it
      // The client will leave the lobby after successfully joining the game room

    } catch (error) {
      console.error("[LobbyRoom] Error in quick play:", error);
      client.send("error", {
        message: "Could not find or create a game room"
      });
    }
  }

  private async handleJoinRoom(client: Client, roomId: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.inGame) return;
    if (!player.name || !player.name.trim()) {
      client.send("error", { message: "Please set a name before joining a game." });
      return;
    }

    try {
      // Verify the room exists and is available
      const rooms = await matchMaker.query({ roomId });
      
      const status = rooms[0]?.metadata?.gameStatus || "waiting";
      if (rooms.length === 0 || rooms[0].clients >= 2 || status !== "waiting") {
        throw new Error("Room not available");
      }

      this.state.setPlayerInGame(client.sessionId, true);

      // Send the roomId to the client
      client.send("gameJoined", {
        roomId: roomId
      });

      // Don't auto-leave, let the client handle it
      // The client will leave the lobby after successfully joining the game room

    } catch (error) {
      console.error("[LobbyRoom] Error joining room:", error);
      client.send("error", {
        message: "Could not join the selected room"
      });
    }
  }

  private async updateAvailableRooms() {
    try {
      const rooms = await matchMaker.query({ name: "game" });
      
      const availableRooms = rooms
        .filter(room => (room.metadata?.gameStatus || "waiting") === "waiting" && room.clients < 2)
        .map(room => new AvailableRoom(
          room.roomId,
          room.clients,
          room.metadata?.gameStatus || "waiting"
        ));

      this.state.updateAvailableRooms(availableRooms);

    } catch (error) {
      console.error("[LobbyRoom] Error updating available rooms:", error);
    }
  }
}