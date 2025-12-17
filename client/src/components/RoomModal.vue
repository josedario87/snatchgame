<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>Room Details</h3>
        <button @click="closeModal" class="btn-close">
          ✕
        </button>
      </div>
      
      <div class="modal-content">
        <RoomCard
          v-if="room"
          :room="room"
          :room-details="roomDetails"
          @pause="handlePause"
          @resume="handleResume"
          @restart="handleRestart"
          @view-details="handleViewDetails"
          @kick-player="handleKickPlayer"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import RoomCard from './RoomCard.vue';

interface Room {
  roomId: string;
  clients: number;
  maxClients: number;
  createdAt: number;
  metadata?: {
    gameStatus?: string;
    currentRound?: number;
    currentVariant?: string;
  };
}

interface RoomDetails {
  players?: Array<{
    sessionId: string;
    name: string;
    role: string;
    pavoTokens?: number;
    eloteTokens?: number;
    shameTokens?: number;
  }>;
  timeRemaining: number;
  winner?: string;
}

const props = defineProps<{
  isOpen: boolean;
  room?: Room;
  roomDetails?: RoomDetails;
}>();

const emit = defineEmits<{
  close: [];
  pause: [roomId: string];
  resume: [roomId: string];
  restart: [roomId: string];
  viewDetails: [roomId: string];
  kickPlayer: [roomId: string, playerId: string];
}>();

function closeModal() {
  emit('close');
}

function handlePause(roomId: string) {
  emit('pause', roomId);
}

function handleResume(roomId: string) {
  emit('resume', roomId);
}

function handleRestart(roomId: string) {
  emit('restart', roomId);
}

function handleViewDetails(roomId: string) {
  emit('viewDetails', roomId);
}

function handleKickPlayer(roomId: string, playerId: string) {
  emit('kickPlayer', roomId, playerId);
}

// Close modal on Escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    closeModal();
  }
}

document.addEventListener('keydown', handleKeydown);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e0e0e0;
  color: #333;
}

.modal-content {
  padding: 0;
}

/* Override RoomCard styles for modal context */
.modal-content :deep(.room-card) {
  box-shadow: none;
  border-radius: 0 0 16px 16px;
  margin: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-container {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-header h3 {
    font-size: 1.1rem;
  }
}
</style>