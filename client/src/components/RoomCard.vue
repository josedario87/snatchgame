<template>
  <div class="room-card">
    <div class="room-header">
      <span class="room-id">Room {{ room.roomId.slice(0, 8) }}</span>
      <span class="room-status" :class="`status-${room.metadata?.gameStatus || 'waiting'}`">
        {{ room.metadata?.gameStatus || 'waiting' }}
      </span>
    </div>
    
    <div class="room-details">
      <div class="detail-row">
        <span class="detail-label">Players:</span>
        <span class="detail-value">{{ room.clients }}/{{ room.maxClients }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Round:</span>
        <span class="detail-value">{{ room.metadata?.currentRound || 1 }}/3</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Game Variant:</span>
        <span class="detail-value">{{ room.metadata?.currentVariant || 'G1' }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Created:</span>
        <span class="detail-value">{{ formatTime(room.createdAt) }}</span>
      </div>
    </div>

    <div class="room-actions">
      <button 
        v-if="room.metadata?.gameStatus === 'playing'"
        @click="$emit('pause', room.roomId)"
        class="btn btn-action btn-pause"
      >
        ⏸️ Pause
      </button>
      <button 
        v-if="room.metadata?.gameStatus === 'paused'"
        @click="$emit('resume', room.roomId)"
        class="btn btn-action btn-resume"
      >
        ▶️ Resume
      </button>
      <button 
        @click="$emit('restart', room.roomId)"
        class="btn btn-action btn-restart"
      >
        🔄 Restart
      </button>
      <button 
        @click="$emit('viewDetails', room.roomId)"
        class="btn btn-action btn-view"
      >
        📊 Details
      </button>
    </div>

    <div v-if="roomDetails" class="room-stats">
      <h4>Room Statistics</h4>
      <div v-if="roomDetails.players" class="players-list">
        <div v-for="player in roomDetails.players" 
             :key="player.sessionId"
             class="player-row">
          <div class="player-info">
            <span class="player-name">{{ player.name }}</span>
            <span class="player-role">{{ player.role }}</span>
          </div>
          <div class="player-tokens">
            <span class="token pavo">🦃 {{ player.pavoTokens || 0 }}</span>
            <span class="token elote">🌽 {{ player.eloteTokens || 0 }}</span>
            <span class="token shame">😳 {{ player.shameTokens || 0 }}</span>
          </div>
          <button 
            @click="$emit('kickPlayer', room.roomId, player.sessionId)"
            class="btn btn-kick"
          >
            Kick
          </button>
        </div>
      </div>
      <div class="stats-info">
        <div class="stat-item">
          <span>Time Remaining:</span>
          <span>{{ formatSeconds(roomDetails.timeRemaining) }}</span>
        </div>
        <div v-if="roomDetails.winner" class="stat-item">
          <span>Winner:</span>
          <span class="winner-name">{{ roomDetails.winner }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Room {
  roomId: string;
  clients: number;
  maxClients: number;
  createdAt: number;
  metadata?: {
    gameStatus?: string;
    currentRound?: number;
    currentVariant?: string;
  };
}

interface RoomDetails {
  players?: Array<{
    sessionId: string;
    name: string;
    role: string;
    pavoTokens?: number;
    eloteTokens?: number;
    shameTokens?: number;
  }>;
  timeRemaining: number;
  winner?: string;
}

defineProps<{
  room: Room;
  roomDetails?: RoomDetails;
}>();

defineEmits<{
  pause: [roomId: string];
  resume: [roomId: string];
  restart: [roomId: string];
  viewDetails: [roomId: string];
  kickPlayer: [roomId: string, playerId: string];
}>();

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.room-card {
  background: white;
  color: #333;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.room-id {
  font-weight: bold;
  font-family: monospace;
}

.room-status {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-waiting {
  background: #e8f5e9;
  color: #4caf50;
}

.status-playing {
  background: #e3f2fd;
  color: #2196f3;
}

.status-paused {
  background: #fff3e0;
  color: #ff9800;
}

.status-finished {
  background: #f3e5f5;
  color: #9c27b0;
}

.room-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}

.detail-label {
  color: #666;
}

.detail-value {
  font-weight: 600;
}

.room-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-action {
  flex: 1;
  min-width: 80px;
}

.btn-pause {
  background: #ff9800;
  color: white;
}

.btn-resume {
  background: #4caf50;
  color: white;
}

.btn-restart {
  background: #2196f3;
  color: white;
}

.btn-view {
  background: #9c27b0;
  color: white;
}

.btn-kick {
  background: #f44336;
  color: white;
  padding: 4px 12px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.room-stats {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.room-stats h4 {
  margin-bottom: 15px;
  color: #666;
}

.players-list {
  margin-bottom: 15px;
}

.player-row {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  gap: 12px;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  font-weight: 600;
  font-size: 14px;
}

.player-role {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.player-tokens {
  display: flex;
  gap: 8px;
  align-items: center;
}

.token {
  background: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e0e0e0;
}

.token.pavo {
  color: #d84315;
}

.token.elote {
  color: #f57f17;
}

.token.shame {
  color: #c62828;
}

.stats-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}

.winner-name {
  color: #4caf50;
  font-weight: bold;
}
</style>