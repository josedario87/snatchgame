import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player";
import { GameStatus } from "../../../../shared/types";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameStatus: GameStatus = GameStatus.WAITING;
  @type("number") timeRemaining: number = 0;
  @type("string") winner: string = "";
  @type("number") startTime: number = 0;
  @type("string") roomId: string = "";

  // Roles
  @type("string") p1Id: string = "";
  @type("string") p2Id: string = "";

  // Variant & round
  @type("string") currentVariant: string = "G1"; // G1..G5
  @type("number") currentRound: number = 1; // 1..3

  // Decisions & flags for current round
  @type("string") p1Action: string = ""; // no_offer|"" (variable offers handled via fields below)
  @type("string") p2Action: string = ""; // accept|reject|snatch
  @type("boolean") forcedByP2: boolean = false; // G2
  @type("boolean") reported: boolean = false; // G4
  @type("boolean") shameAssigned: boolean = false; // G3

  // Offer payload (P1 -> P2) and requested return (P2 -> P1)
  @type("number") offerPavo: number = 0;
  @type("number") offerElote: number = 0;
  @type("number") requestPavo: number = 0;
  @type("number") requestElote: number = 0;
  @type("boolean") offerActive: boolean = false;

  constructor() {
    super();
  }

  addPlayer(sessionId: string, name: string): Player {
    const player = new Player(sessionId, name);
    // Assign roles P1/P2 in join order
    if (!this.p1Id) {
      this.p1Id = sessionId;
      player.role = "P1";
    } else if (!this.p2Id) {
      this.p2Id = sessionId;
      player.role = "P2";
    }
    this.players.set(sessionId, player);
    return player;
  }

  removePlayer(sessionId: string): void {
    this.players.delete(sessionId);
  }

  startGame(): void {
    this.gameStatus = GameStatus.PLAYING;
    this.startTime = Date.now();
    this.timeRemaining = 0;
    this.resetAllPlayers();
    // Initialize tokens by role
    if (this.p1Id) {
      const p1 = this.players.get(this.p1Id);
      if (p1) { p1.pavoTokens = 10; p1.eloteTokens = 0; }
    }
    if (this.p2Id) {
      const p2 = this.players.get(this.p2Id);
      if (p2) { p2.eloteTokens = 10; p2.pavoTokens = 0; }
    }
    this.resetRound();
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
  }

  restartGame(): void {
    this.gameStatus = GameStatus.WAITING;
    this.timeRemaining = 0;
    this.winner = "";
    this.startTime = 0;
    this.currentRound = 1;
    this.p1Action = this.p2Action = "";
    this.forcedByP2 = this.reported = this.shameAssigned = false;
    this.offerPavo = this.offerElote = 0;
    this.requestPavo = this.requestElote = 0;
    this.offerActive = false;
    this.resetAllPlayers();
  }

  private resetAllPlayers(): void {
    this.players.forEach(player => player.reset());
  }

  resetRound(): void {
    this.p1Action = "";
    this.p2Action = "";
    this.forcedByP2 = (this.currentVariant === "G2");
    this.reported = false;
    this.shameAssigned = false;
    this.offerPavo = this.offerElote = 0;
    this.requestPavo = this.requestElote = 0;
    this.offerActive = false;
  }
}
