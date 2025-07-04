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

    <!-- Trading Phase -->
    <div v-else-if="gamePhase === 'trading'" class="game-screen">
      <!-- Game Header -->
      <div class="game-header">
        <div class="round-info">
          <h2>Ronda {{ round }}</h2>
          <span class="phase">Fase de Intercambio</span>
        </div>
      </div>

      <!-- Main Game Layout -->
      <div class="game-layout">
        <!-- Left side: Players -->
        <div class="players-section">
          <!-- Other Players (compact) -->
          <div class="other-players">
            <PlayerCard
              v-for="player in otherPlayers" 
              :key="player.id"
              :player="player"
              :is-current-player="false"
              :compact="true"
              @click="openOfferModal"
            />
          </div>
          
          <!-- Current Player (large) -->
          <div class="current-player-section">
            <PlayerCard
              v-if="currentPlayer"
              :player="currentPlayer"
              :is-current-player="true"
              :compact="false"
            />
          </div>
        </div>

        <!-- Right side: Offers (Desktop) / Bottom: Offers (Mobile) -->
        <div class="offers-section">
          <ScrollableOffers
            :offers="activeOffers"
            :current-player-id="currentPlayerId"
            :get-player-name="getPlayerName"
            @cancel="cancelOffer"
            @respond="respondToOffer"
          />
        </div>
      </div>

      <!-- Offer Modal -->
      <OfferModal
        :is-open="showOfferModal"
        :target-player-id="selectedTargetId"
        :all-players="players"
        @close="closeOfferModal"
        @make-offer="makeOffer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, triggerRef } from 'vue'
import { GameClient } from '@/services/gameClient'
import { GameState, Player, TradeOffer } from '@/types'
import type { Room } from 'colyseus.js'
import { logger } from '@/services/logger'
import PlayerCard from './PlayerCard.vue'
import ScrollableOffers from './ScrollableOffers.vue'
import OfferModal from './OfferModal.vue'

const props = defineProps<{
  gameClient: any
}>()

const gameState = ref<GameState | null>(null)
const showOfferModal = ref(false)
const selectedTargetId = ref('')

// Computed properties
const gamePhase = computed(() => {
  const phase = gameState.value?.gamePhase || 'waiting'
  logger.computedProperty('gamePhase', phase)
  return phase
})
const round = computed(() => gameState.value?.round || 1)
const minPlayers = computed(() => gameState.value?.minPlayers || 3)
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
const currentPlayer = computed(() => {
  return players.value.find(p => p.id === currentPlayerId.value) || null
})
const otherPlayers = computed(() => {
  return players.value.filter(p => p.id !== currentPlayerId.value)
})
const activeOffers = computed(() => {
  if (!gameState.value) return []
  return Array.from(gameState.value.activeTradeOffers.values()).reverse()
})

// Helper functions

const getPlayerName = (playerId: string): string => {
  if (!gameState.value) return 'Desconocido'
  const player = gameState.value.players.get(playerId)
  return player?.name || 'Desconocido'
}


// Modal actions
const openOfferModal = (targetPlayerId: string) => {
  selectedTargetId.value = targetPlayerId
  showOfferModal.value = true
}

const closeOfferModal = () => {
  showOfferModal.value = false
  selectedTargetId.value = ''
}

// Game actions
const makeOffer = (offerData: {
  targetId: string,
  offering: { turkey: number, coffee: number, corn: number },
  requesting: { turkey: number, coffee: number, corn: number }
}) => {
  if (!props.gameClient) return
  
  props.gameClient.makeOffer(offerData)
}

const respondToOffer = (offerId: string, response: string) => {
  if (!props.gameClient) return
  
  props.gameClient.respondToOffer({
    offerId,
    response
  })
}

const cancelOffer = (offerId: string) => {
  if (!props.gameClient) return
  
  props.gameClient.cancelOffer({
    offerId
  })
}

onMounted(() => {
  if (!props.gameClient) return
  
  logger.gameMounted()
  
  // Subscribe to state changes
  const unsubscribeStateChange = props.gameClient.onStateChange((state: GameState) => {
    logger.gameComponentUpdate({
      gamePhase: state.gamePhase,
      playerCount: state.players.size,
      gameStarted: state.gameStarted,
      round: state.round
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
  justify-content: flex-start;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
}

/* Waiting Screen */
.waiting-screen {
  text-align: center;
  margin-top: 10vh;
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
  max-width: 1400px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.game-header {
  text-align: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.round-info h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.phase {
  font-size: 1.2rem;
  opacity: 0.8;
}

/* Main Game Layout */
.game-layout {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 2rem;
  flex: 1;
  min-height: 0;
}

.players-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.other-players {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.current-player-section {
  margin-top: auto;
}

.offers-section {
  min-height: 0;
}

/* Mobile Layout */
@media (max-width: 768px) {
  .game-container {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }
  
  .game-screen {
    height: auto;
    min-height: calc(100vh - 2rem);
  }
  
  .game-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 400px;
  }
  
  .players-section {
    order: 1;
  }
  
  .offers-section {
    order: 2;
    min-height: 400px;
  }
  
  .other-players {
    grid-template-columns: 1fr 1fr;
    margin-bottom: 1rem;
  }
  
  .current-player-section {
    margin-top: 0;
  }
}

/* Tablet adjustments */
@media (max-width: 1024px) and (min-width: 769px) {
  .game-layout {
    grid-template-columns: 1fr 300px;
  }
}
</style>