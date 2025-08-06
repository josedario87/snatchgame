import { Room, Client, matchMaker } from "colyseus";
import { LobbyState, AvailableRoom } from "./schemas/LobbyState";
import { NameManager } from "../utils/nameManager";

export class LobbyRoom extends Room<LobbyState> {
  private updateInterval?: NodeJS.Timeout;

  onCreate(options: any) {
    this.setState(new LobbyState());
    this.setPrivate(false);

    this.onMessage("setName", (client, playerName: string) => {
      this.handleSetName(client, playerName);
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
    console.log(`[LobbyRoom] ${client.sessionId} joined lobby`);
    
    const defaultName = `guest`;
    const uniqueName = NameManager.getInstance().generateUniquePlayerName(defaultName, client.sessionId);
    
    this.state.addPlayer(client.sessionId, uniqueName);

    client.send("welcome", {
      sessionId: client.sessionId,
      assignedName: uniqueName
    });

    this.updateAvailableRooms();
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[LobbyRoom] ${client.sessionId} left lobby`);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      NameManager.getInstance().releasePlayerName(client.sessionId);
    }
    
    this.state.removePlayer(client.sessionId);
  }

  onDispose() {
    console.log("[LobbyRoom] Disposing lobby room");
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.state.players.forEach(player => {
      NameManager.getInstance().releasePlayerName(player.sessionId);
    });
  }

  private handleSetName(client: Client, playerName: string) {
    const currentPlayer = this.state.players.get(client.sessionId);
    if (!currentPlayer) return;

    NameManager.getInstance().releasePlayerName(client.sessionId);
    
    const uniqueName = NameManager.getInstance().generateUniquePlayerName(playerName, client.sessionId);
    
    currentPlayer.name = uniqueName;

    client.send("nameUpdated", {
      name: uniqueName
    });
  }

  private async handleQuickPlay(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.inGame) return;

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

    try {
      // Verify the room exists and is available
      const rooms = await matchMaker.query({ roomId });
      
      if (rooms.length === 0 || rooms[0].clients >= 2) {
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
        .filter(room => !room.locked && room.clients < 2)
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