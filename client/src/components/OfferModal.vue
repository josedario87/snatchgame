<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="modal-overlay"
      @click="closeModal"
    >
      <div 
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h3>Hacer Oferta a {{ targetPlayerName }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
          <MakeOfferForm
            :other-players="[targetPlayer].filter(Boolean)"
            :pre-selected-target="targetPlayerId"
            @make-offer="handleMakeOffer"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Player } from '@/types'
import MakeOfferForm from './MakeOfferForm.vue'

const props = defineProps<{
  isOpen: boolean
  targetPlayerId: string
  allPlayers: Player[]
}>()

const emit = defineEmits<{
  close: []
  makeOffer: [offerData: {
    targetId: string,
    offering: { turkey: number, coffee: number, corn: number },
    requesting: { turkey: number, coffee: number, corn: number }
  }]
}>()

const targetPlayer = computed(() => 
  props.allPlayers.find(p => p.id === props.targetPlayerId)
)

const targetPlayerName = computed(() => 
  targetPlayer.value?.name || 'Jugador'
)

const closeModal = () => {
  emit('close')
}

const handleMakeOffer = (offerData: {
  targetId: string,
  offering: { turkey: number, coffee: number, corn: number },
  requesting: { turkey: number, coffee: number, corn: number }
}) => {
  emit('makeOffer', offerData)
  closeModal()
}

// Close modal on escape key
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    document.addEventListener('keydown', handleEscape)
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-header h3 {
  margin: 0;
  color: white;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 0;
  max-height: calc(80vh - 80px);
  overflow-y: auto;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-header h3 {
    font-size: 1.1rem;
  }
}
</style>