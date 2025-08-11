<template>
  <div class="offer-card" :class="{ disabled: isFinished }" :aria-disabled="isFinished ? 'true' : 'false'">
    <div v-if="isFinished" class="banner finished">🏁 Juego finalizado</div>
    <div class="offer-grid">
      <div class="group">
        <div class="group-title">Ofrezco</div>
        <div class="tokens">
          <div class="token-ctrl">
            <span class="icon">🦃</span>
            <div class="ctrl">
              <button class="step" @click="dec('offerPavo')" :disabled="isFinished" aria-label="-1 pavo" tabindex="-1">−</button>
              <input type="number" min="0" :max="maxOfferPavo" v-model.number="offerPavo" :disabled="isFinished" />
              <button class="step" @click="inc('offerPavo')" :disabled="isFinished" aria-label="+1 pavo" tabindex="-1">＋</button>
            </div>
          </div>
          <div class="token-ctrl">
            <span class="icon">🌽</span>
            <div class="ctrl">
              <button class="step" @click="dec('offerElote')" :disabled="isFinished" aria-label="-1 elote" tabindex="-1">−</button>
              <input type="number" min="0" :max="maxOfferElote" v-model.number="offerElote" :disabled="isFinished" />
              <button class="step" @click="inc('offerElote')" :disabled="isFinished" aria-label="+1 elote" tabindex="-1">＋</button>
            </div>
          </div>
        </div>
      </div>

      <div class="group">
        <div class="group-title">A cambio</div>
        <div class="tokens">
          <div class="token-ctrl">
            <span class="icon">🦃</span>
            <div class="ctrl">
              <button class="step" @click="dec('requestPavo')" :disabled="isFinished" aria-label="-1 pavo" tabindex="-1">−</button>
              <input type="number" min="0" :max="maxRequestPavo" v-model.number="requestPavo" :disabled="isFinished" />
              <button class="step" @click="inc('requestPavo')" :disabled="isFinished" aria-label="+1 pavo" tabindex="-1">＋</button>
            </div>
          </div>
          <div class="token-ctrl">
            <span class="icon">🌽</span>
            <div class="ctrl">
              <button class="step" @click="dec('requestElote')" :disabled="isFinished" aria-label="-1 elote" tabindex="-1">−</button>
              <input type="number" min="0" :max="maxRequestElote" v-model.number="requestElote" :disabled="isFinished" />
              <button class="step" @click="inc('requestElote')" :disabled="isFinished" aria-label="+1 elote" tabindex="-1">＋</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn primary" @click="propose" :disabled="isFinished || isNonsense">Enviar oferta</button>
      <button class="btn ghost" @click="noOffer" :disabled="disableNoOffer || isFinished">No ofrecer</button>
    </div>
    <div v-if="isNonsense && !isFinished" class="hint invalid">⚠️ La oferta no tiene sentido.</div>
    <div v-if="!isFinished && disableNoOffer" class="hint blocked">🚫 "No ofrecer" no está disponible porque P2 te obliga a proponer.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { colyseusService } from '../../services/colyseus';
import { getStateCallbacks } from 'colyseus.js';
const props = defineProps<{ disableNoOffer?: boolean; myRole?: string }>();
const emit = defineEmits(['propose','no-offer']);
const offerPavo = ref(0);
const offerElote = ref(0);
const requestPavo = ref(0);
const requestElote = ref(0);

const room = computed(() => colyseusService.gameRoom.value as any);
const p1 = computed(() => room.value?.state ? room.value.state.players.get(room.value.state.p1Id) : null);
const p2 = computed(() => room.value?.state ? room.value.state.players.get(room.value.state.p2Id) : null);
const isFinished = ref(false);
const maxOfferPavo = computed(() => (p1.value?.pavoTokens ?? Infinity));
const maxOfferElote = computed(() => (p1.value?.eloteTokens ?? Infinity));
const maxRequestPavo = computed(() => (p2.value?.pavoTokens ?? Infinity));
const maxRequestElote = computed(() => (p2.value?.eloteTokens ?? Infinity));
const isNonsense = computed(() => (offerPavo.value|0) === (requestPavo.value|0) && (offerElote.value|0) === (requestElote.value|0));

function clampAll() {
  offerPavo.value = Math.max(0, Math.min(offerPavo.value | 0, maxOfferPavo.value));
  offerElote.value = Math.max(0, Math.min(offerElote.value | 0, maxOfferElote.value));
  requestPavo.value = Math.max(0, Math.min(requestPavo.value | 0, maxRequestPavo.value));
  requestElote.value = Math.max(0, Math.min(requestElote.value | 0, maxRequestElote.value));
}
watch([offerPavo, offerElote, requestPavo, requestElote, maxOfferPavo, maxOfferElote, maxRequestPavo, maxRequestElote], clampAll);

onMounted(() => {
  const r = room.value;
  if (r?.state) {
    isFinished.value = ((r.state.gameStatus || '').toLowerCase() === 'finished');
    const $ = getStateCallbacks(r);
    $(r.state).listen('gameStatus', (v: string) => {
      isFinished.value = (v || '').toLowerCase() === 'finished';
    });
  }
});

function inc(key: 'offerPavo'|'offerElote'|'requestPavo'|'requestElote') {
  if (key === 'offerPavo') offerPavo.value = Math.min((offerPavo.value|0)+1, maxOfferPavo.value);
  else if (key === 'offerElote') offerElote.value = Math.min((offerElote.value|0)+1, maxOfferElote.value);
  else if (key === 'requestPavo') requestPavo.value = Math.min((requestPavo.value|0)+1, maxRequestPavo.value);
  else requestElote.value = Math.min((requestElote.value|0)+1, maxRequestElote.value);
}
function dec(key: 'offerPavo'|'offerElote'|'requestPavo'|'requestElote') {
  if (key === 'offerPavo') offerPavo.value = Math.max(0, offerPavo.value - 1);
  else if (key === 'offerElote') offerElote.value = Math.max(0, offerElote.value - 1);
  else if (key === 'requestPavo') requestPavo.value = Math.max(0, requestPavo.value - 1);
  else requestElote.value = Math.max(0, requestElote.value - 1);
}

function propose() {
  if (isFinished.value || isNonsense.value) return;
  // Always emit the proposal with current values
  const payload = {
    offerPavo: Math.max(0, Math.min(offerPavo.value|0, maxOfferPavo.value)),
    offerElote: Math.max(0, Math.min(offerElote.value|0, maxOfferElote.value)),
    requestPavo: Math.max(0, Math.min(requestPavo.value|0, maxRequestPavo.value)),
    requestElote: Math.max(0, Math.min(requestElote.value|0, maxRequestElote.value))
  };
  emit('propose', payload);
  
  // Clear inputs after sending
  offerPavo.value = 0;
  offerElote.value = 0;
  requestPavo.value = 0;
  requestElote.value = 0;
}

function noOffer() {
  if (isFinished.value) return;
  // Clear inputs
  offerPavo.value = 0;
  offerElote.value = 0;
  requestPavo.value = 0;
  requestElote.value = 0;
  emit('no-offer');
}
</script>

<style scoped>
.offer-card { margin-top:10px; }
.offer-card.disabled { opacity: 0.6; filter: grayscale(0.15); pointer-events: none; }
.banner { margin-bottom:8px; padding:8px 10px; border-radius:10px; font-weight:700; font-size:13px; display:flex; align-items:center; gap:8px; }
.banner.finished { background:#f8fafc; border:1px solid #e5e9f0; color:#334155; }
.offer-grid { display:grid; grid-template-columns: 1fr; gap:12px; }
@media (min-width: 500px) { .offer-grid { grid-template-columns: 1fr 1fr; } }

.group { background:#f8fafc; border:1px solid #e5e9f0; border-radius:10px; padding:5px; }
.group-title { font-weight:700; font-size:14px; color:#334155; margin-bottom:8px; }
.tokens { display:grid; grid-template-columns: 1fr; gap:5px; }
.token-ctrl { display:flex; align-items:center; gap:10px; }
.icon { font-size: 18px; width: 20px; text-align:center; }
.ctrl { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:6px; }
.ctrl input { width: 50px; padding:6px; border:1px solid #e2e8f0; border-radius:8px; text-align:center; font-weight:600; }
.ctrl input::-webkit-outer-spin-button, .ctrl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ctrl input[type=number] { -moz-appearance: textfield; }
.step { width:28px; height:28px; border-radius:8px; border:1px solid #cbd5e1; background:#f1f5f9; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center; }
.step:hover { background:#e2e8f0; }
.step:disabled { opacity: 0.6; cursor: not-allowed; }

.actions { display:flex; gap:10px; justify-content:flex-end; margin-top:12px; flex-wrap: wrap; }
.hint.invalid { margin-top:8px; font-size:13px; font-weight:600; background:#fff7ed; color:#92400e; border:1px solid #fed7aa; padding:6px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; }
.hint.blocked { margin-top:6px; font-size:13px; font-weight:600; background:#eef2ff; color:#3949ab; border:1px solid #c7d2fe; padding:6px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; }
.btn { padding:10px 14px; border:none; border-radius:10px; cursor:pointer; font-weight:700; }
.btn.primary { background:#667eea; color:#fff; box-shadow: 0 10px 20px rgba(102,126,234,0.35); }
.btn.primary:hover { filter: brightness(1.05); }
.btn.ghost { background:#eef2ff; color:#3949ab; border:1px solid #c7d2fe; }
.btn.ghost:disabled { opacity:0.5; cursor:not-allowed; }
.btn.primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.ctrl input:disabled { background: #f8fafc; color:#94a3b8; }
</style>
