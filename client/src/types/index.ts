// Re-export generated schema classes
export { Player } from './Player'
export { GameState } from './GameState'

// Additional types that are not Schema classes
export interface GameRoomOptions {
    gameMode?: string;
    playerName?: string;
}