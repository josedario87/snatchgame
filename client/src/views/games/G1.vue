<template>
  <div class="g">
    <h3>G1 – Sin derechos de propiedad</h3>
    <OfferControls v-if="myRole==='P1' && !state.offer?.active" :my-role="myRole" @propose="onPropose" @no-offer="onNoOffer"/>
    <OfferActions
      :state="state"
      :my-role="myRole"
      :current-variant="'G1'"
      :p1-color="p1?.color"
      :p2-color="p2?.color"
      @p2Action="$emit('p2Action', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import OfferControls from './OfferControls.vue';
import OfferActions from './OfferActions.vue';
const props = defineProps<{ state: any; myRole: string; players?: any[] }>();
const p1 = props.players?.find((p: any) => p.role === 'P1');
const p2 = props.players?.find((p: any) => p.role === 'P2');
const emit = defineEmits(['p1Action','p2Action','proposeOffer']);
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
.offer-view { font-size: 14px; color:#333; }
.hint { color:#666; }
</style>
