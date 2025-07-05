// Re-export generated schema classes
export { Player } from './Player'
export { GameState } from './GameState'
export { TradeOffer } from './TradeOffer'
export { TokenInventory } from './TokenInventory'

// Additional types that are not Schema classes
export interface GameRoomOptions {
    gameMode?: string;
    playerName?: string;
}