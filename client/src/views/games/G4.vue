<template>
  <div class="g">
    <h3>G4 – Derechos mínimos de propiedad (juez)</h3>
    <OfferControls v-if="myRole==='P1' && !state.offer?.active" @propose="onPropose" @no-offer="onNoOffer"/>
    <div v-if="state.offer?.active" class="controls">
      <div v-if="myRole === 'P2'">
        <button class="btn" @click="$emit('p2Action', 'accept')">P2: Aceptar</button>
        <button class="btn" @click="$emit('p2Action', 'reject')">P2: Rechazar</button>
        <button class="btn" @click="$emit('p2Action', 'snatch')">P2: Robar</button>
      </div>
      <div v-else class="hint">Esperando decisión de P2…</div>
    </div>
    <div v-if="state.p2Action === 'snatch' && myRole === 'P1'" class="controls">
      <button class="btn warn" @click="$emit('report', true)">Denunciar (confiscar tokens)</button>
      <button class="btn" @click="$emit('report', false)">No denunciar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import OfferControls from './OfferControls.vue';
const props = defineProps<{ state: any; myRole: string }>();
const emit = defineEmits(['p1Action','p2Action','report','proposeOffer']);
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
.btn { padding:8px 12px; border:none; border-radius:6px; background:#e3f2fd; color:#1565c0; cursor:pointer; }
.btn.warn { background:#ffe0e0; color:#b71c1c; }
.hint { color:#666; }
</style>
