import { Client, Room } from "colyseus.js";
import { ref, Ref } from "vue";
import { localDB } from "./db";

export interface PlayerData {
  sessionId: string;
  name: string;
  clicks: number;
  connected?: boolean;
}

export interface LobbyPlayer {
  sessionId: string;
  name: string;
  inGame: boolean;
}

export interface AvailableRoom {
  roomId: string;
  playerCount: number;
  status: string;
}

class ColyseusService {
  private client: Client;
  private currentRoom: Room | null = null;
  private apiBase: string;
  private readonly LS_KEY_RECONNECT = "snatch.game.rtoken";
  
  public lobbyRoom: Ref<Room | null> = ref(null);
  public gameRoom: Ref<Room | null> = ref(null);
  public playerName: Ref<string> = ref("");
  public sessionId: Ref<string> = ref("");
  public playerColor: Ref<string> = ref("#667eea");
  public nameConfirmed: Ref<boolean> = ref(false);

  constructor() {
    const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const defaultProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    const defaultPort = 3000;
    const fallbackUrl = `${defaultProtocol}://${defaultHost}:${defaultPort}`;
    const url = import.meta.env.VITE_WS_URL || fallbackUrl;
    this.client = new Client(url);

    const httpProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "https" : "http";
    const apiFallback = `${httpProtocol}://${defaultHost}:${defaultPort}/api`;
    this.apiBase = (import.meta.env as any).VITE_API_URL || apiFallback;
  }

  async joinLobby(): Promise<Room> {
    try {
      const room = await this.client.joinOrCreate("lobby");
      this.lobbyRoom.value = room;
      this.currentRoom = room;
      // Require explicit confirmation each time we join the lobby (auto-confirm if saved name exists)
      this.nameConfirmed.value = false;

      room.onMessage("welcome", async (data) => {
        this.sessionId.value = data.sessionId;
        if (data.color) this.playerColor.value = data.color;
        // Initialize local DB and optionally auto-apply saved profile
        try {
          await localDB.init();
          const profile = localDB.getLocalPlayer();
          // Apply saved color silently
          if (profile?.color && profile.color !== this.playerColor.value) {
            this.setPlayerColor(profile.color);
          }
          if (profile?.name) {
            this.playerName.value = profile.name;
            try { localDB.setName(profile.name); } catch {}
            this.setPlayerName(profile.name);
            this.nameConfirmed.value = true;
          }
        } catch (e) {
          console.warn("Local DB init failed", e);
        }
      });

      room.onMessage("nameUpdated", (data) => {
        this.playerName.value = data.name;
        try { localDB.setName(data.name); } catch {}
        this.nameConfirmed.value = true;
      });

      room.onMessage("colorUpdated", (data) => {
        if (data?.color) {
          this.playerColor.value = data.color;
          try { localDB.setColor(data.color); } catch {}
        }
      });

      return room;
    } catch (error) {
      console.error("Failed to join lobby:", error);
      throw error;
    }
  }

  async tryReconnectToOngoingGame(): Promise<Room | null> {
    try {
      const token = typeof window !== 'undefined' ? (window.localStorage.getItem(this.LS_KEY_RECONNECT) || "") : "";
      if (!token) return null;
      const room = await this.client.reconnect(token);
      this.gameRoom.value = room;
      this.currentRoom = room;
      // Ensure local session id reflects the active room session
      try { this.sessionId.value = (room as any).sessionId || this.sessionId.value; } catch {}
      try { if (typeof window !== 'undefined') window.localStorage.setItem(this.LS_KEY_RECONNECT, (room as any).reconnectionToken || token); } catch {}
      return room;
    } catch (e) {
      console.warn('Reconnection failed, clearing tokens');
      try {
        if (typeof window !== 'undefined') { window.localStorage.removeItem(this.LS_KEY_RECONNECT); }
      } catch {}
      return null;
    }
  }

  async setPlayerName(name: string): Promise<void> {
    if (this.lobbyRoom.value) {
      this.lobbyRoom.value.send("setName", name);
    }
  }

  async setPlayerColor(color: string): Promise<void> {
    if (this.lobbyRoom.value) {
      this.lobbyRoom.value.send("setColor", color);
    }
  }

  async quickPlay(): Promise<Room> {
    if (!this.lobbyRoom.value) {
      throw new Error("Not in lobby");
    }

    return new Promise((resolve, reject) => {
      const room = this.lobbyRoom.value!;
      console.log('Sending quickPlay message to lobby...');
      
      const handleGameJoined = async (data: any) => {
        console.log('Received gameJoined with roomId:', data.roomId);
        try {
          // Join the game room directly using the roomId
          console.log('Joining game room with name:', this.playerName.value);
          const gameRoom = await this.client.joinById(data.roomId, {
            playerName: this.playerName.value,
            playerColor: this.playerColor.value
          });
          
          // Ensure the room id is set
          if (!gameRoom.id) {
            gameRoom.id = data.roomId;
          }
          
          console.log('Successfully joined game room:', gameRoom.id, gameRoom);
          console.log('Setting gameRoom.value...');
          this.gameRoom.value = gameRoom;
          this.currentRoom = gameRoom;
          // Update current session id for correct role mapping
          try { this.sessionId.value = (gameRoom as any).sessionId || this.sessionId.value; } catch {}
          try { if (typeof window !== 'undefined') window.localStorage.setItem(this.LS_KEY_RECONNECT, (gameRoom as any).reconnectionToken || ""); } catch {}
          console.log('gameRoom.value is now:', this.gameRoom.value);
          
          // Don't register message handlers here - let the Game component handle them
          
          resolve(gameRoom);
        } catch (error) {
          console.error('Error joining game room:', error);
          reject(error);
        }
      };

      const handleError = (error: any) => {
        console.error('Received error from lobby:', error);
        reject(new Error(error.message));
      };

      room.onMessage("gameJoined", handleGameJoined);
      room.onMessage("error", handleError);

      room.send("quickPlay");
    });
  }

  async joinGameRoom(roomId: string): Promise<Room> {
    try {
      const gameRoom = await this.client.joinById(roomId, {
      playerName: this.playerName.value,
      playerColor: this.playerColor.value
      });
      try { this.sessionId.value = (gameRoom as any).sessionId || this.sessionId.value; } catch {}
      try { if (typeof window !== 'undefined') window.localStorage.setItem(this.LS_KEY_RECONNECT, (gameRoom as any).reconnectionToken || ""); } catch {}
      this.gameRoom.value = gameRoom;
      this.currentRoom = gameRoom;
      
      // Don't register message handlers here - let the Game component handle them
      
      return gameRoom;
    } catch (error) {
      console.error("Failed to join game room:", error);
      throw error;
    }
  }

  sendClick(): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("click");
    }
  }

  // Demo game helpers
  setVariant(variant: string): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("setVariant", variant);
    }
  }

  p2Force(force: boolean): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("p2Force", force);
    }
  }

  p1Action(action: 'offer' | 'no_offer' | 'forced_offer'): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("p1Action", action);
    }
  }

  p2Action(action: 'accept' | 'reject' | 'snatch'): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("p2Action", action);
    }
  }

  report(report: boolean): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("report", report);
    }
  }

  assignShame(assign: boolean): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("assignShame", assign);
    }
  }

  proposeOffer(offerPavo: number, offerElote: number, requestPavo: number, requestElote: number): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("proposeOffer", { offerPavo, offerElote, requestPavo, requestElote });
    }
  }

  noOffer(): void {
    if (this.gameRoom.value) {
      this.gameRoom.value.send("noOffer");
    }
  }

  leaveLobby(): void {
    console.log('leaveLobby called');
    if (this.lobbyRoom.value) {
      this.lobbyRoom.value.leave();
      this.lobbyRoom.value = null;
      if (this.currentRoom === this.lobbyRoom.value) {
        this.currentRoom = null;
      }
    }
  }

  leaveGame(): void {
    console.log('leaveGame called');
    if (this.gameRoom.value) {
      this.gameRoom.value.leave();
      this.gameRoom.value = null;
      if (this.currentRoom === this.gameRoom.value) {
        this.currentRoom = null;
      }
    }
    try { if (typeof window !== 'undefined') { window.localStorage.removeItem(this.LS_KEY_RECONNECT); } } catch {}
  }

  leaveCurrentRoom(): void {
    console.log('leaveCurrentRoom called - THIS SHOULD NOT BE USED');
    // This method is deprecated - use leaveLobby() or leaveGame() instead
    if (this.currentRoom) {
      this.currentRoom.leave();
      this.currentRoom = null;
      this.gameRoom.value = null;
      this.lobbyRoom.value = null;
    }
  }

  async fetchRooms(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiBase}/rooms`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      return [];
    }
  }

  async fetchRoomStats(roomId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/rooms/${roomId}/stats`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch room stats:", error);
      return null;
    }
  }

  async pauseRoom(roomId: string): Promise<void> {
    await fetch(`${this.apiBase}/rooms/${roomId}/pause`, { method: "POST" });
  }

  async resumeRoom(roomId: string): Promise<void> {
    await fetch(`${this.apiBase}/rooms/${roomId}/resume`, { method: "POST" });
  }

  async restartRoom(roomId: string): Promise<void> {
    await fetch(`${this.apiBase}/rooms/${roomId}/restart`, { method: "POST" });
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    await fetch(`${this.apiBase}/rooms/${roomId}/kick/${playerId}`, { method: "POST" });
  }

  async fetchGlobalStats(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/stats`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch global stats:", error);
      return null;
    }
  }
}

export const colyseusService = new ColyseusService();
