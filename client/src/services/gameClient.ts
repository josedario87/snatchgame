import { Client, Room } from 'colyseus.js'
import { GameState, Player } from '../types'
import type { GameRoomOptions } from '../types'
import { logger } from './logger'

export class GameClient {
  public client: Client
  public room: Room<GameState> | null = null
  
  // Current state
  public gameState: GameState | null = null
  public currentPlayerId: string = ''
  public isConnected: boolean = false

  // Event callbacks
  private onStateChangeCallbacks: ((state: GameState) => void)[] = []
  private onGamePhaseChangeCallbacks: ((phase: string) => void)[] = []

  constructor() {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567'
    this.client = new Client(serverUrl)
    logger.info('Game client initialized with server:', serverUrl)
  }

  async joinGame(playerName: string, gameMode: string = 'classic'): Promise<Room<GameState>> {
    try {
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
      })

      this.room.onError((code, message) => {
        logger.error('Room error:', { code, message })
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