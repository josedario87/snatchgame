export interface PlayerInfo {
  sessionId: string;
  name: string;
  clicks: number;
}

export interface RoomStats {
  roomId: string;
  players: PlayerInfo[];
  gameStatus: GameStatus;
  timeRemaining: number;
  winner?: string;
  createdAt: number;
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished'
}

export interface AdminAction {
  action: 'pause' | 'restart' | 'kick';
  roomId: string;
  playerId?: string;
}