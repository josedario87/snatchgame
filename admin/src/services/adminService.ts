interface AdminStats {
  connectedPlayers: number
  activeGames: number
  currentRound: string
  gameState: string
  players?: Array<{
    id: string
    name: string
    role: string
  }>
}

interface AdminMessage {
  type: 'connected' | 'gameStats' | 'error'
  timestamp?: string
  data?: AdminStats
  message?: string
}

type AdminCallback = (data: AdminMessage) => void
type ConnectionCallback = (connected: boolean) => void

class AdminService {
  private eventSource: EventSource | null = null
  private callback: AdminCallback | null = null
  private connectionCallback: ConnectionCallback | null = null
  private isConnected = false
  private serverUrl: string = 'http://localhost:2567' // Default to Colyseus server
  private initialized = false

  private async initializeServerUrl(): Promise<void> {
    if (this.initialized) return
    
    try {
      const response = await fetch('/api/config')
      const config = await response.json()
      this.serverUrl = config.serverUrl || 'http://localhost:2567'
      this.initialized = true
    } catch (error) {
      console.warn('Failed to fetch server config, using default URL:', error)
      this.serverUrl = 'http://localhost:2567'
      this.initialized = true
    }
  }

  async connect(callback: AdminCallback): Promise<void> {
    await this.initializeServerUrl()
    
    this.callback = callback
    this.eventSource = new EventSource('/api/sse')

    this.eventSource.onopen = () => {
      console.log('[AdminService] SSE connection opened')
      this.isConnected = true
      this.connectionCallback?.(true)
    }

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[AdminService] SSE message received:', data.type, data.timestamp)
        this.callback?.(data)
      } catch (error) {
        console.error('[AdminService] Error parsing SSE message:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('[AdminService] SSE connection error:', error)
      this.isConnected = false
      this.connectionCallback?.(false)
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isConnected = false
    this.connectionCallback?.(false)
  }

  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallback = callback
  }

  // Admin control methods
  async kickPlayer(playerId: string): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/kick-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    })

    if (!response.ok) {
      throw new Error('Failed to kick player')
    }
  }

  async pauseGame(): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/pause-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to pause game')
    }
  }

  async resumeGame(): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/resume-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to resume game')
    }
  }

  async cancelGame(gameId: string): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/cancel-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    })

    if (!response.ok) {
      throw new Error('Failed to cancel game')
    }
  }

  async kickAllPlayers(): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/kick-all-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to kick all players')
    }
  }

  async advanceRound(): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/advance-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to advance round')
    }
  }

  async previousRound(): Promise<void> {
    await this.initializeServerUrl()
    const response = await fetch(`${this.serverUrl}/api/admin/previous-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to go back round')
    }
  }
}

export const adminService = new AdminService()