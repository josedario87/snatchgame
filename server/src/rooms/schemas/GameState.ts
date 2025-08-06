import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player";
import { GameStatus } from "../../../../shared/types";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameStatus: GameStatus = GameStatus.WAITING;
  @type("number") timeRemaining: number = 600; // 10 minutes in seconds
  @type("string") winner: string = "";
  @type("number") startTime: number = 0;
  @type("string") roomId: string = "";

  constructor() {
    super();
  }

  addPlayer(sessionId: string, name: string): Player {
    const player = new Player(sessionId, name);
    this.players.set(sessionId, player);
    return player;
  }

  removePlayer(sessionId: string): void {
    this.players.delete(sessionId);
  }

  startGame(): void {
    this.gameStatus = GameStatus.PLAYING;
    this.startTime = Date.now();
    this.timeRemaining = 600;
    this.resetAllPlayers();
  }

  pauseGame(): void {
    if (this.gameStatus === GameStatus.PLAYING) {
      this.gameStatus = GameStatus.PAUSED;
    }
  }

  resumeGame(): void {
    if (this.gameStatus === GameStatus.PAUSED) {
      this.gameStatus = GameStatus.PLAYING;
    }
  }

  finishGame(): void {
    this.gameStatus = GameStatus.FINISHED;
    this.determineWinner();
  }

  restartGame(): void {
    this.gameStatus = GameStatus.WAITING;
    this.timeRemaining = 600;
    this.winner = "";
    this.startTime = 0;
    this.resetAllPlayers();
  }

  private resetAllPlayers(): void {
    this.players.forEach(player => player.reset());
  }

  private determineWinner(): void {
    let maxClicks = -1;
    let winner = "";

    this.players.forEach(player => {
      if (player.clicks > maxClicks) {
        maxClicks = player.clicks;
        winner = player.name;
      }
    });

    this.winner = winner;
  }

  updateTimer(deltaTime: number): void {
    if (this.gameStatus === GameStatus.PLAYING && this.timeRemaining > 0) {
      this.timeRemaining -= deltaTime;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.finishGame();
      }
    }
  }
}