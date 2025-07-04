<template>
  <div 
    class="trade-offer"
    :class="{ 
      'my-offer': offer.offererId === currentPlayerId,
      'target-offer': offer.targetId === currentPlayerId
    }"
  >
    <div class="offer-header">
      <span class="offerer">{{ getPlayerName(offer.offererId) }}</span>
      <span class="arrow">→</span>
      <span class="target">{{ getPlayerName(offer.targetId) }}</span>
    </div>
    <div class="offer-details">
      <div class="offering">
        <span class="label">Ofrece:</span>
        <div class="tokens">
          <span v-if="offer.offering.turkey > 0">🦃 {{ offer.offering.turkey }}</span>
          <span v-if="offer.offering.coffee > 0">☕ {{ offer.offering.coffee }}</span>
          <span v-if="offer.offering.corn > 0">🌽 {{ offer.offering.corn }}</span>
        </div>
      </div>
      <div class="requesting">
        <span class="label">Por:</span>
        <div class="tokens">
          <span v-if="offer.requesting.turkey > 0">🦃 {{ offer.requesting.turkey }}</span>
          <span v-if="offer.requesting.coffee > 0">☕ {{ offer.requesting.coffee }}</span>
          <span v-if="offer.requesting.corn > 0">🌽 {{ offer.requesting.corn }}</span>
        </div>
      </div>
    </div>
    <div class="offer-actions">
      <button 
        v-if="offer.offererId === currentPlayerId && offer.status === 'pending'"
        @click="$emit('cancel', offer.id)"
        class="cancel-btn"
      >
        Cancelar
      </button>
      <div v-else-if="offer.targetId === currentPlayerId && offer.status === 'pending'" class="response-actions">
        <button @click="$emit('respond', offer.id, 'accept')" class="accept-btn">Aceptar</button>
        <button @click="$emit('respond', offer.id, 'reject')" class="reject-btn">Rechazar</button>
        <button @click="$emit('respond', offer.id, 'snatch')" class="snatch-btn">Snatch</button>
      </div>
      <span v-else class="offer-status">{{ getOfferStatusText(offer.status) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TradeOffer } from '@/types'

defineProps<{
  offer: TradeOffer
  currentPlayerId: string
  getPlayerName: (playerId: string) => string
}>()

defineEmits<{
  cancel: [offerId: string]
  respond: [offerId: string, response: string]
}>()

const getOfferStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'accepted': return 'Aceptada'
    case 'rejected': return 'Rechazada'
    case 'snatched': return 'Snatched'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}
</script>

<style scoped>
.trade-offer {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #ccc;
}

.trade-offer.my-offer {
  border-left-color: #4CAF50;
}

.trade-offer.target-offer {
  border-left-color: #FF9800;
}

.offer-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.arrow {
  font-size: 1.2rem;
  opacity: 0.7;
}

.offer-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
  display: block;
}

.tokens {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tokens span {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.offer-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.response-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.offer-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.accept-btn {
  background: #4CAF50;
  color: white;
}

.reject-btn {
  background: #f44336;
  color: white;
}

.snatch-btn {
  background: #FF9800;
  color: white;
}

.cancel-btn {
  background: #757575;
  color: white;
}

.offer-actions button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.offer-status {
  padding: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .trade-offer {
    padding: 0.75rem;
  }
  
  .offer-header {
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }
  
  .offer-details {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .label {
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
  }
  
  .tokens span {
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
  }
  
  .offer-actions {
    gap: 0.25rem;
  }
  
  .offer-actions button {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .response-actions {
    gap: 0.25rem;
    flex-wrap: nowrap;
  }
  
  .response-actions button {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
  }
}
</style>