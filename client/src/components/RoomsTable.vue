<template>
  <div class="rooms-table-container">
    <div class="table-header">
      <h3>🎮 Game Rooms Overview</h3>
      <div class="table-controls">
        <button @click="$emit('refresh')" class="btn btn-refresh">
          🔄 Refresh
        </button>
      </div>
    </div>

    <div v-if="rooms.length === 0" class="no-rooms">
      No active game rooms
    </div>

    <div v-else class="table-wrapper">
      <table class="rooms-table">
        <thead>
          <tr>
            <th>Room ID</th>
            <th>Status</th>
            <th>Players</th>
            <th>Round</th>
            <th>Variant</th>
            <th>P1 Tokens</th>
            <th>P2 Tokens</th>
            <th>System Message</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in rooms" :key="room.roomId" class="room-row">
            <td class="room-id">
              <code>{{ room.roomId.slice(0, 8) }}</code>
            </td>
            <td>
              <span class="status-badge" :class="`status-${room.metadata?.gameStatus || 'waiting'}`">
                {{ room.metadata?.gameStatus || 'waiting' }}
              </span>
            </td>
            <td class="players-count">
              {{ room.clients }}/{{ room.maxClients }}
            </td>
            <td class="round-info">
              {{ room.metadata?.currentRound || 1 }}/3
            </td>
            <td class="variant-info">
              <span class="variant-badge">{{ room.metadata?.currentVariant || 'G1' }}</span>
            </td>
            <td class="tokens-cell">
              <div v-if="getRoomDetails(room.roomId)?.players?.[0]" class="player-section">
                <div class="player-name-chip" :style="{ 
                  backgroundColor: getPlayerColor(getRoomDetails(room.roomId).players[0], 0),
                  color: getReadableTextColor(getPlayerColor(getRoomDetails(room.roomId).players[0], 0))
                }">
                  {{ getRoomDetails(room.roomId).players[0].name }}
                </div>
                <div class="token-summary">
                  <span class="token pavo">🦃 <AnimatedNumber :value="getRoomDetails(room.roomId).players[0].pavoTokens || 0" :duration-ms="800" /></span>
                  <span class="token elote">🌽 <AnimatedNumber :value="getRoomDetails(room.roomId).players[0].eloteTokens || 0" :duration-ms="800" /></span>
                  <span class="token shame">😳 <AnimatedNumber :value="getRoomDetails(room.roomId).players[0].shameTokens || 0" :duration-ms="800" /></span>
                </div>
              </div>
              <div v-else class="no-data">-</div>
            </td>
            <td class="tokens-cell">
              <div v-if="getRoomDetails(room.roomId)?.players?.[1]" class="player-section">
                <div class="player-name-chip" :style="{ 
                  backgroundColor: getPlayerColor(getRoomDetails(room.roomId).players[1], 1),
                  color: getReadableTextColor(getPlayerColor(getRoomDetails(room.roomId).players[1], 1))
                }">
                  {{ getRoomDetails(room.roomId).players[1].name }}
                </div>
                <div class="token-summary">
                  <span class="token pavo">🦃 <AnimatedNumber :value="getRoomDetails(room.roomId).players[1].pavoTokens || 0" :duration-ms="800" /></span>
                  <span class="token elote">🌽 <AnimatedNumber :value="getRoomDetails(room.roomId).players[1].eloteTokens || 0" :duration-ms="800" /></span>
                  <span class="token shame">😳 <AnimatedNumber :value="getRoomDetails(room.roomId).players[1].shameTokens || 0" :duration-ms="800" /></span>
                </div>
              </div>
              <div v-else class="no-data">-</div>
            </td>
            <td class="system-message-cell">
              <SystemMessageDisplay 
                :message="getRoomDetails(room.roomId)?.recentSystemMessage"
              />
            </td>
            <td class="created-time">
              {{ formatTime(room.createdAt) }}
            </td>
            <td class="actions-cell">
              <button 
                @click="$emit('viewRoomModal', room.roomId)"
                class="btn btn-details"
                title="View detailed card"
              >
                📊 Details
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import AnimatedNumber from '../views/games/AnimatedNumber.vue';
import SystemMessageDisplay from './SystemMessageDisplay.vue';
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
  recentSystemMessage?: {
    text: string;
    kind: string;
    timestamp: number;
  } | null;
}

const props = defineProps<{
  rooms: Room[];
  roomDetails: { [key: string]: RoomDetails };
}>();

defineEmits<{
  refresh: [];
  viewRoomModal: [roomId: string];
}>();

function getRoomDetails(roomId: string) {
  return props.roomDetails[roomId];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

function getPlayerColor(player: any, playerIndex: number): string {
  // Use player's actual color if available
  if (player?.color) {
    return player.color;
  }
  
  // Fallback colors for P1 and P2
  const fallbackColors = ['#667eea', '#f093fb'];
  return fallbackColors[playerIndex] || '#999';
}

function getReadableTextColor(hex?: string): string {
  const c = (hex || '').trim();
  const m = c.match(/^#?([a-fA-F0-9]{6})$/);
  let r=102, g=126, b=234; // fallback to #667eea
  if (m) {
    const int = parseInt(m[1], 16);
    r = (int >> 16) & 255; g = (int >> 8) & 255; b = int & 255;
  }
  // Perceived brightness formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#111111' : '#ffffff';
}
</script>

<style scoped>
.rooms-table-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.table-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.4rem;
}

.table-controls {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #f0f0f0;
  color: #666;
}

.btn-refresh:hover {
  background: #e0e0e0;
}

.btn-details {
  background: #9c27b0;
  color: white;
  padding: 6px 12px;
  font-size: 12px;
}

.btn-details:hover {
  background: #7b1fa2;
  transform: translateY(-1px);
}

.no-rooms {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.table-wrapper {
  overflow-x: auto;
}

.rooms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: #333;
}

.rooms-table th {
  background: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.rooms-table td {
  padding: 12px 8px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
  color: #333;
}

.room-row:hover {
  background: #f8f9fa;
}

.room-id code {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
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

.players-count {
  font-weight: 600;
  text-align: center;
  color: #333;
}

.round-info {
  text-align: center;
  font-weight: 600;
  color: #333;
}

.variant-badge {
  background: #e1f5fe;
  color: #0277bd;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}

.tokens-cell {
  min-width: 160px;
}

.player-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.player-name-chip {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.token-summary {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-start;
}

.token {
  display: inline-flex;
  align-items: center;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #e9ecef;
  gap: 2px;
}

.token :deep(.anim-number) {
  font-size: inherit;
  font-weight: inherit;
  height: auto;
  line-height: inherit;
}

.token :deep(.viewport) {
  height: auto;
  line-height: inherit;
}

.token :deep(.val) {
  line-height: inherit;
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

.no-data {
  color: #999;
  font-style: italic;
  text-align: center;
}

.created-time {
  color: #555;
  font-size: 12px;
  white-space: nowrap;
}

.system-message-cell {
  min-width: 160px;
  max-width: 200px;
  padding: 8px;
}

.actions-cell {
  text-align: center;
  white-space: nowrap;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .rooms-table {
    font-size: 12px;
  }
  
  .rooms-table th,
  .rooms-table td {
    padding: 8px 6px;
  }
  
  .token-summary {
    gap: 1px;
  }
  
  .token {
    font-size: 10px;
    padding: 1px 4px;
  }
  
  .token :deep(.anim-number) {
    font-size: inherit;
  }
  
  .system-message-cell {
    min-width: 120px;
    max-width: 150px;
  }
}
</style>