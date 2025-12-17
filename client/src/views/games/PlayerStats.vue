<template>
  <div 
    class="player-card" 
    :class="{ 'current-player': highlight, 'shamed': hasShame }" 
    :style="{ '--primary': primary } as any"
    :aria-label="hasShame ? 'Jugador con vergüenza' : 'Jugador'"
  >
    <div class="header">
      <div class="name clickable" @click.stop="toggleHistory" :title="'Ver historial'">{{ player.name || '—' }}</div>
      <div class="role" :class="player.role">{{ player.role || '—' }}</div>
      <div v-if="hasShame" class="shame-badge" :title="`Vergüenza: ${player.shameTokens}`">😶 × {{ player.shameTokens }}</div>
    </div>
    <div v-if="!showHistory" class="tokens">
      <div class="token pill">
        <span class="icon">🦃</span>
        <span class="val"><AnimatedNumber :value="player.pavoTokens ?? 0" /></span>
      </div>
      <div class="token pill">
        <span class="icon">🌽</span>
        <span class="val"><AnimatedNumber :value="player.eloteTokens ?? 0" /></span>
      </div>
      <Transition name="pop">
        <div v-if="hasShame" class="token pill shame-pill" aria-label="Vergüenza">
          <span class="icon">😶</span>
          <span class="val"><AnimatedNumber :value="player.shameTokens ?? 0" :pulseOnFirst="true" /></span>
        </div>
      </Transition>
    </div>
    <div v-if="!showHistory" class="score">
      <span class="label">Puntuación</span>
      <span class="value"><AnimatedNumber :value="displayScore" /></span>
    </div>
  </div>
  
  <!-- Fullscreen modal overlay for history -->
  <div v-if="showHistory" class="history-overlay" @click.self="toggleHistory">
    <div class="history-modal">
      <div class="history-modal-header">
        <div class="title">Historial del sistema — {{ player.name }}</div>
        <div class="header-actions">
          <button class="btn-filter" :class="{ active: onlyEventsMade }" @click.stop="onlyEventsMade = !onlyEventsMade" :title="onlyEventsMade ? 'Mostrando solo eventos hechos por el jugador' : 'Mostrar solo eventos hechos por el jugador'">
            {{ onlyEventsMade ? 'Filtro: activo' : 'Filtro: eventos del jugador' }}
          </button>
          <button class="close-history" @click.stop="toggleHistory">Cerrar</button>
        </div>
      </div>
      <div v-if="loadingHistory" class="history-loading">Cargando…</div>
      <div v-else-if="!historyItems.length" class="history-empty">Sin historial</div>
      <div v-else class="history-table">
        <div class="history-scroll">
          <div class="history-header history-grid">
            <span class="th t">Hora</span>
            <span class="th r">Rol</span>
            <span class="th tok">Tokens</span>
            <span class="th k">Evento</span>
            <span class="th rnd">Ronda/Juego</span>
            <span class="th x">Mensaje</span>
            <span class="th room">Sala</span>
          </div>
          <div v-for="m in filteredHistory" :key="m.timestamp + '-' + (m.kind||'')" class="history-row history-grid">
            <span class="t">{{ fmtTime(m.timestamp) }}</span>
            <span class="r">{{ (m.role || '') || '—' }}</span>
            <span class="tok">🦃 {{ m.pavoTokens ?? 0 }} · 🌽 {{ m.eloteTokens ?? 0 }} <span v-if="(m.shameTokens ?? 0) > 0">· 😶 {{ m.shameTokens }}</span></span>
            <span class="k">{{ friendlyKind(m.kind) }}</span>
            <span class="rnd" :title="`Ronda ${m.round || '?'} - Juego ${m.gameVariant || m.variant || '?'}`">R{{ m.round || '?' }}/{{ (m.gameVariant || m.variant || '?').replace('G', '') }}</span>
            <span class="x">{{ m.text }}</span>
            <span class="room">{{ (m.roomId || '').slice(0,8) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import AnimatedNumber from './AnimatedNumber.vue';
import { colyseusService } from '../../services/colyseus';

interface PlayerView {
  sessionId?: string;
  name: string;
  role: 'P1' | 'P2' | '';
  pavoTokens: number;
  eloteTokens: number;
  shameTokens?: number;
}

const props = defineProps<{ player: PlayerView & { color?: string; uuid?: string }; highlight?: boolean }>();
const highlight = computed(() => !!props.highlight);
const hasShame = computed(() => (props.player.shameTokens || 0) > 0);

const scoreAsP1 = computed(() => (props.player.pavoTokens || 0) * 1 + (props.player.eloteTokens || 0) * 2);
const scoreAsP2 = computed(() => (props.player.eloteTokens || 0) * 1 + (props.player.pavoTokens || 0) * 2);
const displayScore = computed(() => props.player.role === 'P2' ? scoreAsP2.value : scoreAsP1.value);
const primary = computed(() => props.player.color || '#667eea');

// History state
const showHistory = ref(false);
const loadingHistory = ref(false);
const historyItems = ref<any[]>([]);
const onlyEventsMade = ref(false);
const filteredHistory = computed(() => {
  if (!onlyEventsMade.value) return historyItems.value || [];
  const list = Array.isArray(historyItems.value) ? historyItems.value : [];
  return list.filter((h: any) => {
    const kind = (h?.kind || '').toString();
    if (!kind) return false;
    const prefix = kind.slice(0,3).toLowerCase();
    if (prefix === 'p1_') return ((h?.role || '').toUpperCase() === 'P1');
    if (prefix === 'p2_') return ((h?.role || '').toUpperCase() === 'P2');
    return true; // system/agnostic events
  });
});
const room = computed(() => colyseusService.gameRoom.value as any);

function toggleHistory() {
  if (!showHistory.value) {
    fetchHistory();
  }
  showHistory.value = !showHistory.value;
}

function fetchHistory() {
  const r = room.value;
  loadingHistory.value = true;
  if (r) {
    try { r.send('getSystemHistory', props.player.sessionId || ''); } catch { loadingHistory.value = false; }
  } else {
    // Fallback in lobby: fetch by UUID via admin API
    const uuid = (props.player as any)?.uuid || '';
    const base = (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
    if (!uuid) { loadingHistory.value = false; historyItems.value = []; return; }
    fetch(`${base}/players/${uuid}/history`).then(r => r.json()).then((data) => {
      historyItems.value = Array.isArray(data?.history) ? data.history : [];
      loadingHistory.value = false;
    }).catch(() => { loadingHistory.value = false; historyItems.value = []; });
  }
}

function onSystemHistory(payload: any) {
  if (!payload || payload.for !== (props.player.sessionId || '')) return;
  try {
    historyItems.value = Array.isArray(payload.history) ? payload.history : [];
  } finally {
    loadingHistory.value = false;
  }
}

function fmtTime(ts: number): string {
  try { return new Date(Number(ts)).toLocaleTimeString(); } catch { return ''; }
}

onMounted(() => {
  const r = room.value;
  if (r) r.onMessage('systemHistory', onSystemHistory);
});

onBeforeUnmount(() => {
  // No explicit off(); guard inside handler
});

// Close on Escape and lock scroll while modal open
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showHistory.value) {
    e.stopPropagation();
    showHistory.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});

function friendlyKind(kind: string): string {
  const k = (kind || '').toString();
  const map: Record<string, string> = {
    p1_propose: 'Ofrecer',
    p1_no_offer: 'No Ofrecer',
    p2_snatch: 'Robar',
    p2_accept: 'Aceptar Oferta',
    p2_force: 'Forzar Oferta',
    p2_no_force: 'No Forzar Oferta',
    p2_reject: 'Rechazar Oferta',
    p1_shame: 'Asignar Vergüenza',
    p1_no_shame: 'No Asignar Vergüenza',
    p1_report: 'Denunciar',
    p1_no_report: 'No Denunciar',
  };
  return map[k] || k;
}
</script>

<style scoped>
.player-card { position:relative; background:#fff; border-radius:12px; padding:12px; border:1px solid #eee; box-shadow:0 10px 24px rgba(0,0,0,0.08); }
.player-card.current-player { outline: 0.5px solid b; box-shadow:0 1px 7px  var(--primary); }
.player-card.shamed { border-color:#fca5a5; box-shadow: 0 6px 24px rgba(239,68,68,0.25); background: linear-gradient(180deg, #fff 0%, #fff5f5 100%); }
.player-card.shamed::after { content:""; position:absolute; inset:-2px; border-radius:14px; pointer-events:none; box-shadow: 0 0 0 2px rgba(239,68,68,0.25) inset; }
.player-card.shamed { animation: shamePulse 1.6s ease-in-out 2; }
@keyframes shamePulse { 0%{ transform:scale(1); } 50%{ transform:scale(1.01); } 100%{ transform:scale(1); } }
.header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.name { font-weight: 700; color:#333; }
.role { font-size:12px; padding:2px 8px; border-radius:10px; background:#f0f0f0; color:#555; }
.role.P1 { background: color-mix(in srgb, var(--primary) 15%, white); color: var(--primary); }
.role.P2 { background: color-mix(in srgb, var(--primary) 15%, white); color: var(--primary); }
.name.clickable { cursor: pointer; }
.name.clickable:hover { text-decoration: underline; text-underline-offset: 2px; }
.history-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index: 1500; }
.history-modal { width: min(900px, 94vw); background:#fff; border-radius:12px; border:1px solid #e5e9f0; box-shadow: 0 30px 80px rgba(0,0,0,0.45); }
.history-modal-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #e5e9f0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; border-top-left-radius:12px; border-top-right-radius:12px; }
.history-modal-header .title { font-weight:800; font-size:14px; }
.history-modal-header .header-actions { display:flex; align-items:center; gap:8px; }
.btn-filter { background:#eef2ff; color:#3949ab; border:1px solid #c7d2fe; border-radius:8px; padding:6px 10px; font-weight:700; cursor:pointer; }
.btn-filter.active { background:#3949ab; color:#fff; border-color:#2e3f9a; }
.close-history { background:#fff; color:#3949ab; border:1px solid #c7d2fe; border-radius:8px; padding:6px 10px; font-weight:700; cursor:pointer; }
.history-loading, .history-empty { font-size:12px; color:#666; padding:6px; text-align:center; }
.history-table {}
.history-scroll { max-height: 60vh; overflow:auto; border:1px solid #e5e9f0; border-radius:8px; background:#fff; margin: 10px; }
.history-grid { display:grid; grid-template-columns: 82px 36px 160px 110px 65px 2fr 70px; gap:6px; align-items:center; }
.history-header { position: sticky; top: 0; z-index: 1; background:#667eea; border-bottom:1px solid #e5e9f0; padding:6px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.history-header .th { font-size:11px; font-weight:800; color:#ffffff; text-transform: uppercase; }
.history-row { padding:6px; border-bottom:1px solid #f1f5f9; }
.history-row:last-child { border-bottom: none; }
.history-row .t { font-family: monospace; font-size:11px; color:#666; }
.history-row .r { font-size:11px; font-weight:700; color:#555; text-transform: uppercase; }
.history-row .tok { font-size:12px; color:#334155; }
.history-row .k { font-size:12px; font-weight:700; color:#334155; }
.history-row .rnd { font-size:11px; font-weight:600; color:#667eea; font-family: monospace; }
.history-row .x { font-size:12px; color:#475569; }
.history-row .room { font-family: monospace; font-size:11px; color:#777; text-align:right; }
.shame-badge { margin-left:8px; margin-right:0; background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:999px; padding:2px 8px; font-weight:800; font-size:12px; display:flex; align-items:center; gap:6px; }
.tokens { display:flex; gap:10px; margin:8px 0; }
.pill { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:#f7f7f7; border:1px solid #eee; }
.pill.subtle { background:#fafafa; color:#666; }
.shame-pill { background:#fee2e2; color:#b91c1c; border-color:#fecaca; }
.icon { font-size: 16px; }
.val { font-weight: 600; color:#333; display:inline-block; min-width: 1ch; }
.score { display:flex; align-items:center; justify-content:space-between; margin-top:6px; padding:8px; border-radius:10px; background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, white) 0%, #ffffff 100%); border:1px solid color-mix(in srgb, var(--primary) 30%, #e6e9ff); }
.score .label { font-size:12px; color: var(--primary); font-weight:700; }
.score .value { font-size:18px; font-weight:800; color: var(--primary); display:flex; align-items:center; height: 1.2em; line-height: 1.2em; }

/* Emphasis on shame token appear */
.pop-enter-from { opacity: 0; transform: scale(0.9); }
.pop-enter-to { opacity: 1; transform: scale(1); }
.pop-enter-active { transition: all 0.2s ease; }
</style>
