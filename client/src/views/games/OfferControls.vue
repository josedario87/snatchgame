<template>
  <div class="offer-card" :class="{ disabled: isFinished }" :aria-disabled="isFinished ? 'true' : 'false'">
    <div v-if="isFinished" class="banner finished">Juego terminado</div>
    <template v-else>
    <!-- Header (tap 5x to unlock Básico) -->
    <div class="offer-header" :class="{ clickable: !advancedUnlocked }" @click="onHeaderClick" :title="unlockTitle">
      Controles de oferta
    </div>
    
    <!-- Mode Toggle -->
    <!-- Show toggles only after unlocking (5 taps) -->
    <div class="mode-toggle" v-if="!isFinished && advancedUnlocked">
      <button 
        class="mode-btn" 
        :class="{ active: !advancedMode }"
        @click="advancedMode = false"
      >
        🎯 Básico
      </button>
      <button 
        v-if="advancedUnlocked"
        class="mode-btn" 
        :class="{ active: advancedMode }"
        @click="advancedMode = true"
      >
        ⚙️ Avanzado
      </button>
    </div>

    <!-- Basic Mode (always visible until advanced is unlocked and selected) -->
    <div v-if="!advancedUnlocked || !advancedMode" class="basic-mode">
      <div class="basic-offer">
        <div class="offer-text">
          Ofrecer <span class="token pill">
            <span class="icon">🦃</span>
            <span class="val">5</span>
          </span> a cambio de <span class="token pill">
            <span class="icon">🌽</span>
            <span class="val">5</span>
          </span>
        </div>
        <div class="basic-actions">
          <button class="btn primary large" @click="proposeBasic" :disabled="isFinished || !canMakeBasicOffer">
            ✨ Enviar oferta
          </button>
          <button class="btn ghost large" @click="noOffer" >
            ❌ No ofrecer
          </button>
        </div>
        <div v-if="!canMakeBasicOffer && !isFinished" class="hint invalid">
          ⚠️ No tienes suficientes pavos para esta oferta (necesitas 5🦃)
        </div>
      </div>
    </div>

    <!-- Advanced Mode (current UI) -->
    <div v-else class="offer-grid">
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
      
      <div class="actions">
        <button class="btn primary" @click="propose" :disabled="isFinished || isNonsense">Enviar oferta</button>
        <button class="btn ghost" @click="noOffer" >No ofrecer</button>
      </div>
      <div v-if="isNonsense && !isFinished" class="hint invalid">⚠️ La oferta no tiene sentido.</div>
      <div v-if="!isFinished" class="hint blocked">🚫 "No ofrecer" no está disponible porque P2 te obliga a proponer.</div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { colyseusService } from '../../services/colyseus';
import { getStateCallbacks } from 'colyseus.js';

const emit = defineEmits(['propose','no-offer']);
const offerPavo = ref(0);
const offerElote = ref(0);
const requestPavo = ref(0);
const requestElote = ref(0);
const advancedMode = ref(false); // Start in basic mode; 'Avanzado' unlocks after 5 taps

// Hidden unlock: 5 rapid taps on header to reveal "Avanzado"
const advancedUnlocked = ref(false);
const clickCount = ref(0);
let clickResetTimer: any = null;

function onHeaderClick() {
  if (advancedUnlocked.value) return;
  if (clickResetTimer) { clearTimeout(clickResetTimer); clickResetTimer = null; }
  clickCount.value += 1;
  if (clickCount.value >= 5) {
    advancedUnlocked.value = true;
  } else {
    clickResetTimer = setTimeout(() => { clickCount.value = 0; }, 1200);
  }
}

const unlockTitle = computed(() => advancedUnlocked.value ? 'Modo Avanzado disponible' : `Clicks: ${clickCount.value}/5 para desbloquear Avanzado`);

const room = computed(() => colyseusService.gameRoom.value as any);
const isFinished = ref(false);

// Reactive refs for player tokens
const p1PavoTokens = ref(0);
const p1EloteTokens = ref(0);
const p2PavoTokens = ref(0);
const p2EloteTokens = ref(0);

const maxOfferPavo = computed(() => p1PavoTokens.value);
const maxOfferElote = computed(() => p1EloteTokens.value);
const maxRequestPavo = computed(() => p2PavoTokens.value);
const maxRequestElote = computed(() => p2EloteTokens.value);
const isNonsense = computed(() => (offerPavo.value|0) === (requestPavo.value|0) && (offerElote.value|0) === (requestElote.value|0));
const canMakeBasicOffer = computed(() => p1PavoTokens.value >= 5);

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
    
    // Initialize token values
    const p1 = r.state.players.get(r.state.p1Id);
    const p2 = r.state.players.get(r.state.p2Id);
    if (p1) {
      p1PavoTokens.value = p1.pavoTokens || 0;
      p1EloteTokens.value = p1.eloteTokens || 0;
    }
    if (p2) {
      p2PavoTokens.value = p2.pavoTokens || 0;
      p2EloteTokens.value = p2.eloteTokens || 0;
    }
    
    $(r.state).listen('gameStatus', (v: string) => {
      isFinished.value = (v || '').toLowerCase() === 'finished';
    });
    
    // Reset inputs when round goes back to 1 (game restart)
    $(r.state).listen('currentRound', (round: number) => {
      if (round === 1) {
        offerPavo.value = 0;
        offerElote.value = 0;
        requestPavo.value = 0;
        requestElote.value = 0;
      }
    });

    // Update token refs when player tokens change
    $(r.state).players.onAdd((player: any, sessionId: string) => {
      const isP1 = sessionId === r.state.p1Id;
      const isP2 = sessionId === r.state.p2Id;
      
      // Set initial values
      if (isP1) {
        p1PavoTokens.value = player.pavoTokens || 0;
        p1EloteTokens.value = player.eloteTokens || 0;
      } else if (isP2) {
        p2PavoTokens.value = player.pavoTokens || 0;
        p2EloteTokens.value = player.eloteTokens || 0;
      }
      
      $(player).listen('pavoTokens', (tokens: number) => {
        if (isP1) {
          p1PavoTokens.value = tokens || 0;
        } else if (isP2) {
          p2PavoTokens.value = tokens || 0;
        }
        clampAll();
      });
      $(player).listen('eloteTokens', (tokens: number) => {
        if (isP1) {
          p1EloteTokens.value = tokens || 0;
        } else if (isP2) {
          p2EloteTokens.value = tokens || 0;
        }
        clampAll();
      });
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

function proposeBasic() {
  if (isFinished.value || !canMakeBasicOffer.value) return;
  // Send fixed basic offer: 5 pavos for 5 elotes
  const payload = {
    offerPavo: 5,
    offerElote: 0,
    requestPavo: 0,
    requestElote: 5
  };
  emit('propose', payload);
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
.offer-header { font-weight: 800; font-size: 14px; color:#334155; margin: 4px 2px 8px; }
.offer-header.clickable { cursor: pointer; user-select: none; opacity: 0.85; }
.offer-header.clickable:hover { filter: brightness(0.95); }
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

/* Mode Toggle */
.mode-toggle {
  display: flex;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
  gap: 2px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: #64748b;
}

.mode-btn.active {
  background: #667eea;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.mode-btn:hover:not(.active) {
  background: #e2e8f0;
  color: #475569;
}

/* Basic Mode */
.basic-mode {
  padding: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  border: 1px solid #e5e9f0;
}

.basic-offer {
  text-align: center;
}

.offer-text {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16px;
  line-height: 1.4;
}

.token.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f7f7f7;
  border: 1px solid #eee;
  white-space: nowrap;
}

.token.pill .icon {
  font-size: 14px;
}

.token.pill .val {
  font-weight: 600;
  color: #333;
  display: inline-block;
  min-width: 1ch;
}

.basic-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.btn.large {
  padding: 10px 16px;
  font-size: 14px;
  border-radius: 10px;
  width: 100%;
  min-height: 44px;
}

.btn.primary.large {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  transform: translateY(0);
  transition: all 0.2s;
}

.btn.primary.large:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn.ghost.large {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn.ghost.large:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

@media (min-width: 320px) {
  .offer-text {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .basic-mode {
    padding: 16px;
  }
}

@media (min-width: 480px) {
  .basic-actions {
    flex-direction: row;
    gap: 12px;
  }
  
  .btn.large {
    width: auto;
    min-width: 140px;
    padding: 12px 20px;
    font-size: 15px;
  }
  
  .offer-text {
    font-size: 16px;
    margin-bottom: 16px;
  }
  
  .basic-mode {
    padding: 20px;
  }
}
</style>
