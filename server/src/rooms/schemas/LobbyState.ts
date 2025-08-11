import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class LobbyPlayer extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("boolean") inGame: boolean = false;
  @type("string") color: string = "#667eea";

  constructor(sessionId: string, name: string) {
    super();
    this.sessionId = sessionId;
    this.name = name;
    this.inGame = false;
    this.color = "#667eea";
  }
}

export class AvailableRoom extends Schema {
  @type("string") roomId: string = "";
  @type("number") playerCount: number = 0;
  @type("string") status: string = "";

  constructor(roomId: string, playerCount: number, status: string) {
    super();
    this.roomId = roomId;
    this.playerCount = playerCount;
    this.status = status;
  }
}

export class LobbyState extends Schema {
  @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();
  @type([AvailableRoom]) availableRooms = new ArraySchema<AvailableRoom>();
  @type("number") totalPlayers: number = 0;

  constructor() {
    super();
  }

  addPlayer(sessionId: string, name: string): LobbyPlayer {
    const player = new LobbyPlayer(sessionId, name);
    this.players.set(sessionId, player);
    this.totalPlayers = this.players.size;
    return player;
  }

  removePlayer(sessionId: string): void {
    this.players.delete(sessionId);
    this.totalPlayers = this.players.size;
  }

  updateAvailableRooms(rooms: AvailableRoom[]): void {
    this.availableRooms.clear();
    rooms.forEach(room => this.availableRooms.push(room));
  }

  setPlayerInGame(sessionId: string, inGame: boolean): void {
    const player = this.players.get(sessionId);
    if (player) {
      player.inGame = inGame;
    }
  }
}
