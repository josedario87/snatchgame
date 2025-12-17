import { Room, Client } from "colyseus";
import { GameState } from "./schemas/GameState";
import { GameStatus } from "../../../shared/types";
import { NameManager } from "../utils/nameManager";
import { broadcastDashboardUpdate } from "../adminApi";

export class GameRoom extends Room<GameState> {
  maxClients = 2;
  private systemMessages: { text: string; kind: string; timestamp: number; round?: number; gameVariant?: string }[] = [];

  getFilterOptions() {
    // If waiting for shuffled players, report as available regardless of current client count
    if (this.isWaitingForShuffledPlayers) {
      return {
        clients: 0,
        maxClients: this.maxClients,
        metadata: this.metadata
      };
    }
    return {
      clients: this.clients.length,
      maxClients: this.maxClients,
      metadata: this.metadata
    };
  }

  hasReachedMaxClients() {
    // If waiting for shuffled players, allow up to 2 new clients regardless of current count
    if (this.isWaitingForShuffledPlayers) {
      return false;
    }
    return super.hasReachedMaxClients();
  }
  private gameInterval?: NodeJS.Timeout;
  private recentSystemMessage: { text: string; kind: string; timestamp: number } | null = null;
  
  // For shuffle functionality
  private expectedShuffledPlayers: { p1?: any; p2?: any } = {};
  private isWaitingForShuffledPlayers: boolean = false;
  private sessionToUuid: Map<string, string> = new Map();

  private sysChat(text: string, kind: string) {
    const timestamp = Date.now();
    
    // Store the most recent system message for dashboard (exclude round changes)
    if (kind !== 'round_advance') {
      this.recentSystemMessage = { text, kind, timestamp };
    }
    // Persist in per-room history (keep last 200) with round and game variant info
    this.systemMessages.push({ 
      text, 
      kind, 
      timestamp,
      round: this.state.currentRound,
      gameVariant: this.state.currentVariant
    });
    if (this.systemMessages.length > 200) {
      this.systemMessages.splice(0, this.systemMessages.length - 200);
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

    // Persist as "seen" for currently connected players by UUID
    try {
      this.state.players.forEach((player, sessionId) => {
        if (!player?.connected) return;
        const uuid = this.sessionToUuid.get(sessionId) || (player as any)?.uuid;
        if (!uuid) return;
        try {
          NameManager.getInstance().appendSystemMessage(uuid, {
            timestamp,
            kind,
            text,
            roomId: this.roomId,
            gameVariant: this.state.currentVariant,
            round: this.state.currentRound,
            role: (player as any)?.role || '',
            pavoTokens: (player as any)?.pavoTokens || 0,
            eloteTokens: (player as any)?.eloteTokens || 0,
            shameTokens: (player as any)?.shameTokens || 0,
          });
        } catch {}
      });
    } catch {}
  }

  onCreate(options: any) {
    // Keep room alive even if all clients disconnect (avoid auto-dispose during reconnection windows)
    try { (this as any).autoDispose = false; } catch {}
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
      
      // Reset player tokens while preserving shame tokens
      this.state.players.forEach((player, sessionId) => {
        const currentShameTokens = player.shameTokens || 0;
        
        if (player.role === 'P1') {
          player.pavoTokens = 10;
          player.eloteTokens = 0;
        } else if (player.role === 'P2') {
          player.pavoTokens = 0;
          player.eloteTokens = 10;
        }
        
        // Preserve shame tokens
        player.shameTokens = currentShameTokens;
      });
      
      // If game was finished, restart it
      if (this.state.gameStatus === GameStatus.FINISHED) {
        this.state.gameStatus = GameStatus.PLAYING;
      }
      
      // Update metadata with new status
      const statusString = this.state.gameStatus === GameStatus.WAITING ? 'waiting' : 
                          (this.state.gameStatus === GameStatus.PAUSED ? 'paused' : 'playing');
      
      this.setMetadata({ 
        gameStatus: statusString,
        currentRound: this.state.currentRound,
        currentVariant: this.state.currentVariant
      });
      
      // G2: start next round awaiting P2 decision, not forced by default
      if (variant === 'G2') {
        this.state.g2ForcePending = true;
        this.state.forcedByP2 = false;
      }
      this.broadcast("variantChanged", { variant });
      this.sysChat(`🔄 Variante cambiada a ${variant} - Juego reiniciado`, 'variant_change');
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
      this.state.g2ForcePending = false;
      // When forced, P1 must propose an offer; nothing automatic here.
      // System chat feedback and dashboard update
      if (this.state.currentVariant === 'G2') {
        if (force) this.sysChat('📌 P2 decidió forzar a P1 a ofrecer', 'p2_force');
        else this.sysChat('🕊️ P2 decidió no forzar a P1', 'p2_no_force');
      }
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

    // Provide per-player system history (as seen) to clients
    this.onMessage("getSystemHistory", (client, targetSessionId: string) => {
      try {
        const target = this.state.players.get((targetSessionId || '').toString());
        if (!target) return;
        const uuid = this.sessionToUuid.get(target.sessionId) || (target as any)?.uuid;
        if (!uuid) return;
        const history = NameManager.getInstance().getSystemHistory(uuid) || [];
        client.send("systemHistory", { for: target.sessionId, history });
      } catch (e) {
        // ignore
      }
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
          // Persist sticky shame per UUID
          try {
            const { NameManager } = require("../utils/nameManager");
            const u = (p2 as any)?.uuid;
            if (u) NameManager.getInstance().setShameTokens(u, p2.shameTokens);
          } catch {}
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

    // Persist reconnection token per UUID (sent by client after join)
    this.onMessage("registerReconnection", (client, token: string) => {
      const uuid = this.sessionToUuid.get(client.sessionId);
      if (!uuid) return;
      try {
        const { NameManager } = require("../utils/nameManager");
        NameManager.getInstance().setReconnectToken(uuid, (token || '').toString());
      } catch {}
    });

    this.onMessage("admin:kick", (client, playerId: string) => {
      this.handleKick(playerId);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`[GameRoom] ${client.sessionId} joined room ${this.roomId} with name: ${options.playerName}, isShuffleJoin: ${options.isShuffleJoin}, isWaitingForShuffledPlayers: ${this.isWaitingForShuffledPlayers}, playersCount: ${this.state.players.size}`);
    const uuid = options?.uuid as string | undefined;
    
    // UUID-based reconnection: if game already started or room is full, allow join if UUID matches a participant
    if ((this.state.gameStatus !== GameStatus.WAITING || this.state.players.size >= 2) && uuid) {
      // Try to find a matching player by UUID
      let foundKey: string | null = null;
      this.state.players.forEach((p, key) => {
        if ((p as any).uuid && (p as any).uuid === uuid) {
          foundKey = key;
        }
      });
      if (foundKey) {
        // Rebind player to new sessionId
        const player = this.state.players.get(foundKey!);
        if (player) {
          this.state.players.delete(foundKey!);
          player.sessionId = client.sessionId;
          player.connected = true;
          this.state.players.set(client.sessionId, player);
          if (this.state.p1Id === foundKey) this.state.p1Id = client.sessionId;
          if (this.state.p2Id === foundKey) this.state.p2Id = client.sessionId;
          this.sessionToUuid.set(client.sessionId, uuid);
          // Let client know identity
          client.send("playerInfo", { sessionId: client.sessionId, name: player.name, roomId: this.roomId });
          // If paused and both connected, resume
          if (this.state.gameStatus === GameStatus.PAUSED && this.getConnectedPlayersCount() === 2) {
            this.state.resumeGame();
            this.setMetadata({ 
              gameStatus: 'playing',
              currentRound: this.state.currentRound,
              currentVariant: this.state.currentVariant
            });
            broadcastDashboardUpdate();
          }
          return; // Do not proceed with normal join flow
        }
      }
    }
    
    // Special handling for shuffled players
    if ((this.isWaitingForShuffledPlayers || options.isShuffleJoin) && options.uuid) {
      return this.handleShuffledPlayerJoin(client, options);
    }
    
    // Prevent new joins if game already started or two players are registered
    // BUT allow if waiting for shuffled players (they should go through shuffle handler above)
    if ((this.state.gameStatus !== GameStatus.WAITING || this.state.players.size >= 2) && !this.isWaitingForShuffledPlayers) {
      try { client.leave(1000); } catch {}
      return;
    }

    // Store UUID mapping if provided
    if (uuid) {
      this.sessionToUuid.set(client.sessionId, uuid);
    }

    // Use the playerName passed from the lobby - don't generate a new one!
    const playerName = options.playerName || "player";
    const playerColor = (options.playerColor && typeof options.playerColor === 'string') ? options.playerColor : "#667eea";
    
    const player = this.state.addPlayer(client.sessionId, playerName);
    // Persist selected color and restore sticky values
    const p = this.state.players.get(client.sessionId);
    if (p) {
      p.color = playerColor;
      if (uuid) {
        (p as any).uuid = uuid;
        try {
          const { NameManager } = require("../utils/nameManager");
          p.shameTokens = NameManager.getInstance().getShameTokens(uuid);
        } catch {}
      }
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

    // Persist current room mapping by UUID
    if (uuid) {
      try {
        const { NameManager } = require("../utils/nameManager");
        NameManager.getInstance().setCurrentRoom(uuid, this.roomId);
      } catch {}
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

    // Allow reconnection without a short timeout; give players ample time to return
    // (24 hours window to prevent unexpected room disposal due to short timeouts)
    const reconnection = this.allowReconnection(client, 60 * 60 * 24);
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
    // G2: awaiting P2 decision at round start (not forced by default)
    if (this.state.currentVariant === 'G2') {
      this.state.g2ForcePending = true;
      this.state.forcedByP2 = false;
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
  
  private buildRoundSummary() {
    const scores: any[] = [];
    this.state.players.forEach((p, key) => {
      const pavo = p.pavoTokens || 0;
      const elote = p.eloteTokens || 0;
      const points = (p.role === 'P2') ? (elote * 1 + pavo * 2) : (pavo * 1 + elote * 2);
      scores.push({
        sessionId: p.sessionId,
        name: p.name,
        role: p.role,
        pavo,
        elote,
        points,
        color: (p as any).color,
      });
    });
    // Highest score first
    scores.sort((a, b) => b.points - a.points);
    return {
      round: this.state.currentRound,
      variant: this.state.currentVariant,
      scores,
    };
  }

  private resetTokensForNewRound() {
    // Preserve shame tokens but reset pavo/elote according to role
    const p1 = this.state.p1Id ? this.state.players.get(this.state.p1Id) : undefined;
    const p2 = this.state.p2Id ? this.state.players.get(this.state.p2Id) : undefined;
    if (p1) { p1.pavoTokens = 10; p1.eloteTokens = 0; }
    if (p2) { p2.pavoTokens = 0; p2.eloteTokens = 10; }
    // Notify dashboard of token reset
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
    
    // Update metadata without altering FINISHED status
    this.setMetadata({ 
      gameStatus: this.state.gameStatus === GameStatus.WAITING ? 'waiting' : (this.state.gameStatus === GameStatus.PAUSED ? 'paused' : (this.state.gameStatus === GameStatus.FINISHED ? 'finished' : 'playing')),
      currentRound: this.state.currentRound,
      currentVariant: this.state.currentVariant
    });
    
    if (variant === 'G2') {
      this.state.g2ForcePending = true;
      this.state.forcedByP2 = false;
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
        
      case 'clearForShuffle':
        this.handleClearForShuffle();
        break;
        
      case 'assignShuffledPlayers':
        const playerAssignments = args[0];
        this.handleAssignShuffledPlayers(playerAssignments);
        break;
        
      default:
        console.warn(`[GameRoom] Unknown admin command: ${command}`);
    }
  }

  private handleClearForShuffle() {
    console.log(`[GameRoom] Clearing room ${this.roomId} for shuffle`);
    
    this.sysChat('🎲 Admin está reorganizando jugadores...', 'admin_shuffle');
    
    // Give players a moment to see the message
    setTimeout(() => {
      // Disconnect all clients with special code for shuffle
      this.clients.forEach(client => {
        try {
          client.leave(1002); // Special code for shuffle
        } catch (error) {
          console.error(`Failed to disconnect client ${client.sessionId}:`, error);
        }
      });
      
      // Clear all players from state completely
      this.state.players.clear();
      this.state.p1Id = "";
      this.state.p2Id = "";
      this.sessionToUuid.clear();
      
      // Reset room state but keep variant
      const currentVariant = this.state.currentVariant;
      this.state.restartGame();
      this.state.currentVariant = currentVariant;
      // Ensure room is accepting new joins after shuffle
      try { (this as any).unlock?.(); } catch {}
      
      // Prepare for new players
      this.isWaitingForShuffledPlayers = true;
      this.expectedShuffledPlayers = {};
      
      broadcastDashboardUpdate();
    }, 1000);
  }

  private handleAssignShuffledPlayers(assignments: { p1?: any; p2?: any }) {
    console.log(`[GameRoom] Assigning shuffled players to room ${this.roomId}:`, assignments);
    
    this.expectedShuffledPlayers = assignments;
    this.isWaitingForShuffledPlayers = true;
    
    // Update metadata to reflect that room is waiting for shuffled players
    this.setMetadata({ 
      gameStatus: 'waiting',
      currentRound: 1,
      currentVariant: this.state.currentVariant,
      playersCount: 0, // Force reset player count
      maxClients: 2
    });
    
    // Make sure the room is unlocked and can accept new connections
    try { 
      (this as any).unlock?.(); 
      // Force Colyseus to recalculate available slots
      (this as any).maxClients = 2;
    } catch {}
  }

  private handleShuffledPlayerJoin(client: Client, options: any) {
    const uuid = options.uuid;
    console.log(`[GameRoom] Shuffled player ${uuid} trying to join room ${this.roomId} with options:`, options);
    console.log(`[GameRoom] Room state - isWaitingForShuffledPlayers: ${this.isWaitingForShuffledPlayers}, playersCount: ${this.state.players.size}, expectedPlayers:`, this.expectedShuffledPlayers);
    
    // Check if this player is expected in this room
    let expectedRole: 'P1' | 'P2' | null = options.role || null;
    
    // If role not provided, determine from expected players
    if (!expectedRole) {
      if (this.expectedShuffledPlayers.p1?.uuid === uuid) {
        expectedRole = 'P1';
      } else if (this.expectedShuffledPlayers.p2?.uuid === uuid) {
        expectedRole = 'P2';
      }
    }
    
    if (!expectedRole) {
      // Fallback: consult NameManager assignment if not set yet in room
      try {
        const { NameManager } = require("../utils/nameManager");
        const assign = NameManager.getInstance().getPlayerRoomAssignment(uuid);
        if (assign && assign.roomId === this.roomId) {
          expectedRole = assign.role;
          if (assign.role === 'P1' && !this.expectedShuffledPlayers.p1) {
            this.expectedShuffledPlayers.p1 = { uuid, name: options.playerName || 'player', color: options.playerColor };
          } else if (assign.role === 'P2' && !this.expectedShuffledPlayers.p2) {
            this.expectedShuffledPlayers.p2 = { uuid, name: options.playerName || 'player', color: options.playerColor };
          }
        }
      } catch {}
    }

    if (!expectedRole) {
      console.log(`[GameRoom] Player ${uuid} not expected in room ${this.roomId}, rejecting`);
      try { client.leave(1000); } catch {}
      return;
    }
    
    // Get player info from expected data or use provided options as fallback
    const expectedPlayerData = expectedRole === 'P1' ? this.expectedShuffledPlayers.p1 : this.expectedShuffledPlayers.p2;
    const playerName = expectedPlayerData?.name || options.playerName || 'player';
    const playerColor = expectedPlayerData?.color || options.playerColor || "#667eea";
    
    console.log(`[GameRoom] Adding shuffled player ${uuid} as ${expectedRole} in room ${this.roomId}`);
    
    // Add player with the expected role
    const player = this.state.addPlayer(client.sessionId, playerName);
    player.role = expectedRole;
    player.color = playerColor;
    (player as any).uuid = uuid;
    this.sessionToUuid.set(client.sessionId, uuid);
    // Restore sticky shame tokens for this UUID
    try {
      const { NameManager } = require("../utils/nameManager");
      const count = NameManager.getInstance().getShameTokens(uuid);
      const p = this.state.players.get(client.sessionId);
      if (p) p.shameTokens = count;
    } catch {}
    
    // Set role IDs
    if (expectedRole === 'P1') {
      this.state.p1Id = client.sessionId;
    } else {
      this.state.p2Id = client.sessionId;
    }
    
    client.send("playerInfo", {
      sessionId: client.sessionId,
      name: playerName,
      roomId: this.roomId
    });
    
    // Update mappings in NameManager
    try {
      const { NameManager } = require("../utils/nameManager");
      NameManager.getInstance().setCurrentRoom(uuid, this.roomId);
      NameManager.getInstance().removePlayerRoomAssignment(uuid);
    } catch {}
    
    // Check if room is complete
    if (this.state.players.size === 2) {
      this.isWaitingForShuffledPlayers = false;
      this.expectedShuffledPlayers = {};
      this.sysChat(`🎲 Reorganización completa - ¡comenzando partida!`, 'shuffle_complete');
      
      setTimeout(() => {
        this.startGame();
      }, 1000);
    } else {
      this.sysChat(`🎲 Esperando más jugadores reorganizados...`, 'shuffle_waiting');
    }
    
    broadcastDashboardUpdate();
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
        uuid: this.sessionToUuid.get(p.sessionId) || p.sessionId, // Include UUID for shuffle
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
      systemMessages: this.systemMessages.slice(-50),
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
    // Broadcast end-of-round summary BEFORE any resets so clients can render results
    const summary = this.buildRoundSummary();
    this.broadcast("roundEnded", summary);

    if (this.state.currentRound < 3) {
      // Prepare next round: reset tokens and round decisions
      this.resetTokensForNewRound();
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
      // Final round finished: finish the game
      this.state.finishGame();
      this.endGame();
    }
  }
}
