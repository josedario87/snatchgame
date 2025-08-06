<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>🎛️ Admin Dashboard</h1>
      <div class="stats-summary">
        <div class="stat-card">
          <span class="stat-label">Total CCU</span>
          <span class="stat-value">{{ globalStats?.globalCCU || 0 }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Active Rooms</span>
          <span class="stat-value">{{ rooms.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Players</span>
          <span class="stat-value">{{ totalPlayers }}</span>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="rooms-section">
        <h2>Active Game Rooms</h2>
        <div v-if="rooms.length === 0" class="no-rooms">
          No active game rooms
        </div>
        <div v-else class="rooms-grid">
          <div v-for="room in gameRooms" :key="room.roomId" class="room-card">
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
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ formatTime(room.createdAt) }}</span>
              </div>
            </div>

            <div class="room-actions">
              <button 
                v-if="room.metadata?.gameStatus === 'playing'"
                @click="pauseRoom(room.roomId)"
                class="btn btn-action btn-pause"
              >
                ⏸️ Pause
              </button>
              <button 
                v-if="room.metadata?.gameStatus === 'paused'"
                @click="resumeRoom(room.roomId)"
                class="btn btn-action btn-resume"
              >
                ▶️ Resume
              </button>
              <button 
                @click="restartRoom(room.roomId)"
                class="btn btn-action btn-restart"
              >
                🔄 Restart
              </button>
              <button 
                @click="viewRoomDetails(room.roomId)"
                class="btn btn-action btn-view"
              >
                📊 Details
              </button>
            </div>

            <div v-if="roomDetails[room.roomId]" class="room-stats">
              <h4>Room Statistics</h4>
              <div v-if="roomDetails[room.roomId].players" class="players-list">
                <div v-for="player in roomDetails[room.roomId].players" 
                     :key="player.sessionId"
                     class="player-row">
                  <span class="player-name">{{ player.name }}</span>
                  <span class="player-clicks">{{ player.clicks }} clicks</span>
                  <button 
                    @click="kickPlayer(room.roomId, player.sessionId)"
                    class="btn btn-kick"
                  >
                    Kick
                  </button>
                </div>
              </div>
              <div class="stats-info">
                <div class="stat-item">
                  <span>Time Remaining:</span>
                  <span>{{ formatSeconds(roomDetails[room.roomId].timeRemaining) }}</span>
                </div>
                <div v-if="roomDetails[room.roomId].winner" class="stat-item">
                  <span>Winner:</span>
                  <span class="winner-name">{{ roomDetails[room.roomId].winner }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lobby-section">
        <h2>Lobby Rooms</h2>
        <div v-if="lobbyRooms.length === 0" class="no-rooms">
          No active lobby rooms
        </div>
        <div v-else class="lobby-grid">
          <div v-for="room in lobbyRooms" :key="room.roomId" class="lobby-card">
            <div class="lobby-header">
              <span class="room-type">🏠 Lobby</span>
              <span class="room-clients">{{ room.clients }} players</span>
            </div>
            <div class="room-id-small">{{ room.roomId.slice(0, 8) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-footer">
      <button @click="refreshData" class="btn btn-refresh">
        🔄 Refresh Data
      </button>
      <button @click="goToLobby" class="btn btn-lobby">
        🎮 Go to Lobby
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { colyseusService } from '../services/colyseus';

const router = useRouter();
const rooms = ref<any[]>([]);
const roomDetails = ref<{ [key: string]: any }>({});
const globalStats = ref<any>(null);
const refreshInterval = ref<NodeJS.Timeout>();

const gameRooms = computed(() => rooms.value.filter(r => r.name === 'game'));
const lobbyRooms = computed(() => rooms.value.filter(r => r.name === 'lobby'));
const totalPlayers = computed(() => rooms.value.reduce((sum, room) => sum + room.clients, 0));

onMounted(() => {
  fetchData();
  refreshInterval.value = setInterval(fetchData, 3000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

async function fetchData() {
  try {
    const [roomsData, statsData] = await Promise.all([
      colyseusService.fetchRooms(),
      colyseusService.fetchGlobalStats()
    ]);
    
    rooms.value = roomsData;
    globalStats.value = statsData;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
}

async function viewRoomDetails(roomId: string) {
  try {
    const stats = await colyseusService.fetchRoomStats(roomId);
    roomDetails.value[roomId] = stats;
  } catch (error) {
    console.error('Failed to fetch room details:', error);
  }
}

async function pauseRoom(roomId: string) {
  try {
    await colyseusService.pauseRoom(roomId);
    await fetchData();
  } catch (error) {
    console.error('Failed to pause room:', error);
  }
}

async function resumeRoom(roomId: string) {
  try {
    await colyseusService.resumeRoom(roomId);
    await fetchData();
  } catch (error) {
    console.error('Failed to resume room:', error);
  }
}

async function restartRoom(roomId: string) {
  try {
    await colyseusService.restartRoom(roomId);
    await fetchData();
  } catch (error) {
    console.error('Failed to restart room:', error);
  }
}

async function kickPlayer(roomId: string, playerId: string) {
  try {
    await colyseusService.kickPlayer(roomId, playerId);
    await viewRoomDetails(roomId);
  } catch (error) {
    console.error('Failed to kick player:', error);
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function refreshData() {
  fetchData();
}

function goToLobby() {
  router.push('/');
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  padding: 20px;
}

.dashboard-header {
  max-width: 1400px;
  margin: 0 auto 40px;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  margin-bottom: 30px;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
}

.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
}

.rooms-section,
.lobby-section {
  margin-bottom: 40px;
}

.rooms-section h2,
.lobby-section h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
}

.no-rooms {
  background: rgba(255, 255, 255, 0.1);
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  opacity: 0.7;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

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
  padding: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
}

.player-name {
  flex: 1;
  font-weight: 600;
}

.player-clicks {
  margin-right: 15px;
  color: #666;
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

.lobby-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.lobby-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.room-type {
  font-size: 18px;
}

.room-clients {
  opacity: 0.8;
}

.room-id-small {
  font-family: monospace;
  opacity: 0.6;
  font-size: 12px;
}

.dashboard-footer {
  max-width: 1400px;
  margin: 40px auto 0;
  display: flex;
  gap: 20px;
  justify-content: center;
}

.btn-refresh,
.btn-lobby {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px 30px;
  backdrop-filter: blur(10px);
}

.btn-refresh:hover,
.btn-lobby:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>