import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

export interface GameRoomOptions {
    gameMode?: string;
    playerName?: string;
}

export class Player extends Schema {
    @type("string") id: string;
    @type("string") name: string;
    @type("number") score: number = 0;
    @type("boolean") ready: boolean = false;
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("boolean") gameStarted: boolean = false;
    @type("string") gameMode: string = "classic";
    @type("number") minPlayers: number = 2;
    @type("string") gamePhase: string = "waiting"; // "waiting" | "playing"
}

export class GameRoom extends Room<GameState> {
    maxClients = 8;

    onCreate(options: GameRoomOptions) {
        console.log(`GameRoom created with options:`, options);
        
        this.setState(new GameState());
        this.state.gameMode = options.gameMode || 'classic';
        this.state.gamePhase = "waiting";

        this.onMessage("click", (client, message) => {
            this.handleClick(client);
        });

        this.onMessage("*", (client, type, message) => {
            console.log(`Message from ${client.sessionId}:`, type, message);
        });
    }

    private handleClick(client: Client) {
        const player = this.state.players.get(client.sessionId);
        
        if (!player) {
            console.log(`Player not found for client ${client.sessionId}`);
            return;
        }

        if (this.state.gamePhase !== "playing") {
            console.log(`Click ignored - game not started (phase: ${this.state.gamePhase})`);
            return;
        }

        player.score += 1;
        console.log(`🎮 Player ${player.name} clicked! New score: ${player.score}`);
    }

    private checkGameStart() {
        const playerCount = this.state.players.size;
        
        if (playerCount >= this.state.minPlayers && this.state.gamePhase === "waiting") {
            this.state.gamePhase = "playing";
            this.state.gameStarted = true;
            console.log(`🚀 Game started! ${playerCount} players ready to play`);
        } else if (playerCount < this.state.minPlayers && this.state.gamePhase === "playing") {
            this.state.gamePhase = "waiting";
            this.state.gameStarted = false;
            console.log(`⏸️  Game paused - not enough players (${playerCount}/${this.state.minPlayers})`);
        }
    }

    onJoin(client: Client, options: any) {
        console.log(`Client ${client.sessionId} joined the room`);
        
        const player = new Player();
        player.id = client.sessionId;
        player.name = options.playerName || `Player ${this.state.players.size + 1}`;
        player.score = 0;
        player.ready = false;
        
        this.state.players.set(client.sessionId, player);
        
        // Check if we can start the game
        this.checkGameStart();
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Client ${client.sessionId} left the room`);
        this.state.players.delete(client.sessionId);
        
        // Check if we need to pause the game
        this.checkGameStart();
    }

    onDispose() {
        console.log(`GameRoom ${this.roomId} disposed`);
    }
}