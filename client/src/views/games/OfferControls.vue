<template>
  <div class="offer">
    <div class="row">
      <label>Ofrezco:</label>
      <input type="number" min="0" v-model.number="offerPavo" /> 🦃
      <input type="number" min="0" v-model.number="offerElote" /> 🌽
    </div>
    <div class="row">
      <label>A cambio:</label>
      <input type="number" min="0" v-model.number="requestPavo" /> 🦃
      <input type="number" min="0" v-model.number="requestElote" /> 🌽
    </div>
    <div class="controls">
      <button class="btn primary" @click="propose">Enviar oferta</button>
      <button class="btn" @click="noOffer" :disabled="disableNoOffer">No ofrecer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{ disableNoOffer?: boolean }>();
const emit = defineEmits(['propose','no-offer']);
const offerPavo = ref(0);
const offerElote = ref(0);
const requestPavo = ref(0);
const requestElote = ref(0);

function propose() {
  // Always emit the proposal with current values
  const payload = {
    offerPavo: Math.max(0, offerPavo.value|0),
    offerElote: Math.max(0, offerElote.value|0),
    requestPavo: Math.max(0, requestPavo.value|0),
    requestElote: Math.max(0, requestElote.value|0)
  };
  emit('propose', payload);
  
  // Clear inputs after sending
  offerPavo.value = 0;
  offerElote.value = 0;
  requestPavo.value = 0;
  requestElote.value = 0;
}

function noOffer() {
  // Clear inputs
  offerPavo.value = 0;
  offerElote.value = 0;
  requestPavo.value = 0;
  requestElote.value = 0;
  emit('no-offer');
}
</script>

<style scoped>
.offer { background:#f9fafb; padding:10px; border-radius:8px; }
.row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
label { width:70px; color:#555; }
input { width:80px; padding:6px; border:1px solid #ddd; border-radius:6px; }
.controls { display:flex; gap:8px; }
.btn { padding:6px 10px; border:none; border-radius:6px; background:#e3f2fd; color:#1565c0; cursor:pointer; }
.btn:disabled { opacity:0.5; cursor:not-allowed; }
.btn.primary { background:#667eea; color:#fff; }
</style>
