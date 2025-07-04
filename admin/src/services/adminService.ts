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

  connect(callback: AdminCallback): void {
    this.callback = callback
    this.eventSource = new EventSource('/api/sse')

    this.eventSource.onopen = () => {
      this.isConnected = true
      this.connectionCallback?.(true)
    }

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.callback?.(data)
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
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
    const response = await fetch(`${this.serverUrl}/api/admin/pause-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to pause game')
    }
  }

  async resumeGame(): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/admin/resume-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to resume game')
    }
  }

  async cancelGame(gameId: string): Promise<void> {
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
    const response = await fetch(`${this.serverUrl}/api/admin/kick-all-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to kick all players')
    }
  }

  async advanceRound(): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/admin/advance-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to advance round')
    }
  }

  async previousRound(): Promise<void> {
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