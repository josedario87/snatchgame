// Admin-specific types
export interface AdminStats {
  connectedPlayers: number
  activeGames: number
  currentRound: string
  gameState: string
  players?: AdminPlayer[]
}

export interface AdminPlayer {
  id: string
  name: string
  role: string
  roomId?: string
}

export interface AdminMessage {
  type: 'connected' | 'gameStats' | 'error'
  timestamp?: string
  data?: AdminStats
  message?: string
}

export interface AdminConfig {
  serverUrl: string
  environment: string
}

// Game-related types will be auto-generated from server using schema-codegen
// Run: npm run generate-types