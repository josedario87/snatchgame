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
  private desiredName: string | null = null;
  private nameRetryCount: number = 0;
  private nameRetryTimer: any = null;
  private readonly LS_KEY_NAME = "snatch.player.name";
  private readonly LS_KEY_COLOR = "snatch.player.color";
  
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
    // Hydrate from localStorage for immediate UI
    try {
      const savedName = typeof window !== 'undefined' ? (window.localStorage.getItem(this.LS_KEY_NAME) || "") : "";
      const savedColor = typeof window !== 'undefined' ? (window.localStorage.getItem(this.LS_KEY_COLOR) || "") : "";
      if (savedName) this.playerName.value = savedName;
      if (savedColor) this.playerColor.value = savedColor;
    } catch {}
  }

  async joinLobby(): Promise<Room> {
    try {
      const room = await this.client.joinOrCreate("lobby");
      this.lobbyRoom.value = room;
      this.currentRoom = room;
      // Require explicit confirmation each time we join the lobby
      this.nameConfirmed.value = false;
      // Clear any pending name retry from previous sessions
      this.desiredName = null;
      this.nameRetryCount = 0;
      if (this.nameRetryTimer) { clearTimeout(this.nameRetryTimer); this.nameRetryTimer = null; }

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
          let candidateName = profile?.name || "";
          if (!candidateName) {
            try { candidateName = typeof window !== 'undefined' ? (window.localStorage.getItem(this.LS_KEY_NAME) || "") : ""; } catch {}
          }
          if (candidateName) {
            this.playerName.value = candidateName;
            try { localDB.setName(candidateName); } catch {}
            this.claimSavedName(candidateName);
          }
        } catch (e) {
          console.warn("Local DB init failed", e);
          // Fallback purely to localStorage
          try {
            const candidateName = typeof window !== 'undefined' ? (window.localStorage.getItem(this.LS_KEY_NAME) || "") : "";
            if (candidateName) {
              this.playerName.value = candidateName;
              this.claimSavedName(candidateName);
            }
          } catch {}
        }
      });

      room.onMessage("nameUpdated", (data) => {
        this.playerName.value = data.name;
        try { localDB.setName(data.name); } catch {}
        try { if (typeof window !== 'undefined') window.localStorage.setItem(this.LS_KEY_NAME, data.name || ""); } catch {}
        this.nameConfirmed.value = true;

        // If we are trying to reclaim a saved name and got a suffixed one, retry briefly.
        if (this.desiredName) {
          const desired = (this.desiredName || "").trim().toLowerCase();
          const got = (data.name || "").trim().toLowerCase();
          if (desired && desired !== got && this.nameRetryCount < 2) {
            const attempt = ++this.nameRetryCount;
            if (this.nameRetryTimer) clearTimeout(this.nameRetryTimer);
            this.nameRetryTimer = setTimeout(() => {
              // Attempt again; if the previous session has now left, exact name may be free
              this.setPlayerName(this.desiredName || "");
            }, attempt * 400);
            return;
          }
          // Either matched desired or exceeded retries; stop retrying
          this.desiredName = null;
          this.nameRetryCount = 0;
          if (this.nameRetryTimer) { clearTimeout(this.nameRetryTimer); this.nameRetryTimer = null; }
        }
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

  async setPlayerName(name: string): Promise<void> {
    if (this.lobbyRoom.value) {
      this.lobbyRoom.value.send("setName", name);
      try { if (typeof window !== 'undefined') window.localStorage.setItem(this.LS_KEY_NAME, name || ""); } catch {}
    }
  }

  // Attempt to reclaim the saved name with a short retry window to avoid race
  private claimSavedName(name: string): void {
    this.desiredName = name;
    this.nameRetryCount = 0;
    if (this.nameRetryTimer) { clearTimeout(this.nameRetryTimer); this.nameRetryTimer = null; }
    // Small delay to let any previous session fully leave the lobby
    this.nameRetryTimer = setTimeout(() => {
      this.setPlayerName(name);
      this.nameConfirmed.value = true;
    }, 150);
  }

  async setPlayerColor(color: string): Promise<void> {
    if (this.lobbyRoom.value) {
      this.lobbyRoom.value.send("setColor", color);
      try { if (typeof window !== 'undefined') window.localStorage.setItem(this.LS_KEY_COLOR, color || ""); } catch {}
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
