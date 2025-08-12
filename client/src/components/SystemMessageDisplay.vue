<template>
  <div class="system-message-container">
    <AnimatedNumber 
      :value="messageCounter" 
      :duration-ms="600"
      @value-change="onMessageChange"
    />
    <div v-if="currentMessage" :class="['system-message', `kind-${currentMessage.kind}`]">
      {{ currentMessage.text }}
    </div>
    <div v-else class="system-message no-message">
      Waiting for activity...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import AnimatedNumber from '../views/games/AnimatedNumber.vue';

interface SystemMessage {
  text: string;
  kind: string;
  timestamp: number;
}

const props = defineProps<{
  message?: SystemMessage | null;
}>();

// Use a counter that increments when message changes to trigger animation
const messageCounter = ref(0);
const currentMessage = ref<SystemMessage | null>(null);

// Watch for message changes
watch(() => props.message, (newMessage) => {
  if (newMessage && newMessage.timestamp !== currentMessage.value?.timestamp) {
    currentMessage.value = newMessage;
    messageCounter.value++; // This triggers the AnimatedNumber animation
  }
}, { immediate: true });

function onMessageChange() {
  // This fires when the AnimatedNumber animation completes
  // Could add additional effects here
}
</script>

<style scoped>
.system-message-container {
  position: relative;
  min-height: 24px;
  max-width: 200px;
}

.system-message-container :deep(.anim-number) {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}

.system-message {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #495057;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: messageSlideIn 0.6s ease-out;
}

@keyframes messageSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Different styles for different message kinds */
.kind-p2_accept {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-color: #28a745;
  color: #155724;
}

.kind-p2_reject {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border-color: #ffc107;
  color: #856404;
}

.kind-p2_snatch {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  border-color: #dc3545;
  color: #721c24;
}

.kind-p1_propose {
  background: linear-gradient(135deg, #cce5ff 0%, #b3d9ff 100%);
  border-color: #007bff;
  color: #004085;
}

.kind-p1_no_offer {
  background: linear-gradient(135deg, #e2e3e5 0%, #d1ecf1 100%);
  border-color: #6c757d;
  color: #383d41;
}

.kind-p1_shame {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border-color: #ffc107;
  color: #856404;
}

.kind-p1_report {
  background: linear-gradient(135deg, #e7e3ff 0%, #d1c4e9 100%);
  border-color: #9c27b0;
  color: #4a148c;
}

.kind-variant_change {
  background: linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%);
  border-color: #03a9f4;
  color: #01579b;
}

.kind-round_advance {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  border-color: #4caf50;
  color: #1b5e20;
}

.no-message {
  background: #f8f9fa;
  border-color: #dee2e6;
  color: #6c757d;
  font-style: italic;
  opacity: 0.7;
}
</style>