<template>
  <div v-if="visible" class="end-modal-overlay" @click.self="onDismiss">
    <div class="end-modal">
      <button class="close-btn" @click="onDismiss" aria-label="Cerrar">×</button>
      <div class="title">
        <template v-if="isFinal">🏁 Juego finalizado</template>
        <template v-else>Resultados Ronda {{ round }} de {{ totalRounds }}</template>
      </div>

      <div class="scores">
        <div
          v-for="s in finalScores"
          :key="s.sessionId"
          class="score-row"
          :style="({ '--primary': s.color || '#667eea' }) as any"
        >
          <div class="left">
            <span class="color-dot" :style="{ background: s.color || '#667eea' }"></span>
            <span class="name">{{ s.name }}</span>
            <span v-if="s.role" class="role" :class="s.role">{{ s.role }}</span>
          </div>
          <div class="right">
            <span class="tokens">🦃 {{ s.pavo }} · 🌽 {{ s.elote }}</span>
            <span class="points">{{ s.points }}</span>
          </div>
        </div>
      </div>

      <template v-if="isFinal">
        <div class="modal-actions">
          <button @click="onControlAttempt('prev')" class="btn btn-prev-variant" :class="{ locked: !adminUnlocked }" :aria-disabled="!adminUnlocked">Anterior</button>
          <button @click="onControlAttempt('restart')" class="btn btn-restart-variant" :class="{ locked: !adminUnlocked }" :aria-disabled="!adminUnlocked">Repetir</button>
          <button @click="onControlAttempt('next')" class="btn btn-next-variant" :class="{ locked: !adminUnlocked }" :aria-disabled="!adminUnlocked">Siguiente</button>
        </div>
        <div v-if="!adminUnlocked && showHint" class="round-info">Controles bloqueados — clics: {{ clickCount }}/5 para habilitarlos</div>
        <div v-else-if="adminUnlocked" class="round-info">Controles habilitados</div>
      </template>

      <div v-if="!isFinal" class="hint">Se cerrará en {{ remainingSeconds }}s</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

interface Score {
  sessionId: string;
  name: string;
  role?: 'P1' | 'P2' | '';
  pavo: number;
  elote: number;
  points: number;
  color?: string;
}

const props = defineProps<{
  visible: boolean;
  finalScores: Score[];
  variants: string[];
  currentVariant: string;
  round?: number;
  totalRounds?: number;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'next-variant'): void;
  (e: 'previous-variant'): void;
  (e: 'restart-variant'): void;
}>();

const remainingSeconds = ref(20);
let intervalId: any = null;
let timeoutId: any = null;

function startTimer() {
  stopTimer();
  remainingSeconds.value = 20;
  intervalId = setInterval(() => {
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
  }, 1000);
  timeoutId = setTimeout(() => {
    onDismiss();
  }, 20000);
}

function stopTimer() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
}

// (moved below isFinal definition)

onBeforeUnmount(() => { stopTimer(); });

const totalRounds = computed(() => Math.max(1, Number(props.totalRounds || 3)));
const round = computed(() => Math.max(1, Number(props.round || 1)));
const isFinal = computed(() => round.value >= totalRounds.value);

// Auto-cierre solo cuando no es final
watch([() => props.visible, () => isFinal.value], ([vis, final]) => {
  if (vis && !final) startTimer();
  else stopTimer();
}, { immediate: true });

// Hidden admin unlock via 5 rapid clicks on the control buttons
const adminUnlocked = ref(false);
const clickCount = ref(0);
const showHint = ref(false);
let clickResetTimer: any = null;

function onControlAttempt(kind: 'prev'|'next'|'restart') {
  if (adminUnlocked.value) {
    if (kind === 'prev') onPrev();
    else if (kind === 'next') onNext();
    else onRestart();
    return;
  }
  // Locked: count clicks and show hint
  showHint.value = true;
  if (clickResetTimer) { clearTimeout(clickResetTimer); clickResetTimer = null; }
  clickCount.value += 1;
  if (clickCount.value >= 5) {
    adminUnlocked.value = true;
    // Perform the action that was attempted on the unlocking click
    if (kind === 'prev') onPrev();
    else if (kind === 'next') onNext();
    else onRestart();
  } else {
    // Small window to keep clicks consecutivos
    clickResetTimer = setTimeout(() => { clickCount.value = 0; showHint.value = false; }, 1200);
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    adminUnlocked.value = false;
    clickCount.value = 0;
    showHint.value = false;
    if (clickResetTimer) { clearTimeout(clickResetTimer); clickResetTimer = null; }
  }
});


function onDismiss() { emit('dismiss'); }
function onNext() { emit('next-variant'); }
function onPrev() { emit('previous-variant'); }
function onRestart() { emit('restart-variant'); }
</script>

<style scoped>
.end-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.40); display:flex; align-items:center; justify-content:center; z-index: 1200; }
.end-modal { 
  position: relative; 
  color:#111; 
  border-radius: 16px; 
  padding: 24px 24px 18px; 
  width: min(520px, 92vw); 
  /* Glassmorphism mejorado: más blanco pero transparente */
  background: rgba(255, 255, 255, 0.784);
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 16px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
}
.end-modal .close-btn { position:absolute; top:8px; right:8px; width:32px; height:32px; border-radius: 8px; border:1px solid #e5e7eb; background:#f8fafc; color:#111; font-weight:800; cursor:pointer; }
.end-modal .close-btn:hover { background:#eef2ff; }
.end-modal .title { font-size: 20px; font-weight: 900; margin-bottom: 8px; }
.end-modal .scores { display:flex; flex-direction:column; gap:8px; margin: 8px 0 12px; }
.end-modal .score-row { 
  display:flex; align-items:center; justify-content:space-between; gap:8px; 
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 6%, white) 0%, #ffffff 100%);
  border:1px solid color-mix(in srgb, var(--primary) 20%, #e6e9ff);
  border-left: 4px solid var(--primary);
  border-radius: 10px; padding:8px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.end-modal .score-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
}
.end-modal .score-row .left { display:flex; align-items:center; gap:8px; }
.end-modal .score-row .right { display:flex; align-items:center; gap:20px; }
.end-modal .score-row .tokens { margin-right: 12px; }
.end-modal .score-row .color-dot { width:10px; height:10px; border-radius:50%; box-shadow: 0 0 0 2px #fff inset; }
.end-modal .score-row .name { font-weight:800; color:#1f2937; }
.end-modal .score-row .tokens { font-weight:700; color:#374151; }
.end-modal .score-row .points { font-weight:900; color: var(--primary); }
.end-modal .score-row .role { font-size:12px; padding:2px 8px; border-radius:10px; background:#f0f0f0; color:#555; }
.end-modal .score-row .role.P1,
.end-modal .score-row .role.P2 { background: color-mix(in srgb, var(--primary) 15%, white); color: var(--primary); }
.end-modal .modal-actions { margin: 12px 0 8px; display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap; }

/* Glassy compact buttons, aligned with home style */
.end-modal .btn { 
  appearance: none;
  background: linear-gradient(135deg, rgba(102,126,234,0.24) 0%, rgba(118,75,162,0.24) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.55);
  color: #243147;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 6px 18px rgba(102,126,234,0.12);
  min-width: 72px;
  -webkit-tap-highlight-color: transparent;
}
.end-modal .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(118,75,162,0.16); }
.end-modal .btn:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.end-modal .btn:focus, .end-modal .btn:focus-visible { outline: none; }
.end-modal .hint { font-size: 12px; color:#6b7280; text-align:right; }
.round-info { margin: 10px 2px 2px; font-size: 13px; font-weight:600; color:#334155; text-align:center; }
.round-info.clickable { cursor: pointer; user-select: none; }
.round-info.clickable:hover { filter: brightness(0.95); }
</style>
