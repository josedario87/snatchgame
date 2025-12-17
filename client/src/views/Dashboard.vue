<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-top">
        <div class="header-left">
          <button @click="goToSelector" class="btn btn-back">
            ← UUIDs
          </button>
          <h1>🎛️ Panel de Administración</h1>
        </div>
        <div class="connection-status">
          <div :class="['status-indicator', { 'connected': isSSEConnected, 'disconnected': !isSSEConnected }]"></div>
          <span class="status-text">{{ isSSEConnected ? 'Tiempo real' : 'Sondeo' }}</span>
        </div>
      </div>
      <div class="stats-summary">
        <div class="stat-card">
          <span class="stat-label">CCU Total</span>
          <span class="stat-value">{{ globalStats?.globalCCU || 0 }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Salas Activas</span>
          <span class="stat-value">{{ rooms.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Jugadores Totales</span>
          <span class="stat-value">{{ totalPlayers }}</span>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <!-- Open Tabs Section -->
      <div class="open-tabs-section">
        <div class="section-header">
          <h2>🧪 Abrir Pestañas de Jugadores</h2>
        </div>
        <div class="open-tabs-controls">
          <label>Cantidad:</label>
          <select v-model="openCount" class="select">
            <option :value="1">1 (específico)</option>
            <option :value="2">2</option>
            <option :value="6">6</option>
            <option :value="10">10</option>
            <option value="50-1">50 (Lote 1: UUIDs 1-50)</option>
            <option value="50-2">50 (Lote 2: UUIDs 51-100)</option>
            <option value="50-3">50 (Lote 3: UUIDs 101-150)</option>
            <option value="50-4">50 (Lote 4: UUIDs 151-200)</option>
          </select>
          <template v-if="openCount === 1">
            <label>UUID:</label>
            <select v-model="selectedUuid" class="select">
              <option v-for="u in allowedUuids" :key="u" :value="u">{{ u }}</option>
            </select>
          </template>
          <button class="btn btn-open" @click="openTabs">Abrir pestañas</button>
          <span class="hint">Abre /{uuid} en nuevas pestañas.</span>
        </div>
      </div>
      <!-- Global Controls Section -->
      <div class="global-controls-section">
        <div class="section-header">
          <h2>🌐 Controles Globales</h2>
        </div>
        <div class="global-controls-grid">
          <div class="control-group">
            <h3>Estado del Juego</h3>
            <div class="control-buttons">
              <button 
                @click="pauseAllGames" 
                class="btn btn-pause"
                :disabled="isLoadingGlobal"
              >
                ⏸️ Pausar Todos los Juegos
              </button>
              <button 
                @click="resumeAllGames" 
                class="btn btn-resume"
                :disabled="isLoadingGlobal"
              >
                ▶️ Reanudar Todos los Juegos
              </button>
              <button 
                @click="restartAllGames" 
                class="btn btn-restart"
                :disabled="isLoadingGlobal"
              >
                🔄 Reiniciar Todos los Juegos
              </button>
            </div>
          </div>
          
          <div class="control-group">
            <h3>Variante del Juego</h3>
            <div class="variant-controls">
              <select v-model="selectedGlobalVariant" class="variant-selector">
                <option value="">Seleccionar Variante</option>
                <option value="G1">G1 - Juego Básico</option>
                <option value="G2">G2 - Ofertas Forzadas</option>
                <option value="G3">G3 - Fichas de Vergüenza</option>
                <option value="G4">G4 - Sistema de Juez</option>
                <option value="G5">G5 - Avanzado</option>
              </select>
              <button 
                @click="changeGlobalVariant" 
                class="btn btn-variant"
                :disabled="!selectedGlobalVariant || isLoadingGlobal"
              >
                🎮 Cambiar Todo a {{ selectedGlobalVariant }}
              </button>
            </div>
          </div>
          
          <div class="control-group">
            <h3>Gestión de Jugadores</h3>
            <div class="control-buttons">
              <button 
                @click="shufflePlayers" 
                class="btn btn-shuffle"
                :disabled="isLoadingGlobal"
              >
                🎲 Mezclar Jugadores
              </button>
              <button 
                @click="sendAllToLobby" 
                class="btn btn-lobby-all"
                :disabled="isLoadingGlobal"
              >
                🏠 Enviar Todos al Lobby
              </button>
              <button 
                @click="resetAllUuidProfiles" 
                class="btn btn-reset-profiles"
                :disabled="isLoadingGlobal"
                title="Borrar nombre, color y vergüenza de todos los UUIDs"
              >
                🧹 Resetear Todos los Perfiles UUID
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="rooms-section">
        <DashboardActions :rooms="rooms" :room-details="roomDetails" />
        <div class="section-header">
          <h2>Salas de Juego Activas</h2>
          <div class="view-controls">
            <button 
              @click="viewMode = 'table'" 
              :class="['btn', 'btn-view-mode', { active: viewMode === 'table' }]"
            >
              📊 Vista de Tabla
            </button>
            <button 
              @click="viewMode = 'cards'" 
              :class="['btn', 'btn-view-mode', { active: viewMode === 'cards' }]"
            >
              🎴 Vista de Tarjetas
            </button>
          </div>
        </div>

        <div v-if="rooms.length === 0" class="no-rooms">
          No hay salas de juego activas
        </div>
        
        <!-- Table View -->
        <RoomsTable
          v-if="viewMode === 'table' && gameRooms.length > 0"
          :rooms="gameRooms"
          :room-details="roomDetails"
          @refresh="fetchData"
          @view-room-modal="openRoomModal"
          @close-room="closeRoom"
          @change-variant="changeRoomVariant"
          @restart-room="restartRoom"
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
        <h2>Salas del Lobby</h2>
        <div v-if="lobbyRooms.length === 0" class="no-rooms">
          No hay salas de lobby activas
        </div>
        <div v-else class="lobby-grid">
          <div v-for="room in lobbyRooms" :key="room.roomId" class="lobby-card">
            <div class="lobby-header">
              <span class="room-type">🏠 Lobby</span>
              <span class="room-clients">{{ room.clients }} jugadores</span>
            </div>
            <div class="room-id-small">{{ room.roomId.slice(0, 8) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-footer">
      <button @click="refreshData" class="btn btn-refresh">
        🔄 Actualizar Datos
      </button>
      <button @click="goToLobby" class="btn btn-lobby">
        🎮 Ir al Lobby
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
    <AppCredits position="bottom-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { colyseusService } from '../services/colyseus';
import AppCredits from '../components/AppCredits.vue';
import RoomCard from '../components/RoomCard.vue';
import RoomsTable from '../components/RoomsTable.vue';
import RoomModal from '../components/RoomModal.vue';
import DashboardActions from '../components/DashboardActions.vue';

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

// Open tabs UI state
const allowedUuids = ref<string[]>([]);
const openCount = ref<1|2|6|10|'50-1'|'50-2'|'50-3'|'50-4'>(1);
const selectedUuid = ref('');

const gameRooms = computed(() => rooms.value.filter(r => r.name === 'game'));
const lobbyRooms = computed(() => rooms.value.filter(r => r.name === 'lobby'));
const totalPlayers = computed(() => rooms.value.reduce((sum, room) => sum + room.clients, 0));

onMounted(async () => {
  // Try SSE first, fallback to polling if it fails
  initSSE();
  // Load allowed UUIDs from API (using same pattern as UuidSelector)
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/uuids-with-names`);
    
    if (!response.ok) {
      console.warn('Failed to fetch uuids-with-names, trying fallback...');
      // Fallback to regular UUIDs endpoint
      const fallbackResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/uuids`);
      const fallbackData = await fallbackResponse.json();
      allowedUuids.value = fallbackData.uuids || [];
    } else {
      const data = await response.json();
      allowedUuids.value = (data.uuids || []).map((uuidInfo: any) => uuidInfo.uuid || uuidInfo);
    }
    
    if (!selectedUuid.value && allowedUuids.value.length > 0) {
      selectedUuid.value = allowedUuids.value[0];
    }
  } catch (error) {
    console.error('Failed to load UUIDs from API:', error);
  }
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

async function closeRoom(roomId: string) {
  if (!confirm('¿Estás seguro de que quieres expulsar a todos los jugadores y cerrar esta sala?')) return;
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/rooms/${roomId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to close room');
    
    console.log(`Room ${roomId} closed successfully`);
    await fetchData();
  } catch (error) {
    console.error('Failed to close room:', error);
    alert('Failed to close room. Check console for details.');
  }
}

async function changeRoomVariant(roomId: string, variant: string) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/rooms/${roomId}/variant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant })
    });
    
    if (!response.ok) throw new Error('Failed to change room variant');
    
    console.log(`Room ${roomId} variant changed to ${variant} successfully`);
    await fetchData();
  } catch (error) {
    console.error('Failed to change room variant:', error);
    alert('Failed to change room variant. Check console for details.');
  }
}


function refreshData() {
  fetchData();
}

function goToLobby() {
  router.push('/');
}

function goToSelector() {
  router.push('/');
}

function openTabs() {
  const base = window.location.origin;
  const openOne = (uuid: string) => {
    const url = `${base}/${uuid}`;
    window.open(url, '_blank');
  };

  if (openCount.value === 1) {
    if (!selectedUuid.value) return;
    openOne(selectedUuid.value);
    return;
  }

  const pool = [...allowedUuids.value];
  if (pool.length === 0) return;

  // Handle deterministic 50-UUID batches
  if (typeof openCount.value === 'string' && openCount.value.startsWith('50-')) {
    const batchNumber = parseInt(openCount.value.split('-')[1]);
    const startIndex = (batchNumber - 1) * 50;
    const endIndex = startIndex + 50;
    const batchUuids = pool.slice(startIndex, Math.min(endIndex, pool.length));
    
    batchUuids.forEach(u => openOne(u));
    return;
  }

  // For numeric counts, randomly select N distinct UUIDs
  const N = openCount.value as number;
  
  // For other counts, use distinct UUIDs
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pick = pool.slice(0, Math.min(N, pool.length));
  pick.forEach(u => openOne(u));
}

// Global control functions
async function pauseAllGames() {
  if (!confirm('¿Estás seguro de que quieres pausar TODOS los juegos activos?')) return;
  
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
  if (!confirm('¿Estás seguro de que quieres reanudar TODOS los juegos pausados?')) return;
  
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
  if (!confirm('¿Estás seguro de que quieres REINICIAR TODOS los juegos activos? ¡Esto reiniciará todo el progreso!')) return;
  
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
  if (!confirm(`¿Estás seguro de que quieres cambiar TODOS los juegos a la variante ${selectedGlobalVariant.value}?`)) return;
  
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
  if (!confirm('¿Estás seguro de que quieres MEZCLAR todos los jugadores? ¡Esto redistribuirá aleatoriamente a los jugadores entre las salas y asignará nuevos roles!')) return;
  
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/shuffle-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to shuffle players');
    
    const result = await response.json();
    console.log('Players shuffled successfully:', result.message);
    alert(`¡Mezcla completada! ${result.message}`);
    await fetchData();
  } catch (error) {
    console.error('Failed to shuffle players:', error);
    alert('Failed to shuffle players. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

async function sendAllToLobby() {
  if (!confirm('¿Estás seguro de que quieres enviar a TODOS los jugadores de vuelta al lobby? ¡Esto terminará todos los juegos activos!')) return;
  
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

async function resetAllUuidProfiles() {
  if (!confirm('¿Seguro que deseas resetear nombre, color y vergüenza de TODOS los UUIDs? Esta acción no se puede deshacer.')) return;
  isLoadingGlobal.value = true;
  try {
    const response = await fetch(`${apiBase()}/admin/reset-uuid-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to reset UUID profiles');
    const result = await response.json();
    console.log(result?.message || 'UUID profiles reset');
    alert(result?.message || 'UUID profiles reset');
    await fetchData();
  } catch (error) {
    console.error('Failed to reset UUID profiles:', error);
    alert('Failed to reset UUID profiles. Check console for details.');
  } finally {
    isLoadingGlobal.value = false;
  }
}

// Build API base from env or current origin
function apiBase(): string {
  try {
    const raw = (import.meta.env as any)?.VITE_API_URL as string | undefined;
    const env = (raw || '').trim();
    if (env) return env.replace(/\/$/, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin.replace(/\/$/, '')}/api`;
  } catch {
    return 'http://localhost:3000/api';
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

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
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

.open-tabs-section { margin: 16px 0 24px; padding: 12px; background:#f8f9fa; border-radius: 10px; color:#333; }
.open-tabs-controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.open-tabs-controls .select { padding:6px 10px; border-radius:6px; border:1px solid #ddd; }
.btn-open { background:#2196f3; color:white; padding: 8px 12px; border:none; border-radius:8px; cursor:pointer; }
.btn-open:hover { background:#1976d2; }
.hint { color:#666; font-size:12px; }

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

.btn-reset-profiles {
  background: linear-gradient(135deg, #6b7280 0%, #374151 100%);
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
