import { Client, Room } from "colyseus.js";
import { ref, Ref } from "vue";

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
  
  public lobbyRoom: Ref<Room | null> = ref(null);
  public gameRoom: Ref<Room | null> = ref(null);
  public playerName: Ref<string> = ref("");
  public sessionId: Ref<string> = ref("");

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

      room.onMessage("welcome", (data) => {
        this.sessionId.value = data.sessionId;
        this.playerName.value = data.assignedName;
      });

      room.onMessage("nameUpdated", (data) => {
        this.playerName.value = data.name;
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
            playerName: this.playerName.value
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
        playerName: this.playerName.value
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
