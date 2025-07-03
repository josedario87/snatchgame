<template>
  <div class="container">
    <div class="branding">
      <img src="/assets/logo.svg" alt="Snatch Game Logo" class="logo" />
      <h1>Snatch Game</h1>
    </div>

    <div class="buttons">
      <button @click="onJoin" :disabled="isConnecting">
        {{ isConnecting ? 'Conectando...' : 'Unirse a partida' }}
      </button>
      <button @click="onSettings">Configuración</button>
      <button @click="onLogin">Iniciar sesión</button>
    </div>

    <div v-if="connectionStatus" class="connection-status">
      {{ connectionStatus }}
    </div>

    <div class="footer">NucleoServices</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { GameClient } from '@/services/gameClient'
import { logger } from '@/services/logger'

const emit = defineEmits<{
  'join-game': [client: any]
  'show-settings': []
}>()

const gameClient = ref<GameClient | null>(null)
const isConnecting = ref(false)
const connectionStatus = ref('')

onMounted(() => {
  gameClient.value = new GameClient()
  logger.info('GameClient initialized:', gameClient.value);
})

const onJoin = async () => {
  if (isConnecting.value || !gameClient.value) return
  
  isConnecting.value = true
  connectionStatus.value = 'Conectando...'
  
  try {
    await gameClient.value.joinGame('Jugador Test', 'classic')
    connectionStatus.value = 'Conectado exitosamente!'
    logger.info('Conectado al servidor')
    
    // Emit the join-game event to transition to game screen
    emit('join-game', gameClient.value)
  } catch (error) {
    connectionStatus.value = 'Error de conexión: ' + (error as Error).message
    logger.error('Error connecting:', error)
  } finally {
    isConnecting.value = false
  }
}

const onSettings = () => {
  emit('show-settings')
}

const onLogin = () => {
  logger.info('Iniciar sesión clicked')
  // TODO: lógica para iniciar sesión
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
}

.branding {
  text-align: center;
  margin-bottom: 3rem;
}

.logo {
  width: 120px;
  height: 120px;
  margin-bottom: 1rem;
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

button {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

button:hover:not(:disabled) {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-status {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.footer {
  position: absolute;
  bottom: 2rem;
  font-size: 0.9rem;
  opacity: 0.7;
}
</style>