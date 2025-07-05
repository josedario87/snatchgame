import { Room, Client } from "colyseus";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export interface GameRoomOptions {
    gameMode?: string;
    playerName?: string;
}

export class TokenInventory extends Schema {
    @type("number") turkey: number = 0;
    @type("number") coffee: number = 0;
    @type("number") corn: number = 0;
}

export class TradeOffer extends Schema {
    @type("string") id: string = "";
    @type("string") offererId: string = "";
    @type("string") targetId: string = "";
    @type(TokenInventory) offering = new TokenInventory();
    @type(TokenInventory) requesting = new TokenInventory();
    @type("string") status: string = "pending"; // "pending" | "accepted" | "rejected" | "snatched" | "cancelled"
}

export class Player extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("string") producerRole: string = "turkey"; // "turkey" | "coffee" | "corn"
    @type(TokenInventory) tokens = new TokenInventory();
    @type("number") points: number = 0;
    @type("number") shameTokens: number = 0;
    @type("boolean") isSuspended: boolean = false;
    @type("string") role: string = "trader"; // "trader" | "judge"
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ array: TradeOffer }) activeTradeOffers = new ArraySchema<TradeOffer>();
    @type("number") round: number = 1;
    @type("string") gamePhase: string = "waiting"; // "waiting" | "trading" | "judging" | "results"
    @type("boolean") gameStarted: boolean = false;
    @type("number") minPlayers: number = 3;
    @type("number") maxPlayers: number = 3;
}

export class GameRoom extends Room<GameState> {
    maxClients = 3;
    private producerRoles = ["turkey", "coffee", "corn"];

    onCreate(options: GameRoomOptions) {
        console.log(`GameRoom created with options:`, options);
        
        this.setState(new GameState());
        this.state.gamePhase = "waiting";

        this.onMessage("makeOffer", (client, message) => {
            this.handleMakeOffer(client, message);
        });

        this.onMessage("respondToOffer", (client, message) => {
            this.handleRespondToOffer(client, message);
        });

        this.onMessage("cancelOffer", (client, message) => {
            this.handleCancelOffer(client, message);
        });

        this.onMessage("*", (client, type, message) => {
            console.log(`Message from ${client.sessionId}:`, type, message);
        });
    }

    private assignProducerRoles() {
        const playerIds = Array.from(this.state.players.keys());
        const shuffledRoles = [...this.producerRoles].sort(() => Math.random() - 0.5);
        
        playerIds.forEach((playerId, index) => {
            const player = this.state.players.get(playerId);
            if (player) {
                player.producerRole = shuffledRoles[index];
                
                // Initialize tokens based on producer role
                player.tokens.turkey = 0;
                player.tokens.coffee = 0;
                player.tokens.corn = 0;
                
                switch (player.producerRole) {
                    case "turkey":
                        player.tokens.turkey = 5;
                        break;
                    case "coffee":
                        player.tokens.coffee = 5;
                        break;
                    case "corn":
                        player.tokens.corn = 5;
                        break;
                }
                
                console.log(`🎭 Player ${player.name} assigned role: ${player.producerRole}`);
            }
        });
    }

    private calculatePoints(player: Player): number {
        const ownTokens = player.tokens[player.producerRole as keyof TokenInventory] || 0;
        const otherTokens = (player.tokens.turkey + player.tokens.coffee + player.tokens.corn) - ownTokens;
        return ownTokens * 1 + otherTokens * 2;
    }

    private updateAllPlayerPoints() {
        this.state.players.forEach(player => {
            player.points = this.calculatePoints(player);
        });
    }

    private handleMakeOffer(client: Client, message: any) {
        const player = this.state.players.get(client.sessionId);
        
        if (!player || this.state.gamePhase !== "trading") {
            console.log(`Offer rejected - invalid state`);
            return;
        }

        // Cannot offer to self
        if (message.targetId === client.sessionId) {
            console.log(`Offer rejected - cannot offer to self`);
            return;
        }

        // Count existing offers from THIS player to THIS target
        const existingOffers = this.state.activeTradeOffers.filter(offer => 
            offer.offererId === client.sessionId && 
            offer.targetId === message.targetId &&
            offer.status === "pending"
        );

        if (existingOffers.length >= 2) {
            console.log(`Offer rejected - maximum 2 offers per target reached`);
            return;
        }

        const offer = new TradeOffer();
        offer.id = `${client.sessionId}-${Date.now()}`;
        offer.offererId = client.sessionId;
        offer.targetId = message.targetId;
        offer.offering.turkey = message.offering.turkey || 0;
        offer.offering.coffee = message.offering.coffee || 0;
        offer.offering.corn = message.offering.corn || 0;
        offer.requesting.turkey = message.requesting.turkey || 0;
        offer.requesting.coffee = message.requesting.coffee || 0;
        offer.requesting.corn = message.requesting.corn || 0;
        offer.status = "pending";

        this.state.activeTradeOffers.push(offer);
        console.log(`📝 Trade offer created: ${offer.id}`);
    }

    private handleRespondToOffer(client: Client, message: any) {
        const offer = this.state.activeTradeOffers.find(o => o.id === message.offerId);
        
        if (!offer || offer.targetId !== client.sessionId || offer.status !== "pending") {
            console.log(`Response rejected - invalid offer`);
            return;
        }

        const response = message.response; // "accept" | "reject" | "snatch"
        offer.status = response === "accept" ? "accepted" : response === "reject" ? "rejected" : "snatched";

        if (response === "accept" || response === "snatch") {
            this.executeTradeOffer(offer, response === "snatch");
        }

        console.log(`✅ Trade offer ${offer.id} ${response}ed`);
        this.updateAllPlayerPoints();
    }

    private handleCancelOffer(client: Client, message: any) {
        const offer = this.state.activeTradeOffers.find(o => o.id === message.offerId);
        
        if (!offer || offer.offererId !== client.sessionId || offer.status !== "pending") {
            console.log(`Cancel rejected - invalid offer`);
            return;
        }

        offer.status = "cancelled";
        console.log(`❌ Trade offer ${offer.id} cancelled`);
    }

    private executeTradeOffer(offer: TradeOffer, isSnatch: boolean) {
        const offerer = this.state.players.get(offer.offererId);
        const target = this.state.players.get(offer.targetId);
        
        if (!offerer || !target) return;

        // Calculate what can actually be transferred
        const actualOffering = {
            turkey: Math.min(offer.offering.turkey, offerer.tokens.turkey),
            coffee: Math.min(offer.offering.coffee, offerer.tokens.coffee),
            corn: Math.min(offer.offering.corn, offerer.tokens.corn)
        };

        const actualRequesting = isSnatch ? { turkey: 0, coffee: 0, corn: 0 } : {
            turkey: Math.min(offer.requesting.turkey, target.tokens.turkey),
            coffee: Math.min(offer.requesting.coffee, target.tokens.coffee),
            corn: Math.min(offer.requesting.corn, target.tokens.corn)
        };

        // Transfer tokens
        offerer.tokens.turkey -= actualOffering.turkey;
        offerer.tokens.coffee -= actualOffering.coffee;
        offerer.tokens.corn -= actualOffering.corn;
        offerer.tokens.turkey += actualRequesting.turkey;
        offerer.tokens.coffee += actualRequesting.coffee;
        offerer.tokens.corn += actualRequesting.corn;

        target.tokens.turkey += actualOffering.turkey;
        target.tokens.coffee += actualOffering.coffee;
        target.tokens.corn += actualOffering.corn;
        target.tokens.turkey -= actualRequesting.turkey;
        target.tokens.coffee -= actualRequesting.coffee;
        target.tokens.corn -= actualRequesting.corn;

        console.log(`🔄 Trade executed: ${isSnatch ? 'SNATCH' : 'FAIR'}`);
    }

    private checkGameStart() {
        const playerCount = this.state.players.size;
        
        if (playerCount === this.state.minPlayers && this.state.gamePhase === "waiting") {
            this.assignProducerRoles();
            this.state.gamePhase = "trading";
            this.state.gameStarted = true;
            this.state.round = 1;
            console.log(`🚀 Game started! Round ${this.state.round} - Trading phase`);
        } else if (playerCount < this.state.minPlayers && this.state.gameStarted) {
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
        player.producerRole = "turkey"; // Will be reassigned when game starts
        player.tokens = new TokenInventory();
        player.points = 0;
        player.shameTokens = 0;
        player.isSuspended = false;
        player.role = "trader";
        
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

    // Method for admin monitoring - used by Colyseus monitor and admin API
    getInspectData() {
        const stateSize = JSON.stringify(this.state).length;
        const roomElapsedTime = this.clock.elapsedTime;
        
        // Gather client information
        const clients = this.clients.map((client) => ({
            sessionId: client.sessionId,
            elapsedTime: roomElapsedTime - (client as any)._joinedAt || 0
        }));

        // Return comprehensive room data
        return {
            roomId: this.roomId,
            name: 'game',
            clientCount: clients.length,
            maxClients: this.maxClients,
            locked: this.locked,
            state: this.state,
            stateSize,
            clients: clients,
            elapsedTime: roomElapsedTime,
            metadata: {
                gamePhase: this.state.gamePhase,
                gameStarted: this.state.gameStarted,
                round: this.state.round,
                playerCount: this.state.players.size,
                activeOffers: this.state.activeTradeOffers.length
            }
        };
    }

    // Admin methods for game control
    pauseGame() {
        if (this.state.gameStarted && this.state.gamePhase !== 'paused') {
            this.state.gamePhase = 'paused';
            console.log(`⏸️ Game paused in room ${this.roomId} by admin`);
            
            // Broadcast pause message to all clients
            this.broadcast("gamePaused", { 
                message: "El juego ha sido pausado por el administrador",
                timestamp: Date.now()
            });
        }
    }

    resumeGame() {
        if (this.state.gameStarted && this.state.gamePhase === 'paused') {
            this.state.gamePhase = 'trading'; // Resume to trading phase
            console.log(`▶️ Game resumed in room ${this.roomId} by admin`);
            
            // Broadcast resume message to all clients
            this.broadcast("gameResumed", { 
                message: "El juego ha sido reanudado por el administrador",
                timestamp: Date.now()
            });
        }
    }

    _forceClientDisconnect(sessionId: string) {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) {
            console.log(`🚫 Admin force disconnect player ${sessionId} from room ${this.roomId}`);
            
            // Send notification to the specific client before disconnecting
            client.send("adminKicked", { 
                message: "Has sido expulsado del juego por el administrador",
                reason: "admin_kick",
                timestamp: Date.now()
            });

            // Give client time to process the message, then disconnect
            setTimeout(() => {
                client.leave(4000); // Force disconnect with code 4000
            }, 1000);
        } else {
            throw new Error(`Player ${sessionId} not found in room ${this.roomId}`);
        }
    }

    _forceDisconnectAllClients() {
        console.log(`🚫🚫 Admin force disconnect ALL players from room ${this.roomId}`);
        
        if (this.clients.length === 0) {
            return { success: true, kickedPlayers: 0 };
        }

        // Send notification to all clients first
        this.broadcast("adminKicked", {
            message: "Todos los jugadores han sido expulsados por el administrador",
            reason: "admin_kick_all",
            timestamp: Date.now()
        });

        const kickedCount = this.clients.length;

        // Give clients time to process the message, then disconnect all
        setTimeout(() => {
            // Create a copy of clients array since it will be modified during iteration
            const clientsToDisconnect = [...this.clients];
            clientsToDisconnect.forEach(client => {
                client.leave(4000); // Force disconnect with code 4000
            });
        }, 1000);

        return { success: true, kickedPlayers: kickedCount };
    }

    advanceRound() {
        const oldRound = this.state.round;
        this.state.round = Math.min(oldRound + 1, 10); // Max 10 rounds
        const newRound = this.state.round;
        
        console.log(`⏭️ Round advanced from ${oldRound} to ${newRound} in room ${this.roomId}`);
        
        // Broadcast round change to all clients
        this.broadcast("roundChanged", {
            oldRound,
            newRound,
            message: `Ronda ${newRound} - Cambio realizado por el administrador`,
            timestamp: Date.now()
        });

        return { success: true, newRound, oldRound };
    }

    previousRound() {
        const oldRound = this.state.round;
        this.state.round = Math.max(oldRound - 1, 1); // Min round 1
        const newRound = this.state.round;
        
        console.log(`⏮️ Round went back from ${oldRound} to ${newRound} in room ${this.roomId}`);
        
        // Broadcast round change to all clients
        this.broadcast("roundChanged", {
            oldRound,
            newRound,
            message: `Ronda ${newRound} - Cambio realizado por el administrador`,
            timestamp: Date.now()
        });

        return { success: true, newRound, oldRound };
    }
}