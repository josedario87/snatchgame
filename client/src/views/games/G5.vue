<template>
  <div class="g">
    <h3>G5 – Cheap talk (chat previo no vinculante)</h3>
    <div class="chat">
      <input v-model="msg" placeholder="Mensaje (no vinculante)" />
      <button class="btn" @click="send">Enviar</button>
    </div>
    <OfferControls v-if="myRole==='P1' && !state.offer?.active" @propose="onPropose" @no-offer="onNoOffer"/>
    <div v-if="state.offer?.active && !state.p2Action" class="controls">
      <div class="offer-view">Oferta: 🦃 {{ state.offer.offerPavo }} / 🌽 {{ state.offer.offerElote }} | Pedido: 🦃 {{ state.offer.requestPavo }} / 🌽 {{ state.offer.requestElote }}</div>
      <div v-if="myRole === 'P2'">
        <button class="btn" @click="$emit('p2Action', 'accept')">P2: Aceptar</button>
        <button class="btn" @click="$emit('p2Action', 'reject')">P2: Rechazar</button>
        <button class="btn" @click="$emit('p2Action', 'snatch')">P2: Robar</button>
      </div>
      <div v-else class="hint">Esperando decisión de P2…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { colyseusService } from '../../services/colyseus';
import OfferControls from './OfferControls.vue';

const props = defineProps<{ state: any; myRole: string }>();
const emit = defineEmits(['p1Action','p2Action','proposeOffer']);

const msg = ref('');
function send() {
  // For MVP, just log locally; can be wired to room message later
  console.log('cheap talk:', msg.value);
  msg.value = '';
}

function onPropose(payload: any) { 
  emit('proposeOffer', payload); 
}
function onNoOffer() {
  emit('p1Action', 'no_offer');
}
</script>

<style scoped>
.g { background:#fff; padding:12px; border-radius:8px; }
.controls { display:flex; gap:8px; margin:8px 0; }
.chat { display:flex; gap:8px; margin:8px 0; }
.chat input { flex:1; padding:8px; border-radius:6px; border:1px solid #ddd; }
.btn { padding:8px 12px; border:none; border-radius:6px; background:#e3f2fd; color:#1565c0; cursor:pointer; }
.offer-view { font-size: 14px; color:#333; }
.hint { color:#666; }
</style>
