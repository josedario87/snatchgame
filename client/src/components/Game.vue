<template>
  <div class="game-container">
    <!-- Waiting Phase -->
    <div v-if="gamePhase === 'waiting'" class="waiting-screen">
      <div class="waiting-content">
        <h2>Esperando jugadores...</h2>
        <div class="player-count">
          {{ playerCount }}/{{ minPlayers }} jugadores conectados
        </div>
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Playing Phase -->
    <div v-else-if="gamePhase === 'playing'" class="game-screen">
      <!-- Scoreboard -->
      <div class="scoreboard">
        <div 
          v-for="player in players" 
          :key="player.id"
          class="player-score"
          :class="{ 'current-player': player.id === currentPlayerId }"
        >
          <span class="player-name">{{ player.name }}</span>
          <span class="score">{{ player.score }}</span>
        </div>
      </div>

      <!-- Click Button -->
      <div class="click-area">
        <button 
          @click="handleClick"
          class="click-button"
          :class="{ 'clicked': isClicked }"
        >
          <span class="click-text">¡CLICK!</span>
          <div class="click-effect" v-if="showEffect"></div>
        </button>
      </div>

      <!-- Current Player Info -->
      <div class="player-info">
        <p>Tu puntaje: <strong>{{ currentPlayerScore }}</strong></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, triggerRef } from 'vue'
import { GameClient } from '@/services/gameClient'
import { GameState, Player } from '@/types'
import type { Room } from 'colyseus.js'
import { logger } from '@/services/logger'

const props = defineProps<{
  gameClient: any
}>()

const gameState = ref<GameState | null>(null)
const isClicked = ref(false)
const showEffect = ref(false)

// Computed properties
const gamePhase = computed(() => {
  const phase = gameState.value?.gamePhase || 'waiting'
  logger.computedProperty('gamePhase', phase)
  return phase
})
const minPlayers = computed(() => gameState.value?.minPlayers || 2)
const playerCount = computed(() => {
  const count = gameState.value?.players.size || 0
  logger.computedProperty('playerCount', count)
  return count
})
const players = computed(() => {
  if (!gameState.value) return []
  const playerList = Array.from(gameState.value.players.values())
  logger.computedProperty('players', playerList)
  return playerList
})
const currentPlayerId = computed(() => props.gameClient?.currentPlayerId || '')
const currentPlayerScore = computed(() => {
  if (!gameState.value || !currentPlayerId.value) return 0
  const player = gameState.value.players.get(currentPlayerId.value)
  return player?.score || 0
})

const handleClick = () => {
  if (!props.gameClient || gamePhase.value !== 'playing') return
  
  // Send click through gameClient
  props.gameClient.sendClick()
  
  // Visual feedback
  isClicked.value = true
  showEffect.value = true
  
  setTimeout(() => {
    isClicked.value = false
  }, 150)
  
  setTimeout(() => {
    showEffect.value = false
  }, 400)
}

onMounted(() => {
  if (!props.gameClient) return
  
  logger.gameMounted()
  
  // Subscribe to state changes
  const unsubscribeStateChange = props.gameClient.onStateChange((state: GameState) => {
    logger.gameComponentUpdate({
      gamePhase: state.gamePhase,
      playerCount: state.players.size,
      gameStarted: state.gameStarted
    })
    
    // Force Vue reactivity by assigning new reference and triggering update
    gameState.value = state
    triggerRef(gameState)
    
    logger.info('Reactive gameState updated and triggered:', gameState.value)
  })
  
  // Subscribe to phase changes for debugging
  const unsubscribePhaseChange = props.gameClient.onGamePhaseChange((phase: string) => {
    logger.info('Game component detected phase change:', phase)
  })
  
  // Cleanup on unmount
  onUnmounted(() => {
    logger.gameUnmounted()
    unsubscribeStateChange()
    unsubscribePhaseChange()
  })
})

</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
}

/* Waiting Screen */
.waiting-screen {
  text-align: center;
}

.waiting-content h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.player-count {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Game Screen */
.game-screen {
  width: 100%;
  max-width: 800px;
}

.scoreboard {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.player-score {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.player-score.current-player {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.2);
}

.player-name {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.score {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

/* Click Button */
.click-area {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.click-button {
  position: relative;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(45deg, #ff6b6b, #ff8e53);
  color: white;
  font-size: 2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.1s ease;
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
  overflow: hidden;
}

.click-button:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 35px rgba(255, 107, 107, 0.6);
}

.click-button.clicked {
  transform: scale(0.95);
  background: linear-gradient(45deg, #ff8e53, #ff6b6b);
}

.click-text {
  position: relative;
  z-index: 2;
}

.click-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: clickRipple 0.4s ease-out;
}

@keyframes clickRipple {
  0% {
    width: 30px;
    height: 30px;
    opacity: 0.8;
  }
  100% {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}

.player-info {
  text-align: center;
  font-size: 1.2rem;
}

.player-info strong {
  color: #ffd700;
}
</style>