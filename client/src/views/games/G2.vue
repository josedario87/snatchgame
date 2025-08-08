<template>
  <div class="g">
    <h3>G2 – Regla contraproductiva (P2 puede forzar)</h3>
    <div class="controls" v-if="myRole === 'P2'">
      <label><input type="checkbox" :checked="state.forcedByP2" @change="$emit('p2Force', ($event.target as HTMLInputElement).checked)"/> Forzar oferta</label>
    </div>
    <OfferControls v-if="myRole==='P1' && !state.offer?.active" :disable-no-offer="state.forcedByP2" @propose="onPropose" @no-offer="onNoOffer"/>
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
import OfferControls from './OfferControls.vue';
const props = defineProps<{ state: any; myRole: string }>();
const emit = defineEmits(['p2Force','p1Action','p2Action','proposeOffer']);
function onPropose(payload: any) { 
  emit('proposeOffer', payload); 
}
function onNoOffer() {
  if (!props.state.forcedByP2) {
    emit('p1Action', 'no_offer');
  }
}
</script>

<style scoped>
.g { background:#fff; padding:12px; border-radius:8px; }
.controls { display:flex; gap:8px; margin:8px 0; }
.btn { padding:8px 12px; border:none; border-radius:6px; background:#e3f2fd; color:#1565c0; cursor:pointer; }
.offer-view { font-size: 14px; color:#333; }
.hint { color:#666; }
</style>
