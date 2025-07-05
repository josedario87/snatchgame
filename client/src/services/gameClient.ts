import { Client, Room } from 'colyseus.js'
import { GameState, Player } from '../types'
import type { GameRoomOptions } from '../types'
import { logger } from './logger'

export class GameClient {
  public client: Client | null = null
  public room: Room<GameState> | null = null
  
  // Current state
  public gameState: GameState | null = null
  public currentPlayerId: string = ''
  public isConnected: boolean = false

  // Event callbacks
  private onStateChangeCallbacks: ((state: GameState) => void)[] = []
  private onGamePhaseChangeCallbacks: ((phase: string) => void)[] = []
  private onAdminKickedCallbacks: ((data: any) => void)[] = []
  private onRoundChangedCallbacks: ((data: any) => void)[] = []

  constructor() {
    // Client will be initialized when needed
  }

  private async ensureClientInitialized() {
    if (this.client) return

    try {
      // Fetch runtime configuration from our Express server
      const configResponse = await fetch('/api/config')
      const config = await configResponse.json()
      let serverUrl = config.serverUrl || 'ws://localhost:2567'
      
      // Convert HTTP/HTTPS URLs to WebSocket URLs
      if (serverUrl.startsWith('https://')) {
        serverUrl = serverUrl.replace('https://', 'wss://')
      } else if (serverUrl.startsWith('http://')) {
        serverUrl = serverUrl.replace('http://', 'ws://')
      }
      
      this.client = new Client(serverUrl)
      logger.info('Game client initialized with server:', serverUrl)
    } catch (error) {
      // Fallback to default if config fetch fails
      const defaultUrl = 'ws://localhost:2567'
      this.client = new Client(defaultUrl)
      logger.warn('Failed to fetch config, using default:', defaultUrl)
    }
  }

  async joinGame(playerName: string, gameMode: string = 'classic'): Promise<Room<GameState>> {
    try {
      await this.ensureClientInitialized()
      if (!this.client) throw new Error('Failed to initialize game client')
      
      logger.info('Attempting to join game room...')
      
      const options: GameRoomOptions = {
        playerName,
        gameMode
      }
      
      this.room = await this.client.joinOrCreate<GameState>('game', options)
      this.currentPlayerId = this.room.sessionId
      this.isConnected = true

      logger.info('Successfully joined room:', this.room)
      logger.info('Player ID:', this.currentPlayerId)

      this.room.onStateChange((state) => {
        logger.gameStateChange({
          gamePhase: state.gamePhase,
          playerCount: state.players.size,
          gameStarted: state.gameStarted
        })
        
        const previousPhase = this.gameState?.gamePhase
        this.gameState = state
        
        // Notify all state change callbacks
        this.onStateChangeCallbacks.forEach(callback => callback(state))
        
        // Notify phase change if it changed
        if (previousPhase !== state.gamePhase) {
          logger.gamePhaseChange(previousPhase, state.gamePhase)
          this.onGamePhaseChangeCallbacks.forEach(callback => callback(state.gamePhase))
        }
      })

      this.room.onLeave((code) => {
        logger.info('Left room with code:', code)
        this.isConnected = false
        
        // Handle forced disconnect by admin
        if (code === 4000) {
          logger.info('Disconnected by admin (code 4000)')
        }
      })

      this.room.onError((code, message) => {
        logger.error('Room error:', { code, message })
      })

      // Handle admin kick message
      this.room.onMessage("adminKicked", (data) => {
        logger.info('Received admin kick message:', data)
        this.onAdminKickedCallbacks.forEach(callback => callback(data))
      })

      // Handle game pause/resume messages
      this.room.onMessage("gamePaused", (data) => {
        logger.info('Game paused by admin:', data)
      })

      this.room.onMessage("gameResumed", (data) => {
        logger.info('Game resumed by admin:', data)
      })

      // Handle round change messages
      this.room.onMessage("roundChanged", (data) => {
        logger.info('Round changed by admin:', data)
        this.onRoundChangedCallbacks.forEach(callback => callback(data))
      })

      return this.room
    } catch (error) {
      logger.error('Failed to join room:', error)
      throw error
    }
  }

  leaveGame(): void {
    if (this.room) {
      this.room.leave()
      this.room = null
      this.isConnected = false
      this.gameState = null
    }
  }

  getRoom(): Room<GameState> | null {
    return this.room
  }

  // Event subscription methods
  onStateChange(callback: (state: GameState) => void): () => void {
    this.onStateChangeCallbacks.push(callback)
    
    // If we already have state, call immediately
    if (this.gameState) {
      callback(this.gameState)
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.onStateChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.onStateChangeCallbacks.splice(index, 1)
      }
    }
  }

  onGamePhaseChange(callback: (phase: string) => void): () => void {
    this.onGamePhaseChangeCallbacks.push(callback)
    
    // If we already have state, call immediately
    if (this.gameState) {
      callback(this.gameState.gamePhase)
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.onGamePhaseChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.onGamePhaseChangeCallbacks.splice(index, 1)
      }
    }
  }

  onAdminKicked(callback: (data: any) => void): () => void {
    this.onAdminKickedCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.onAdminKickedCallbacks.indexOf(callback)
      if (index > -1) {
        this.onAdminKickedCallbacks.splice(index, 1)
      }
    }
  }

  onRoundChanged(callback: (data: any) => void): () => void {
    this.onRoundChangedCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.onRoundChangedCallbacks.indexOf(callback)
      if (index > -1) {
        this.onRoundChangedCallbacks.splice(index, 1)
      }
    }
  }

  // Game actions
  sendClick(): void {
    if (this.room && this.gameState?.gamePhase === 'playing') {
      this.room.send('click')
      logger.clickSent()
    } else {
      logger.clickIgnored()
    }
  }

  makeOffer(offerData: { 
    targetId: string, 
    offering: { turkey: number, coffee: number, corn: number }, 
    requesting: { turkey: number, coffee: number, corn: number } 
  }): void {
    if (this.room && this.gameState?.gamePhase === 'trading') {
      this.room.send('makeOffer', offerData)
      logger.info('Trade offer sent:', offerData)
    } else {
      logger.info('Trade offer ignored - not in trading phase')
    }
  }

  respondToOffer(responseData: { offerId: string, response: string }): void {
    if (this.room && this.gameState?.gamePhase === 'trading') {
      this.room.send('respondToOffer', responseData)
      logger.info('Trade response sent:', responseData)
    } else {
      logger.info('Trade response ignored - not in trading phase')
    }
  }

  cancelOffer(cancelData: { offerId: string }): void {
    if (this.room && this.gameState?.gamePhase === 'trading') {
      this.room.send('cancelOffer', cancelData)
      logger.info('Trade cancellation sent:', cancelData)
    } else {
      logger.info('Trade cancellation ignored - not in trading phase')
    }
  }

  // Getters
  getCurrentPlayer(): Player | null {
    if (!this.gameState || !this.currentPlayerId) return null
    return this.gameState.players.get(this.currentPlayerId) || null
  }

  getPlayers(): Player[] {
    if (!this.gameState) return []
    return Array.from(this.gameState.players.values())
  }
}