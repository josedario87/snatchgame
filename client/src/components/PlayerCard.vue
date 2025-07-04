<template>
  <div 
    class="player-card"
    :class="{ 
      'current-player': isCurrentPlayer,
      'compact': compact,
      'clickable': !isCurrentPlayer
    }"
    @click="handleClick"
  >
    <div class="player-header">
      <span class="player-name">{{ player.name }}</span>
      <span class="producer-role" v-if="!compact">{{ getProducerRoleText(player.producerRole) }}</span>
    </div>
    <div class="tokens-display" :class="{ 'compact': compact }">
      <div class="token-item">
        <span class="token-icon">🦃</span>
        <span class="token-count">{{ player.tokens.turkey }}</span>
      </div>
      <div class="token-item">
        <span class="token-icon">☕</span>
        <span class="token-count">{{ player.tokens.coffee }}</span>
      </div>
      <div class="token-item">
        <span class="token-icon">🌽</span>
        <span class="token-count">{{ player.tokens.corn }}</span>
      </div>
    </div>
    <div class="player-points">
      <span class="points-label" v-if="!compact">Puntos:</span>
      <span class="points-value">{{ player.points }}</span>
    </div>
    <div v-if="!isCurrentPlayer && compact" class="click-indicator">
      Click para ofertar
    </div>
  </div>
</template>

<script setup lang="ts">
import { Player } from '@/types'

const props = defineProps<{
  player: Player
  isCurrentPlayer: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  click: [playerId: string]
}>()

const getProducerRoleText = (role: string): string => {
  switch (role) {
    case 'turkey': return 'Productor de Pavos'
    case 'coffee': return 'Productor de Café'
    case 'corn': return 'Productor de Maíz'
    default: return role
  }
}

const handleClick = () => {
  if (!props.isCurrentPlayer) {
    emit('click', props.player.id)
  }
}
</script>

<style scoped>
.player-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}

.player-card.current-player {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.2);
}

.player-card.compact {
  padding: 0.75rem;
  min-height: 120px;
}

.player-card.clickable {
  cursor: pointer;
}

.player-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.player-card.compact .player-header {
  margin-bottom: 0.5rem;
}

.player-name {
  font-size: 1.1rem;
  font-weight: 600;
}

.player-card.compact .player-name {
  font-size: 1rem;
}

.producer-role {
  font-size: 0.9rem;
  opacity: 0.7;
}

.tokens-display {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1rem;
}

.tokens-display.compact {
  margin-bottom: 0.5rem;
}

.token-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.player-card.compact .token-item {
  gap: 0.15rem;
}

.token-icon {
  font-size: 1.5rem;
}

.player-card.compact .token-icon {
  font-size: 1.2rem;
}

.token-count {
  font-size: 1.2rem;
  font-weight: 600;
}

.player-card.compact .token-count {
  font-size: 1rem;
}

.player-points {
  text-align: center;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.player-card.compact .player-points {
  padding-top: 0.25rem;
}

.points-label {
  opacity: 0.8;
  margin-right: 0.5rem;
}

.points-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffd700;
}

.player-card.compact .points-value {
  font-size: 1.1rem;
}

.click-indicator {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  opacity: 0.6;
  text-align: center;
  transition: opacity 0.3s ease;
}

.player-card.clickable:hover .click-indicator {
  opacity: 1;
}
</style>