<template>
  <div class="admin-app">
    <header class="admin-header">
      <h1>📊 SnatchGame Admin Dashboard</h1>
      <div class="connection-status" :class="{ connected: isConnected }">
        {{ isConnected ? '🟢 Conectado' : '🔴 Desconectado' }}
      </div>
    </header>

    <main class="admin-main">
      <div class="dashboard-grid">
        <!-- Game Stats Cards -->
        <div class="stats-card">
          <h3>👥 Jugadores Conectados</h3>
          <div class="stat-value">{{ gameStats.connectedPlayers || 0 }}</div>
        </div>

        <div class="stats-card">
          <h3>🎮 Partidas Activas</h3>
          <div class="stat-value">{{ gameStats.activeGames || 0 }}</div>
        </div>

        <div class="stats-card">
          <h3>🎯 Ronda Actual</h3>
          <div class="stat-value">{{ gameStats.currentRound || 'N/A' }}</div>
        </div>

        <div class="stats-card">
          <h3>📊 Estado del Juego</h3>
          <div class="stat-value">{{ getGameStateText(gameStats.gameState) }}</div>
        </div>
      </div>

      <!-- Admin Controls -->
      <div class="admin-controls">
        <h3>🎛️ Control del Juego</h3>
        <div class="control-buttons">
          <button @click="previousRound" :disabled="!isConnected" class="btn btn-secondary">
            ⏮️ Retroceder Ronda
          </button>
          <button @click="advanceRound" :disabled="!isConnected" class="btn btn-primary">
            ⏭️ Avanzar Ronda
          </button>
          <button @click="pauseGame" :disabled="!isConnected" class="btn btn-warning">
            ⏸️ Pausar Juego
          </button>
          <button @click="resumeGame" :disabled="!isConnected" class="btn btn-success">
            ▶️ Reanudar Juego
          </button>
          <button @click="showKickPlayerModal" :disabled="!isConnected" class="btn btn-danger">
            🚫 Expulsar Jugador
          </button>
          <button @click="kickAllPlayers" :disabled="!isConnected" class="btn btn-danger btn-destructive">
            🚫🚫 Expulsar Jugadores
          </button>
        </div>
      </div>

      <!-- Player List -->
      <div class="player-list-section">
        <h3>👥 Lista de Jugadores ({{ gameStats.players?.length || 0 }})</h3>
        <div class="player-list">
          <div v-if="gameStats.players && gameStats.players.length > 0">
            <div v-for="player in gameStats.players" :key="player.id" class="player-item">
              <div class="player-info">
                <div class="player-header">
                  <span class="player-name">{{ player.name }}</span>
                  <span class="player-status" :class="{ connected: player.isConnected, disconnected: !player.isConnected }">
                    {{ player.isConnected ? '🟢' : '🔴' }}
                  </span>
                </div>
                <div class="player-details">
                  <span class="player-room">Sala: {{ player.roomId?.slice(-6) || 'N/A' }}</span>
                  <span class="player-role">{{ getRoleText(player.role) }}</span>
                  <span class="player-producer">{{ getProducerText(player.producerRole) }}</span>
                </div>
                <div class="player-tokens">
                  <span class="token-item">🦃 {{ player.tokens?.turkeys || 0 }}</span>
                  <span class="token-item">☕ {{ player.tokens?.coffee || 0 }}</span>
                  <span class="token-item">🌽 {{ player.tokens?.corn || 0 }}</span>
                </div>
              </div>
              <div class="player-actions">
                <button @click="kickPlayer(player.id)" class="btn btn-sm btn-danger">
                  🚫 Expulsar
                </button>
              </div>
            </div>
          </div>
          <div v-else class="no-players">
            Sin jugadores conectados
          </div>
        </div>
      </div>

      <!-- Debug Info -->
      <div class="debug-section">
        <h3>🔧 Debug Info</h3>
        <div class="debug-info">
          <div><strong>Última actualización:</strong> {{ lastUpdate }}</div>
          <div><strong>Conexión SSE:</strong> {{ isConnected ? 'Activa' : 'Inactiva' }}</div>
          <div><strong>Servidor:</strong> {{ serverUrl }}</div>
        </div>
        <details class="raw-data">
          <summary>Ver datos completos</summary>
          <pre>{{ JSON.stringify(gameStats, null, 2) }}</pre>
        </details>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { adminService } from './services/adminService'

// Reactive state
const isConnected = ref(false)
const gameStats = ref<any>({})
const lastUpdate = ref('')
const serverUrl = ref('')

// Initialize admin service
onMounted(async () => {
  try {
    // Get config from server
    const configResponse = await fetch('/api/config')
    const config = await configResponse.json()
    serverUrl.value = config.serverUrl

    // Connect to SSE
    await adminService.connect((data) => {
      if (data.type === 'connected') {
        isConnected.value = true
      } else if (data.type === 'gameStats') {
        gameStats.value = data.data
        lastUpdate.value = data.timestamp
      } else if (data.type === 'error') {
        console.error('Admin service error:', data.message)
      }
    })

    adminService.onConnectionChange((connected) => {
      isConnected.value = connected
    })

  } catch (error) {
    console.error('Error initializing admin dashboard:', error)
  }
})

onUnmounted(() => {
  adminService.disconnect()
})

// Helper functions
const getGameStateText = (state: string) => {
  const stateMap: { [key: string]: string } = {
    'waiting_for_players': 'Esperando jugadores',
    'paused': 'Pausado',
    'game_over': 'Juego terminado',
    'in_progress': 'En progreso'
  }
  return stateMap[state] || state || 'Desconocido'
}

const getRoleText = (role: string) => {
  const roleMap: { [key: string]: string } = {
    'trader': 'Comerciante',
    'judge': 'Juez',
    'player': 'Jugador'
  }
  return roleMap[role] || role || 'Desconocido'
}

const getProducerText = (producerRole: string) => {
  const producerMap: { [key: string]: string } = {
    'turkey': '🦃 Productor de Pavos',
    'coffee': '☕ Productor de Café',
    'corn': '🌽 Productor de Maíz'
  }
  return producerMap[producerRole] || producerRole || 'Desconocido'
}

// Admin actions
const pauseGame = async () => {
  try {
    await adminService.pauseGame()
    alert('Juego pausado exitosamente')
  } catch (error) {
    alert('Error al pausar el juego')
  }
}

const resumeGame = async () => {
  try {
    await adminService.resumeGame()
    alert('Juego reanudado exitosamente')
  } catch (error) {
    alert('Error al reanudar el juego')
  }
}

const kickPlayer = async (playerId: string) => {
  if (confirm('¿Estás seguro de que quieres expulsar a este jugador?')) {
    try {
      await adminService.kickPlayer(playerId)
      alert('Jugador expulsado exitosamente')
    } catch (error) {
      alert('Error al expulsar al jugador')
    }
  }
}

const showKickPlayerModal = () => {
  const playerId = prompt('Ingresa el ID del jugador a expulsar:')
  if (playerId) {
    kickPlayer(playerId)
  }
}

const kickAllPlayers = async () => {
  const confirmation = confirm('⚠️ ¿Estás seguro de que quieres expulsar a TODOS los jugadores de TODAS las salas? Esta acción no se puede deshacer.')
  if (confirmation) {
    try {
      await adminService.kickAllPlayers()
      alert('Todos los jugadores han sido expulsados exitosamente')
    } catch (error) {
      alert('Error al expulsar a todos los jugadores')
    }
  }
}

const advanceRound = async () => {
  try {
    await adminService.advanceRound()
    alert('Ronda avanzada exitosamente en todas las salas')
  } catch (error) {
    alert('Error al avanzar la ronda')
  }
}

const previousRound = async () => {
  try {
    await adminService.previousRound()
    alert('Ronda retrocedida exitosamente en todas las salas')
  } catch (error) {
    alert('Error al retroceder la ronda')
  }
}
</script>

<style scoped>
.admin-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.connection-status {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: rgba(255, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.connection-status.connected {
  background: rgba(0, 255, 0, 0.2);
}

.admin-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stats-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  opacity: 0.9;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #ffd700;
}

.admin-controls {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-success {
  background: #4caf50;
  color: white;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-secondary {
  background: #607d8b;
  color: white;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-destructive {
  background: #d32f2f !important;
  border: 2px solid #b71c1c;
  font-weight: 600;
  animation: pulse-danger 2s infinite;
}

.btn-destructive:hover:not(:disabled) {
  background: #b71c1c !important;
  transform: scale(1.02);
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.player-list-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-list {
  margin-top: 1rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player-name {
  font-weight: 600;
  font-size: 1rem;
  color: #ffd700;
}

.player-status.connected {
  color: #4caf50;
}

.player-status.disconnected {
  color: #f44336;
}

.player-details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  opacity: 0.8;
}

.player-room {
  color: #81c784;
  font-family: monospace;
}

.player-role {
  color: #64b5f6;
}

.player-producer {
  color: #ffb74d;
  font-weight: 500;
}

.player-tokens {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.token-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.player-actions {
  margin-left: 1rem;
}

.no-players {
  text-align: center;
  opacity: 0.7;
  padding: 2rem;
}

.debug-section {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-info {
  margin: 1rem 0;
}

.debug-info div {
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.raw-data {
  margin-top: 1rem;
}

.raw-data pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .admin-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .admin-main {
    padding: 1rem;
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .control-buttons {
    flex-direction: column;
  }
  
  .player-item {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>