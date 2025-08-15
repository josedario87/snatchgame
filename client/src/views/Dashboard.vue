<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-top">
        <h1>🎛️ Admin Dashboard</h1>
        <div class="connection-status">
          <div :class="['status-indicator', { 'connected': isSSEConnected, 'disconnected': !isSSEConnected }]"></div>
          <span class="status-text">{{ isSSEConnected ? 'Real-time' : 'Polling' }}</span>
        </div>
      </div>
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
      <!-- Global Controls Section -->
      <div class="global-controls-section">
        <div class="section-header">
          <h2>🌐 Global Controls</h2>
        </div>
        <div class="global-controls-grid">
          <div class="control-group">
            <h3>Game State</h3>
            <div class="control-buttons">
              <button 
                @click="pauseAllGames" 
                class="btn btn-pause"
                :disabled="isLoadingGlobal"
              >
                ⏸️ Pause All Games
              </button>
              <button 
                @click="resumeAllGames" 
                class="btn btn-resume"
                :disabled="isLoadingGlobal"
              >
                ▶️ Resume All Games
              </button>
              <button 
                @click="restartAllGames" 
                class="btn btn-restart"
                :disabled="isLoadingGlobal"
              >
                🔄 Restart All Games
              </button>
            </div>
          </div>
          
          <div class="control-group">
            <h3>Game Variant</h3>
            <div class="variant-controls">
              <select v-model="selectedGlobalVariant" class="variant-selector">
                <option value="">Select Variant</option>
                <option value="G1">G1 - Basic Game</option>
                <option value="G2">G2 - Forced Offers</option>
                <option value="G3">G3 - Shame Tokens</option>
                <option value="G4">G4 - Judge System</option>
                <option value="G5">G5 - Advanced</option>
              </select>
              <button 
                @click="changeGlobalVariant" 
                class="btn btn-variant"
                :disabled="!selectedGlobalVariant || isLoadingGlobal"
              >
                🎮 Change All to {{ selectedGlobalVariant }}
              </button>
            </div>
          </div>
          
          <div class="control-group">
            <h3>Player Management</h3>
            <div class="control-buttons">
              <button 
                @click="shufflePlayers" 
                class="btn btn-shuffle"
                :disabled="isLoadingGlobal"
              >
                🎲 Shuffle Players
              </button>
              <button 
                @click="sendAllToLobby" 
                class="btn btn-lobby-all"
                :disabled="isLoadingGlobal"
              >
                🏠 Send All to Lobby
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="rooms-section">
        <div class="section-header">
          <h2>Active Game Rooms</h2>
          <div class="view-controls">
            <button 
              @click="viewMode = 'table'" 
              :class="['btn', 'btn-view-mode', { active: viewMode === 'table' }]"
            >
              📊 Table View
            </button>
            <button 
              @click="viewMode = 'cards'" 
              :class="['btn', 'btn-view-mode', { active: viewMode === 'cards' }]"
            >
              🎴 Cards View
            </button>
          </div>
        </div>

        <div v-if="rooms.length === 0" class="no-rooms">
          No active game rooms
        </div>
        
        <!-- Table View -->
        <RoomsTable
          v-if="viewMode === 'table' && gameRooms.length > 0"
          :rooms="gameRooms"
          :room-details="roomDetails"
          @refresh="fetchData"
          @view-room-modal="openRoomModal"
        />
        
        <!-- Cards View -->
        <div v-else-if="viewMode === 'cards' && gameRooms.length > 0" class="rooms-grid">
          <RoomCard
            v-for="room in gameRooms" 
            :key="room.roomId" 
            :room="room"
            :room-details="roomDetails[room.roomId]"
            @pause="pauseRoom"
            @resume="resumeRoom"
            @restart="restartRoom"
            @view-details="viewRoomDetails"
            @kick-player="kickPlayer"
          />
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

    <!-- Room Details Modal -->
    <RoomModal
      :is-open="isModalOpen"
      :room="selectedRoom"
      :room-details="roomDetails[selectedRoomId]"
      @close="closeRoomModal"
      @pause="pauseRoom"
      @resume="resumeRoom"
      @restart="restartRoom"
      @view-details="viewRoomDetails"
      @kick-player="kickPlayer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { colyseusService } from '../services/colyseus';
import RoomCard from '../components/RoomCard.vue';
import RoomsTable from '../components/RoomsTable.vue';
import RoomModal from '../components/RoomModal.vue';

const router = useRouter();
const rooms = ref<any[]>([]);
const roomDetails = ref<{ [key: string]: any }>({});
const globalStats = ref<any>(null);
const refreshInterval = ref<NodeJS.Timeout>();
const selectedRoomId = ref<string>('');
const isModalOpen = ref(false);
const viewMode = ref<'cards' | 'table'>('table');
const eventSource = ref<EventSource | null>(null);
const isSSEConnected = ref(false);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = 5;
const selectedGlobalVariant = ref('');
const isLoadingGlobal = ref(false);

const gameRooms = computed(() => rooms.value.filter(r => r.name === 'game'));
const lobbyRooms = computed(() => rooms.value.filter(r => r.name === 'lobby'));
const totalPlayers = computed(() => rooms.value.reduce((sum, room) => sum + room.clients, 0));

onMounted(() => {
  // Try SSE first, fallback to polling if it fails
  initSSE();
});

onUnmounted(() => {
  cleanup();
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
  // If we have SSE connection, details are already coming in real-time
  if (isSSEConnected.value && roomDetails.value[roomId]) {
    console.log('[Dashboard] Room details already available via SSE');
    return;
  }
  
  // Fallback to fetch if SSE is not connected or details are missing
  try {
    console.log('[Dashboard] Fetching room details via API');
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


function refreshData() {
  fetchData();
}

function goToLobby() {
  router.push('/');
}

// Global control functions
async function pauseAllGames() {
  if (!confirm('Are you sure you want to pause ALL active games?')) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/pause-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to pause all games');
    
    console.log('All games paused successfully');
    await fetchData();
  } catch (error) {
    console.error('Failed to pause all games:', error);
    alert('Failed to pause all games. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

async function resumeAllGames() {
  if (!confirm('Are you sure you want to resume ALL paused games?')) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/resume-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to resume all games');
    
    console.log('All games resumed successfully');
    await fetchData();
  } catch (error) {
    console.error('Failed to resume all games:', error);
    alert('Failed to resume all games. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

async function restartAllGames() {
  if (!confirm('Are you sure you want to RESTART ALL active games? This will reset all progress!')) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/restart-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to restart all games');
    
    console.log('All games restarted successfully');
    await fetchData();
  } catch (error) {
    console.error('Failed to restart all games:', error);
    alert('Failed to restart all games. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

async function changeGlobalVariant() {
  if (!selectedGlobalVariant.value) return;
  if (!confirm(`Are you sure you want to change ALL games to variant ${selectedGlobalVariant.value}?`)) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/change-variant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant: selectedGlobalVariant.value })
    });
    
    if (!response.ok) throw new Error('Failed to change global variant');
    
    console.log(`All games changed to variant ${selectedGlobalVariant.value} successfully`);
    await fetchData();
  } catch (error) {
    console.error('Failed to change global variant:', error);
    alert('Failed to change global variant. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

async function shufflePlayers() {
  if (!confirm('Are you sure you want to SHUFFLE all players? This will randomly redistribute players between rooms and assign new roles!')) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/shuffle-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to shuffle players');
    
    const result = await response.json();
    console.log('Players shuffled successfully:', result.message);
    alert(`Shuffle completed! ${result.message}`);
    await fetchData();
  } catch (error) {
    console.error('Failed to shuffle players:', error);
    alert('Failed to shuffle players. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

async function sendAllToLobby() {
  if (!confirm('Are you sure you want to send ALL players back to the lobby? This will end all active games!')) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/send-all-to-lobby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to send all players to lobby');
    
    console.log('All players sent to lobby successfully');
    await fetchData();
  } catch (error) {
    console.error('Failed to send all players to lobby:', error);
    alert('Failed to send all players to lobby. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

function initSSE() {
  try {
    console.log('[Dashboard] Initializing SSE connection...');
    eventSource.value = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/dashboard-stream`);
    
    eventSource.value.onopen = () => {
      console.log('[Dashboard] SSE connection opened');
      isSSEConnected.value = true;
      reconnectAttempts.value = 0;
      // Clear any existing polling interval
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
        refreshInterval.value = undefined;
      }
    };

    eventSource.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Dashboard] Received SSE data:', data);
        
        // Update rooms, room details, and global stats from SSE
        rooms.value = data.rooms || [];
        roomDetails.value = data.roomDetails || {};
        globalStats.value = data.globalStats || null;
      } catch (error) {
        console.error('[Dashboard] Error parsing SSE data:', error);
      }
    };

    eventSource.value.onerror = (error) => {
      console.error('[Dashboard] SSE connection error:', error);
      isSSEConnected.value = false;
      
      // Close the current connection
      if (eventSource.value) {
        eventSource.value.close();
        eventSource.value = null;
      }

      // Attempt reconnection with exponential backoff
      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++;
        const delay = Math.pow(2, reconnectAttempts.value) * 1000; // 2s, 4s, 8s, 16s, 32s
        console.log(`[Dashboard] Attempting SSE reconnection in ${delay}ms (attempt ${reconnectAttempts.value})`);
        
        setTimeout(() => {
          if (!isSSEConnected.value) {
            initSSE();
          }
        }, delay);
      } else {
        console.log('[Dashboard] Max SSE reconnection attempts reached, falling back to polling');
        fallbackToPolling();
      }
    };

  } catch (error) {
    console.error('[Dashboard] Failed to initialize SSE, falling back to polling:', error);
    fallbackToPolling();
  }
}

function fallbackToPolling() {
  console.log('[Dashboard] Using polling fallback');
  isSSEConnected.value = false;
  
  // Initial fetch
  fetchData();
  
  // Set up polling interval
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  refreshInterval.value = setInterval(fetchData, 3000);
}

function cleanup() {
  // Close SSE connection
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }
  
  // Clear polling interval
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  
  isSSEConnected.value = false;
}

function openRoomModal(roomId: string) {
  selectedRoomId.value = roomId;
  // Auto-fetch room details if not already loaded and SSE is not connected
  if (!roomDetails.value[roomId] && !isSSEConnected.value) {
    viewRoomDetails(roomId);
  }
  isModalOpen.value = true;
}

function closeRoomModal() {
  isModalOpen.value = false;
  selectedRoomId.value = '';
}

const selectedRoom = computed(() => {
  return gameRooms.value.find(room => room.roomId === selectedRoomId.value);
});
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

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-indicator.connected {
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  animation: pulse 2s infinite;
}

.status-indicator.disconnected {
  background: #ff9800;
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.status-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
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

.global-controls-section {
  margin-bottom: 40px;
}

.global-controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.control-group {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.control-group h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variant-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variant-selector {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.btn-pause {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
}

.btn-resume {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
}

.btn-restart {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
}

.btn-variant {
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  color: white;
}

.btn-shuffle {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
}

.btn-lobby-all {
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.rooms-section,
.lobby-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.rooms-section h2,
.lobby-section h2 {
  font-size: 1.8rem;
  margin: 0;
}

.view-controls {
  display: flex;
  gap: 8px;
}

.btn-view-mode {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
  transition: all 0.3s;
}

.btn-view-mode:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: none;
  box-shadow: none;
}

.btn-view-mode.active {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border-color: rgba(255, 255, 255, 0.9);
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

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
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