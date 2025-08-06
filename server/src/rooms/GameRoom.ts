import { Room, Client } from "colyseus";
import { GameState } from "./schemas/GameState";
import { GameStatus } from "../../../shared/types";
import { NameManager } from "../utils/nameManager";

export class GameRoom extends Room<GameState> {
  maxClients = 2;
  private gameInterval?: NodeJS.Timeout;
  private readonly TICK_RATE = 1000; // Update every second

  onCreate(options: any) {
    this.setState(new GameState());
    this.state.roomId = this.roomId;

    this.onMessage("click", (client) => {
      this.handleClick(client);
    });

    this.onMessage("admin:pause", () => {
      this.state.pauseGame();
    });

    this.onMessage("admin:resume", () => {
      this.state.resumeGame();
    });

    this.onMessage("admin:restart", () => {
      this.handleRestart();
    });

    this.onMessage("admin:kick", (client, playerId: string) => {
      this.handleKick(playerId);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`[GameRoom] ${client.sessionId} joined room ${this.roomId} with name: ${options.playerName}`);

    // Use the playerName passed from the lobby - don't generate a new one!
    const playerName = options.playerName || "player";
    
    this.state.addPlayer(client.sessionId, playerName);

    client.send("playerInfo", {
      sessionId: client.sessionId,
      name: playerName,
      roomId: this.roomId
    });

    if (this.state.players.size === 2 && this.state.gameStatus === GameStatus.WAITING) {
      this.startGame();
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[GameRoom] ${client.sessionId} left room ${this.roomId}`);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
      // Don't release the name here - it's managed by the LobbyRoom
    }

    if (this.state.gameStatus === GameStatus.PLAYING) {
      if (this.getConnectedPlayersCount() < 2) {
        this.pauseGame();
      }
    }

    this.allowReconnection(client, 30);
  }

  async onReconnect(client: Client) {
    console.log(`[GameRoom] ${client.sessionId} reconnected to room ${this.roomId}`);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = true;
    }

    if (this.state.gameStatus === GameStatus.PAUSED && this.getConnectedPlayersCount() === 2) {
      this.state.resumeGame();
    }
  }

  onDispose() {
    console.log(`[GameRoom] Room ${this.roomId} disposing...`);
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }

    // Don't release names here - they're managed by the LobbyRoom
  }

  private startGame() {
    console.log(`[GameRoom] Starting game in room ${this.roomId}`);
    
    this.state.startGame();
    this.broadcast("gameStart");

    this.gameInterval = setInterval(() => {
      this.state.updateTimer(this.TICK_RATE / 1000);
      
      if (this.state.gameStatus === GameStatus.FINISHED) {
        this.endGame();
      }
    }, this.TICK_RATE);
  }

  private pauseGame() {
    console.log(`[GameRoom] Pausing game in room ${this.roomId}`);
    this.state.pauseGame();
    this.broadcast("gamePaused");
  }

  private endGame() {
    console.log(`[GameRoom] Game ended in room ${this.roomId}. Winner: ${this.state.winner}`);
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = undefined;
    }

    this.broadcast("gameEnd", {
      winner: this.state.winner,
      players: Array.from(this.state.players.values()).map(p => ({
        name: p.name,
        clicks: p.clicks
      }))
    });

    setTimeout(() => {
      this.state.restartGame();
      if (this.state.players.size === 2) {
        this.startGame();
      }
    }, 5000);
  }

  private handleClick(client: Client) {
    if (this.state.gameStatus !== GameStatus.PLAYING) {
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (player && player.connected) {
      player.incrementClicks();
    }
  }

  private handleRestart() {
    console.log(`[GameRoom] Admin restart in room ${this.roomId}`);
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = undefined;
    }

    this.state.restartGame();
    this.broadcast("gameRestart");

    if (this.state.players.size === 2) {
      setTimeout(() => this.startGame(), 2000);
    }
  }

  private handleKick(playerId: string) {
    console.log(`[GameRoom] Admin kick player ${playerId} from room ${this.roomId}`);
    
    const client = this.clients.find(c => c.sessionId === playerId);
    if (client) {
      client.leave(1000);
    }
  }

  private getConnectedPlayersCount(): number {
    let count = 0;
    this.state.players.forEach(player => {
      if (player.connected) count++;
    });
    return count;
  }

  getState() {
    return {
      roomId: this.roomId,
      players: Array.from(this.state.players.values()).map(p => ({
        sessionId: p.sessionId,
        name: p.name,
        clicks: p.clicks
      })),
      gameStatus: this.state.gameStatus,
      timeRemaining: this.state.timeRemaining,
      winner: this.state.winner
    };
  }
}