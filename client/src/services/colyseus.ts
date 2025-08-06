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
  
  public lobbyRoom: Ref<Room | null> = ref(null);
  public gameRoom: Ref<Room | null> = ref(null);
  public playerName: Ref<string> = ref("");
  public sessionId: Ref<string> = ref("");

  constructor() {
    this.client = new Client("ws://localhost:3000");
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

  async quickPlay(): Promise<void> {
    if (this.lobbyRoom.value) {
      return new Promise((resolve, reject) => {
        const room = this.lobbyRoom.value!;
        
        room.onMessage("roomReservation", async (reservation) => {
          try {
            await this.joinGameByReservation(reservation);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        room.onMessage("error", (error) => {
          reject(new Error(error.message));
        });

        room.send("quickPlay");
      });
    }
  }

  async joinGameRoom(roomId: string): Promise<void> {
    if (this.lobbyRoom.value) {
      return new Promise((resolve, reject) => {
        const room = this.lobbyRoom.value!;
        
        room.onMessage("roomReservation", async (reservation) => {
          try {
            await this.joinGameByReservation(reservation);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        room.onMessage("error", (error) => {
          reject(new Error(error.message));
        });

        room.send("joinRoom", roomId);
      });
    }
  }

  private async joinGameByReservation(reservation: any): Promise<void> {
    try {
      const room = await this.client.consumeSeatReservation(reservation);
      this.gameRoom.value = room;
      this.currentRoom = room;

      room.onMessage("playerInfo", (data) => {
        this.sessionId.value = data.sessionId;
        this.playerName.value = data.name;
      });

      if (this.lobbyRoom.value) {
        this.lobbyRoom.value.leave();
        this.lobbyRoom.value = null;
      }
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

  leaveCurrentRoom(): void {
    if (this.currentRoom) {
      this.currentRoom.leave();
      this.currentRoom = null;
      this.gameRoom.value = null;
      this.lobbyRoom.value = null;
    }
  }

  async fetchRooms(): Promise<any[]> {
    try {
      const response = await fetch("http://localhost:3000/api/rooms");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      return [];
    }
  }

  async fetchRoomStats(roomId: string): Promise<any> {
    try {
      const response = await fetch(`http://localhost:3000/api/rooms/${roomId}/stats`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch room stats:", error);
      return null;
    }
  }

  async pauseRoom(roomId: string): Promise<void> {
    await fetch(`http://localhost:3000/api/rooms/${roomId}/pause`, { method: "POST" });
  }

  async resumeRoom(roomId: string): Promise<void> {
    await fetch(`http://localhost:3000/api/rooms/${roomId}/resume`, { method: "POST" });
  }

  async restartRoom(roomId: string): Promise<void> {
    await fetch(`http://localhost:3000/api/rooms/${roomId}/restart`, { method: "POST" });
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    await fetch(`http://localhost:3000/api/rooms/${roomId}/kick/${playerId}`, { method: "POST" });
  }

  async fetchGlobalStats(): Promise<any> {
    try {
      const response = await fetch("http://localhost:3000/api/stats");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch global stats:", error);
      return null;
    }
  }
}

export const colyseusService = new ColyseusService();