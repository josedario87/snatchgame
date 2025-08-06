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
      const reservation = await matchMaker.joinOrCreate("game", {
        playerName: player.name
      });

      this.state.setPlayerInGame(client.sessionId, true);

      client.send("roomReservation", {
        sessionId: reservation.sessionId,
        room: reservation.room
      });

      setTimeout(() => {
        client.leave();
      }, 1000);

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
      const reservation = await matchMaker.joinById(roomId, {
        playerName: player.name
      });

      this.state.setPlayerInGame(client.sessionId, true);

      client.send("roomReservation", {
        sessionId: reservation.sessionId,
        room: reservation.room
      });

      setTimeout(() => {
        client.leave();
      }, 1000);

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