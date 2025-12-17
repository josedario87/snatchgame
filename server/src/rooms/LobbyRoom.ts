import { Room, Client, matchMaker } from "colyseus";
import { LobbyState, AvailableRoom } from "./schemas/LobbyState";
import { NameManager } from "../utils/nameManager";
import { isUuidAllowed } from "../utils/uuidRegistry";

export class LobbyRoom extends Room<LobbyState> {
  private updateInterval?: NodeJS.Timeout;
  private sessionToUuid: Map<string, string> = new Map();
  
  // Generate a random dark-ish color (for white backgrounds)
  private randomDarkHex(): string {
    const h = Math.floor(Math.random() * 360);
    const s = 65 + Math.floor(Math.random() * 20); // 65% - 85%
    const l = 30 + Math.floor(Math.random() * 10); // 30% - 40%
    return this.hslToHex(h, s, l);
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

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

    // Client asks server to suggest a resume target (after listeners are ready)
    this.onMessage("resumeMe", async (client) => {
      const uuid = this.sessionToUuid.get(client.sessionId);
      if (!uuid) return;

      // If shuffle in progress and an assignment exists, prefer it
      if (NameManager.getInstance().isShuffleInProgress()) {
        const assignment = NameManager.getInstance().getPlayerRoomAssignment(uuid);
        if (assignment) {
          try {
            const delay = assignment.role === 'P1' ? 150 : 750; // stagger joins to avoid full race
            const playerName = NameManager.getInstance().getPlayerName(uuid) || "";
            const playerColor = NameManager.getInstance().getPlayerColor(uuid) || "#667eea";
            
            setTimeout(() => {
              try { 
                client.send("shuffleRedirect", { 
                  roomId: assignment.roomId,
                  role: assignment.role,
                  playerName,
                  playerColor,
                  isShuffleJoin: true
                }); 
              } catch {}
            }, delay);
          } catch {}
          return;
        }
      }

      // Otherwise, try current room mapping
      try {
        const currentRoomId = NameManager.getInstance().getCurrentRoom(uuid);
        if (currentRoomId) {
          const rooms = await matchMaker.query({ roomId: currentRoomId });
          const room = rooms[0];
          if (room) {
            const token = NameManager.getInstance().getReconnectToken(uuid);
            if (token) { client.send("resumeReconnection", { token }); }
            else { client.send("resumeGame", { roomId: currentRoomId }); }
          }
        }
      } catch {}
    });

    this.updateInterval = setInterval(() => {
      this.updateAvailableRooms();
    }, 2000);
  }

  async onJoin(client: Client, options: any) {
    console.log(`[LobbyRoom] ${client.sessionId} joined lobby with UUID: ${options.uuid}`);
    // Enforce UUID presence and allowlist (if configured)
    if (!options.uuid || !isUuidAllowed(options.uuid)) {
      try { client.send("error", { message: "UUID inválido o faltante" }); } catch {}
      try { client.leave(1000); } catch {}
      return;
    }
    
    // Store UUID mapping if provided
    if (options.uuid) {
      this.sessionToUuid.set(client.sessionId, options.uuid);

      // (duplicate resume check removed; handled below with await)
      // Check for shuffle redirect FIRST
      if (NameManager.getInstance().isShuffleInProgress()) {
        const assignment = NameManager.getInstance().getPlayerRoomAssignment(options.uuid);
        if (assignment) {
          console.log(`[LobbyRoom] Redirecting shuffled player ${options.uuid} to room ${assignment.roomId} as ${assignment.role}`);
          
          // Add player temporarily to lobby state
          const existingName = NameManager.getInstance().getPlayerName(options.uuid);
          this.state.addPlayer(client.sessionId, existingName || "");
          const p = this.state.players.get(client.sessionId);
          if (p) {
            let color = NameManager.getInstance().getPlayerColor(options.uuid);
            if (!color) {
              color = this.randomDarkHex();
              NameManager.getInstance().setPlayerColor(options.uuid, color);
            }
            p.color = color;
          }
          
          // Send welcome first
          client.send("welcome", {
            sessionId: client.sessionId,
            name: existingName || "",
            color: this.state.players.get(client.sessionId)?.color || "#667eea"
          });
          // Do not push immediate redirect here; client will send "resumeMe" after handlers are ready

          return;
        }
      }
      
      // If not in shuffle, check if UUID has active current room to resume
      try {
        const currentRoomId = NameManager.getInstance().getCurrentRoom(options.uuid);
        if (currentRoomId) {
          const rooms = await matchMaker.query({ roomId: currentRoomId });
          const room = rooms[0];
          if (room) {
            const token = NameManager.getInstance().getReconnectToken(options.uuid);
            if (token) {
              client.send("resumeReconnection", { token });
            } else {
              client.send("resumeGame", { roomId: currentRoomId });
            }
            return; // Don't proceed with normal lobby join
          }
        }
      } catch {}

      // Normal lobby join flow
      // Check if this UUID already has a name
      const existingName = NameManager.getInstance().getPlayerName(options.uuid);
      this.state.addPlayer(client.sessionId, existingName || "");
      const p = this.state.players.get(client.sessionId);
      if (p) {
        let color = NameManager.getInstance().getPlayerColor(options.uuid);
        if (!color) {
          color = this.randomDarkHex();
          NameManager.getInstance().setPlayerColor(options.uuid, color);
        }
        p.color = color;
      }
      
      client.send("welcome", {
        sessionId: client.sessionId,
        name: existingName || "",
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
    const uniqueName = NameManager.getInstance().setPlayerName(uuid, data.name);
    
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
    const uuid = this.sessionToUuid.get(client.sessionId) || client.sessionId;
    NameManager.getInstance().setPlayerColor(uuid, sanitized);
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

  private async handleJoinRoom(client: Client, roomId: string, opts?: { force?: boolean }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.inGame) return;
    if (!player.name || !player.name.trim()) {
      client.send("error", { message: "Please set a name before joining a game." });
      return;
    }

    try {
      if (!opts?.force) {
        // Verify the room exists and is available
        const rooms = await matchMaker.query({ roomId });
        const status = rooms[0]?.metadata?.gameStatus || "waiting";
        if (rooms.length === 0 || rooms[0].clients >= 2 || status !== "waiting") {
          throw new Error("Room not available");
        }
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
