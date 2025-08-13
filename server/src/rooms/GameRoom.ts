import { Room, Client } from "colyseus";
import { GameState } from "./schemas/GameState";
import { GameStatus } from "../../../shared/types";
import { NameManager } from "../utils/nameManager";
import { broadcastDashboardUpdate } from "../adminApi";

export class GameRoom extends Room<GameState> {
  maxClients = 2;
  private gameInterval?: NodeJS.Timeout;
  private recentSystemMessage: { text: string; kind: string; timestamp: number } | null = null;

  private sysChat(text: string, kind: string) {
    const timestamp = Date.now();
    
    // Store the most recent system message for dashboard (exclude round changes)
    if (kind !== 'round_advance') {
      this.recentSystemMessage = { text, kind, timestamp };
    }
    
    this.broadcast("chat", {
      id: `${timestamp}-${Math.random().toString(36).slice(2)}`,
      text,
      from: "Sistema",
      fromId: "system",
      ts: timestamp,
      kind,
    } as any);
    
    // Notify dashboard immediately after system message
    setTimeout(() => {
      broadcastDashboardUpdate();
    }, 50);
  }

  onCreate(options: any) {
    this.setState(new GameState());
    this.state.roomId = this.roomId;
    // Expose status via metadata for lobby listing
    this.setMetadata({ 
      gameStatus: 'waiting',
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });

    // Variant selection (both players can change)
    this.onMessage("setVariant", (client, variant: string) => {
      this.state.currentVariant = variant;
      // Reset to round 1 and clear decisions when variant changes
      this.state.currentRound = 1;
      this.state.resetRound();
      // Reset game status if it was finished
      if (this.state.gameStatus === GameStatus.FINISHED) {
        this.state.gameStatus = GameStatus.PLAYING;
      }
      // Update metadata with new variant and round
      this.setMetadata({ 
        gameStatus: this.state.gameStatus === GameStatus.WAITING ? 'waiting' : 'playing',
        currentRound: this.state.currentRound,
        currentVariant: this.state.currentVariant
      });
      // G2: Force offer by default
      if (variant === 'G2') {
        this.state.forcedByP2 = true;
      }
      this.broadcast("variantChanged", { variant });
      this.sysChat(`🔄 Variante cambiada a ${variant}`, 'variant_change');
    });

    // P1 proposes a variable offer (offer -> P2, request <- from P2)
    this.onMessage("proposeOffer", (client, payload: { offerPavo:number; offerElote:number; requestPavo:number; requestElote:number; }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== "P1") return;
      const p1 = this.state.p1Id ? this.state.players.get(this.state.p1Id) : undefined;
      const p2 = this.state.p2Id ? this.state.players.get(this.state.p2Id) : undefined;
      if (!p1 || !p2) return;

      const oPavo = Math.max(0, Math.floor(payload.offerPavo || 0));
      const oElote = Math.max(0, Math.floor(payload.offerElote || 0));
      const rPavo = Math.max(0, Math.floor(payload.requestPavo || 0));
      const rElote = Math.max(0, Math.floor(payload.requestElote || 0));

      // Validate holdings: P1 must have offered tokens; P2 must have requested tokens
      if (oPavo > p1.pavoTokens) return;
      if (oElote > p1.eloteTokens) return;
      if (rPavo > p2.pavoTokens) return;
      if (rElote > p2.eloteTokens) return;

      // Clear any previous state before setting new offer
      this.state.resetRound();
      
      this.state.offerPavo = oPavo;
      this.state.offerElote = oElote;
      this.state.requestPavo = rPavo;
      this.state.requestElote = rElote;
      this.state.offerActive = true; // Always set active when an offer is proposed
      this.state.p1Action = "offer";
      // System chat with proposal summary
      this.sysChat(`📨 P1 ofrece`, 'p1_propose');
    });

    // P1 decides to not offer
    this.onMessage("noOffer", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== "P1") return;
      if (this.state.forcedByP2) return; // cannot refuse if forced in G2
      if (this.state.offerActive) return; // Can't "no offer" if offer is already active
      
      this.state.resetRound();
      this.state.p1Action = "no_offer";
      // System chat for no-offer
      this.sysChat('⛔ P1 no ofrece', 'p1_no_offer');
      // Auto-advance to next round when P1 doesn't offer
      this.advanceRound();
    });

    // G2: P2 may force an offer
    this.onMessage("p2Force", (client, force: boolean) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.role !== "P2") return;
      this.state.forcedByP2 = !!force;
      // When forced, P1 must propose an offer; nothing automatic here.
    });

    // System chat helper moved to class method this.sysChat

    // P2 action
    this.onMessage("p2Action", (client, action: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.role !== "P2") return;
      
      // Prevent multiple actions on the same offer
      if (this.state.p2Action) return;
      
      this.state.p2Action = action; // accept | reject | snatch
      this.resolveP2Action();

      // System chat feedback for both players
      if (action === 'accept') this.sysChat('P2 aceptó', 'p2_accept');
      else if (action === 'reject') this.sysChat('P2 rechazó la oferta', 'p2_reject');
      else if (action === 'snatch') this.sysChat('👹 P2 robó', 'p2_snatch');
      
      // Auto-advance unless it's a snatch in G3 or G4 (need shame/report)
      if (action !== 'snatch' || (this.state.currentVariant !== 'G3' && this.state.currentVariant !== 'G4')) {
        this.advanceRound();
      }
    });

    // G4 report after snatch
    this.onMessage("report", (client, report: boolean) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.role !== "P1") return;
      this.state.reported = !!report;
      if (report && this.state.currentVariant === "G4" && this.state.p2Action === "snatch") {
        // Inverse of snatch: P1 gets requested without giving offered
        const p1 = this.state.p1Id ? this.state.players.get(this.state.p1Id) : undefined;
        const p2 = this.state.p2Id ? this.state.players.get(this.state.p2Id) : undefined;
        if (p1 && p2) {
          // First, revert the snatch (return offered tokens to P1)
          const oP = this.state.offerPavo;
          const oE = this.state.offerElote;
          if (p2.pavoTokens >= oP) { p2.pavoTokens -= oP; p1.pavoTokens += oP; }
          if (p2.eloteTokens >= oE) { p2.eloteTokens -= oE; p1.eloteTokens += oE; }
          
          // Then apply the sanction: P1 gets requested without giving anything
          const rP = this.state.requestPavo;
          const rE = this.state.requestElote;
          if (p2.pavoTokens >= rP) { p2.pavoTokens -= rP; p1.pavoTokens += rP; }
          if (p2.eloteTokens >= rE) { p2.eloteTokens -= rE; p1.eloteTokens += rE; }
          
          // Notify dashboard of token changes
          broadcastDashboardUpdate();
        }
        // Clear offer now
        this.clearOffer();
      }
      // System chat feedback
      if (report) this.sysChat('⚖️ P1 denunció al juez y se confiscaron tokens', 'p1_report');
      else this.sysChat('🤝 P1 decidió no denunciar al juez', 'p1_no_report');
      // Auto-advance after report decision
      this.advanceRound();
    });

    // Cheap talk / chat broadcast (non-binding)
    this.onMessage("chat", (client, payload: { id?: string; text: string }) => {
      const raw = (payload?.text ?? "").toString();
      const text = raw.slice(0, 500); // basic guard
      if (!text.trim()) return;
      const player = this.state.players.get(client.sessionId);
      const from = player?.name || "player";
      const color = (player as any)?.color || "#667eea";
      const ts = Date.now();
      const id = (payload as any)?.id || `${ts}-${client.sessionId}`;
      // Broadcast to all (including sender) so both UIs render the same
      this.broadcast("chat", { id, text, from, fromId: client.sessionId, ts, color });
    });

    // G3 shame token after snatch
    this.onMessage("assignShame", (client, assign: boolean) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.role !== "P1") return;
      this.state.shameAssigned = !!assign;
      if (assign && this.state.currentVariant === "G3" && this.state.p2Action === "snatch") {
        // increment P2 shame immediately
        const p2 = this.state.p2Id ? this.state.players.get(this.state.p2Id) : undefined;
        if (p2) {
          p2.shameTokens += 1;
          // Notify dashboard of token change
          broadcastDashboardUpdate();
        }
      }
      // System chat feedback
      if (assign) this.sysChat('😶 P1 asignó un token de vergüenza a P2', 'p1_shame');
      else this.sysChat('😌 P1 decidió no asignar vergüenza', 'p1_no_shame');
      // Auto-advance after shame decision
      this.advanceRound();
    });

    // Removed nextRound handler - rounds now auto-advance

    this.onMessage("admin:kick", (client, playerId: string) => {
      this.handleKick(playerId);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`[GameRoom] ${client.sessionId} joined room ${this.roomId} with name: ${options.playerName}`);
    // Prevent new joins if game already started or two players are registered
    if (this.state.gameStatus !== GameStatus.WAITING || this.state.players.size >= 2) {
      try { client.leave(1000); } catch {}
      return;
    }

    // Use the playerName passed from the lobby - don't generate a new one!
    const playerName = options.playerName || "player";
    const playerColor = (options.playerColor && typeof options.playerColor === 'string') ? options.playerColor : "#667eea";
    
    const player = this.state.addPlayer(client.sessionId, playerName);
    // Persist selected color
    const p = this.state.players.get(client.sessionId);
    if (p) {
      p.color = playerColor;
    }

    client.send("playerInfo", {
      sessionId: client.sessionId,
      name: playerName,
      roomId: this.roomId
    });

    // System message for player join
    if (this.state.players.size === 1) {
      this.sysChat(`👋 ${playerName} se unió - esperando oponente`, 'player_join');
    } else if (this.state.players.size === 2) {
      this.sysChat(`🎯 Todos los jugadores conectados`, 'players_ready');
    }

    // Notify dashboard of player join
    broadcastDashboardUpdate();

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

    // Notify dashboard of player leave
    broadcastDashboardUpdate();

    if (this.state.gameStatus === GameStatus.PLAYING) {
      if (this.getConnectedPlayersCount() < 2) {
        this.pauseGame();
      }
    }

    // Allow reconnection; when it happens, mark player connected and resume if both are present
    const reconnection = this.allowReconnection(client, 30);
    reconnection.then((newClient) => {
      const p = this.state.players.get(client.sessionId);
      if (p) {
        p.connected = true;
      }
      // Provide basic identity back to the reconnecting client
      try {
        newClient.send("playerInfo", { sessionId: client.sessionId, name: p?.name || "player", roomId: this.roomId });
      } catch {}
      if (this.state.gameStatus === GameStatus.PAUSED && this.getConnectedPlayersCount() === 2) {
        this.state.resumeGame();
        this.setMetadata({ 
          gameStatus: 'playing',
          currentRound: this.state.currentRound,
          currentVariant: this.state.currentVariant
        });
        // Notify dashboard of game resume
        broadcastDashboardUpdate();
      }
    }).catch(() => {
      // reconnection window expired; nothing to do here
    });
  }

  async onReconnect(client: Client) {
    console.log(`[GameRoom] ${client.sessionId} reconnected to room ${this.roomId}`);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = true;
    }

    // Send player info so client can rehydrate local session state
    client.send("playerInfo", {
      sessionId: client.sessionId,
      name: player?.name || "player",
      roomId: this.roomId
    });

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
    console.log(`[GameRoom] Starting demo game in room ${this.roomId}`);
    this.state.startGame();
    this.setMetadata({ 
      gameStatus: 'playing',
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });
    // G2: Force offer by default when starting game
    if (this.state.currentVariant === 'G2') {
      this.state.forcedByP2 = true;
    }
    this.broadcast("gameStart");
    // System chat: start at round 1
    this.sysChat(`▶️ Ronda ${this.state.currentRound}/3`, 'round_advance');
    // Notify dashboard of game start (with some delay to ensure sysChat is processed)
    setTimeout(() => {
      broadcastDashboardUpdate();
    }, 100);
  }

  private pauseGame() {
    console.log(`[GameRoom] Pausing game in room ${this.roomId}`);
    this.state.pauseGame();
    this.broadcast("gamePaused");
    this.setMetadata({ 
      gameStatus: 'paused',
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });
    // Notify dashboard of game pause
    broadcastDashboardUpdate();
  }

  private endGame() {
    console.log(`[GameRoom] Demo game ended in room ${this.roomId}`);
    this.broadcast("gameEnd", {});
    this.setMetadata({ 
      gameStatus: 'finished',
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });
    // Notify dashboard of game end
    broadcastDashboardUpdate();
  }
  
  private resolveP2Action() {
    const p1 = this.state.p1Id ? this.state.players.get(this.state.p1Id) : undefined;
    const p2 = this.state.p2Id ? this.state.players.get(this.state.p2Id) : undefined;
    if (!p1 || !p2) return;
    const { p2Action, offerActive } = this.state;
    if (!offerActive && this.state.p1Action !== 'no_offer') return;

    if (this.state.p1Action === 'no_offer') {
      // Nothing to transfer; round can proceed.
      return;
    }

    if (p2Action === 'accept') {
      // Transfer P1 -> P2 (offered)
      if (p1.pavoTokens >= this.state.offerPavo && p1.eloteTokens >= this.state.offerElote &&
          p2.pavoTokens >= this.state.requestPavo && p2.eloteTokens >= this.state.requestElote) {
        p1.pavoTokens -= this.state.offerPavo; p2.pavoTokens += this.state.offerPavo;
        p1.eloteTokens -= this.state.offerElote; p2.eloteTokens += this.state.offerElote;
        // Transfer P2 -> P1 (requested)
        p2.pavoTokens -= this.state.requestPavo; p1.pavoTokens += this.state.requestPavo;
        p2.eloteTokens -= this.state.requestElote; p1.eloteTokens += this.state.requestElote;
      }
      this.clearOffer();
      // Notify dashboard of token changes
      broadcastDashboardUpdate();
    }
    else if (p2Action === 'reject') {
      // No changes
      this.clearOffer();
    }
    else if (p2Action === 'snatch') {
      // Transfer only offered P1 -> P2
      if (p1.pavoTokens >= this.state.offerPavo && p1.eloteTokens >= this.state.offerElote) {
        p1.pavoTokens -= this.state.offerPavo; p2.pavoTokens += this.state.offerPavo;
        p1.eloteTokens -= this.state.offerElote; p2.eloteTokens += this.state.offerElote;
      }
      // Keep offer data around for potential G4 report; it will be cleared on report or next round
      // Notify dashboard of token changes
      broadcastDashboardUpdate();
    }
  }

  private clearOffer() {
    this.state.offerPavo = 0;
    this.state.offerElote = 0;
    this.state.requestPavo = 0;
    this.state.requestElote = 0;
    this.state.offerActive = false;
    this.state.p1Action = "";
    this.state.p2Action = "";
  }

  private handleRestart() {
    console.log(`[GameRoom] Admin restart in room ${this.roomId}`);
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = undefined;
    }

    this.state.restartGame();
    this.broadcast("gameRestart");
    this.setMetadata({ 
      gameStatus: 'waiting',
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });

    if (this.state.players.size === 2) {
      setTimeout(() => this.startGame(), 500);
    }
  }

  private handleKick(playerId: string) {
    console.log(`[GameRoom] Admin kick player ${playerId} from room ${this.roomId}`);
    
    const client = this.clients.find(c => c.sessionId === playerId);
    if (client) {
      client.leave(1000);
    }
  }

  private handleSetVariant(variant: string) {
    console.log(`[GameRoom] Admin set variant to ${variant} in room ${this.roomId}`);
    
    this.state.currentVariant = variant;
    this.state.currentRound = 1;
    this.state.resetRound();
    
    if (this.state.gameStatus === GameStatus.FINISHED) {
      this.state.gameStatus = GameStatus.PLAYING;
    }
    
    this.setMetadata({ 
      gameStatus: this.state.gameStatus === GameStatus.WAITING ? 'waiting' : 'playing',
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });
    
    if (variant === 'G2') {
      this.state.forcedByP2 = true;
    }
    
    this.broadcast("variantChanged", { variant });
    this.sysChat(`🔄 Admin cambió variante a ${variant}`, 'admin_variant_change');
    
    broadcastDashboardUpdate();
  }

  private handleSendToLobby() {
    console.log(`[GameRoom] Admin send all players to lobby from room ${this.roomId}`);
    
    this.sysChat('👋 Admin envía a todos al lobby', 'admin_send_lobby');
    
    // Give players a moment to see the message
    setTimeout(() => {
      // Disconnect all clients, which will send them back to lobby
      this.clients.forEach(client => {
        try {
          client.leave(1000);
        } catch (error) {
          console.error(`Failed to disconnect client ${client.sessionId}:`, error);
        }
      });
      
      // Dispose the room
      setTimeout(() => {
        this.disconnect();
      }, 500);
    }, 1000);
  }

  // Public method for admin API calls
  executeAdminCommand(command: string, ...args: any[]) {
    console.log(`[GameRoom] Executing admin command: ${command} with args:`, args);
    
    switch (command) {
      case 'pause':
        this.state.pauseGame();
        this.broadcast("gamePaused");
        this.setMetadata({ 
          gameStatus: 'paused',
          currentRound: this.state.currentRound,
          currentVariant: this.state.currentVariant
        });
        this.sysChat('⏸️ Admin pausó el juego', 'admin_pause');
        broadcastDashboardUpdate();
        break;
        
      case 'resume':
        this.state.resumeGame();
        this.setMetadata({ 
          gameStatus: 'playing',
          currentRound: this.state.currentRound,
          currentVariant: this.state.currentVariant
        });
        this.sysChat('▶️ Admin reanudó el juego', 'admin_resume');
        broadcastDashboardUpdate();
        break;
        
      case 'restart':
        this.handleRestart();
        break;
        
      case 'setVariant':
        const variant = args[0];
        if (variant) {
          this.handleSetVariant(variant);
        }
        break;
        
      case 'sendToLobby':
        this.handleSendToLobby();
        break;
        
      case 'kick':
        const playerId = args[0];
        if (playerId) {
          this.handleKick(playerId);
        }
        break;
        
      default:
        console.warn(`[GameRoom] Unknown admin command: ${command}`);
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
    const result = {
      roomId: this.roomId,
      players: Array.from(this.state.players.values()).map(p => ({
        sessionId: p.sessionId,
        name: p.name,
        role: p.role,
        pavoTokens: p.pavoTokens,
        eloteTokens: p.eloteTokens,
        shameTokens: p.shameTokens,
        color: p.color,
      })),
      gameStatus: this.state.gameStatus,
      variant: this.state.currentVariant,
      round: this.state.currentRound,
      recentSystemMessage: this.recentSystemMessage,
      decisions: {
        p1Action: this.state.p1Action,
        p2Action: this.state.p2Action,
        forcedByP2: this.state.forcedByP2,
        reported: this.state.reported,
        shameAssigned: this.state.shameAssigned,
        offer: {
          offerPavo: this.state.offerPavo,
          offerElote: this.state.offerElote,
          requestPavo: this.state.requestPavo,
          requestElote: this.state.requestElote,
          active: this.state.offerActive,
        }
      },
      outcome: {}
    };
    
    return result;
  }

  private advanceRound() {
    if (this.state.currentRound < 3) {
      this.state.currentRound += 1;
      this.state.resetRound();
      // Update metadata with new round
      this.setMetadata({ 
        gameStatus: 'playing',
        currentRound: this.state.currentRound,
        currentVariant: this.state.currentVariant
      });
      this.broadcast("roundStarted", { round: this.state.currentRound });
      this.sysChat(`▶️ Ronda ${this.state.currentRound}/3`, 'round_advance');
      // Notify dashboard of round advance
      broadcastDashboardUpdate();
    } else {
      this.state.finishGame();
      this.endGame();
    }
  }
}
