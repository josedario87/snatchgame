<template>
  <div class="game">
    <GameEndModal
      :visible="endModalVisible"
      :final-scores="finalScores"
      :variants="variants"
      :current-variant="currentVariant"
      :round="modalRound !== null ? modalRound : currentRound"
      :total-rounds="3"
      @dismiss="dismissEndModal"
      @next-variant="changeToNextVariant"
      @previous-variant="changeToPreviousVariant"
      @restart-variant="restartCurrentVariant"
    />
    <div class="game-container">
      <div class="game-header">
        <h1 @click="onTitleClick" :title="titleUnlockTitle">💼 Sala de negocios</h1>
        <div class="meta">
          <div>Sala: <code>{{ roomId }}</code></div>
          <div>Ronda: {{ currentRound }}/3</div>
          <div>Estado: <span class="badge">{{ gameStatusDisplay }}</span></div>
        </div>
        <div class="variant-selector">
          <button
            v-for="g in variants"
            :key="g"
            @click="setVariant(g)"
            :disabled="!adminUnlockedHeader"
            :title="adminUnlockedHeader ? 'Cambiar variante' : 'Bloqueado — haz 5 clics en el título'"
            :class="['btn', 'btn-variant', { active: currentVariant === g }]"
          >
            {{ g }}
          </button>
        </div>
      </div>

      <div class="players-section">
        <PlayerStats v-for="p in players" :key="p.sessionId" :player="p" :highlight="p.sessionId === sessionId" />
      </div>

      <div v-if="gameStatus === 'waiting'" class="waiting-area">
        <div class="waiting-message">
          <div class="spinner"></div>
          <h2>Esperando oponente...</h2>
          <p>Jugadores en la sala: {{ players.length }}/2</p>
        </div>
      </div>

      <div v-else class="gameplay">
        <component :is="currentComponent"
                   :state="roundState"
                   :my-role="myRole"
                   :players="players"
                   @p2Force="onP2Force"
                   @p1Action="onP1Action"
                   @p2Action="onP2Action"
                   @report="onReport"
                   @assignShame="onAssignShame"
                   @proposeOffer="onProposeOffer"
        />

        <div class="outcome" v-if="outcomeP1 || outcomeP2">
          <div class="outcome-box">
            <div>Resultado J1: <strong>{{ outcomeP1 }}</strong></div>
            <div>Resultado J2: <strong>{{ outcomeP2 }}</strong></div>
          </div>
        </div>
      </div>

      <ChatWidget />

      <div class="game-footer">
        <button @click="leaveGame" class="btn btn-leave">Salir del Juego</button>
        <AppCredits variant="inline" :default-collapsed="true" />
      </div>
    </div>


    <!-- Pause overlay to block all interactions -->
    <div v-if="gameStatus === 'paused'" class="pause-overlay">
      <div class="pause-box">
        <div class="icon">⏸️</div>
        <div class="title">Juego en pausa</div>
        <div class="hint">Esperando a que ambos jugadores estén conectados…</div>
        <div class="actions">
          <button class="btn btn-leave" @click="leaveGame">Salir del Juego</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { colyseusService } from '../services/colyseus';
import { getStateCallbacks } from 'colyseus.js';
import AppCredits from '../components/AppCredits.vue';

import G1 from './games/G1.vue';
import G2 from './games/G2.vue';
import G3 from './games/G3.vue';
import G4 from './games/G4.vue';
import G5 from './games/G5.vue';
import PlayerStats from './games/PlayerStats.vue';
import ChatWidget from './games/ChatWidget.vue';
import GameEndModal from './games/GameEndModal.vue';

const router = useRouter();
const route = useRoute();
const routeUuid = computed(() => (route.params as any)?.uuid as string || '');

const players = ref<any[]>([]);
const gameStatus = ref('waiting');
const roomId = ref('');
const currentVariant = ref<'G1'|'G2'|'G3'|'G4'|'G5'>('G1');
const currentRound = ref(1);
const p1Action = ref('');
const p2Action = ref('');
const forcedByP2 = ref(false);
const reported = ref(false);
const shameAssigned = ref(false);
const outcomeP1 = ref(0);
const outcomeP2 = ref(0);

const variants = ['G1','G2','G3','G4','G5'];

// Hidden admin unlock via 5-clicks on title
const adminUnlockedHeader = ref(false);
const headerClickCount = ref(0);
let headerClickResetTimer: any = null;
function onTitleClick() {
  if (headerClickResetTimer) { clearTimeout(headerClickResetTimer); headerClickResetTimer = null; }
  headerClickCount.value += 1;
  if (headerClickCount.value >= 5) {
    adminUnlockedHeader.value = true;
  } else {
    headerClickResetTimer = setTimeout(() => { headerClickCount.value = 0; }, 1200);
  }
}
const titleUnlockTitle = computed(() => adminUnlockedHeader.value ? 'Controles de variante desbloqueados' : `Clicks: ${headerClickCount.value}/5 para desbloquear`);

// End-of-game modal visibility
const endModalVisible = ref(false);
function showEndModal() { if (!endModalVisible.value) endModalVisible.value = true; }
function dismissEndModal() { endModalVisible.value = false; modalScoresOverride.value = null; modalRound.value = null; }

// Function to get next variant in sequence
function getNextVariant(): string {
  const currentIndex = variants.indexOf(currentVariant.value);
  const nextIndex = (currentIndex + 1) % variants.length;
  return variants[nextIndex];
}

// Function to get previous variant in sequence
function getPreviousVariant(): string {
  const currentIndex = variants.indexOf(currentVariant.value);
  const previousIndex = (currentIndex - 1 + variants.length) % variants.length;
  return variants[previousIndex];
}

// Function to change to next variant and dismiss modal
function changeToNextVariant() {
  const nextVariant = getNextVariant();
  setVariant(nextVariant);
  dismissEndModal();
}

// Function to change to previous variant and dismiss modal
function changeToPreviousVariant() {
  const previousVariant = getPreviousVariant();
  setVariant(previousVariant);
  dismissEndModal();
}

// Function to restart the same variant and dismiss modal
function restartCurrentVariant() {
  setVariant(currentVariant.value);
  dismissEndModal();
}

// Modal score override for round-end summaries from server
const modalScoresOverride = ref<any[] | null>(null);
const modalRound = ref<number | null>(null);

const finalScores = computed(() => {
  // If server sent a round summary, use that to keep values even if tokens reset
  if (modalScoresOverride.value && Array.isArray(modalScoresOverride.value)) {
    return modalScoresOverride.value;
  }
  // Fallback: compute from current player tokens
  return players.value
    .map(p => {
      const points = (p.role === 'P2')
        ? (p.eloteTokens || 0) * 1 + (p.pavoTokens || 0) * 2
        : (p.pavoTokens || 0) * 1 + (p.eloteTokens || 0) * 2;
      return {
        sessionId: p.sessionId,
        name: p.name,
        role: p.role,
        pavo: p.pavoTokens || 0,
        elote: p.eloteTokens || 0,
        points,
        color: p.color
      };
    })
    .sort((a, b) => b.points - a.points);
});

// Round transition banner state and helper
const roundBanner = ref<{ visible: boolean; text: string; kind: 'start'|'end' }>({ visible: false, text: '', kind: 'start' });
let roundBannerTimeout: any = null;

function showRoundBanner(text: string, kind: 'start'|'end', ms = 1400) {
  if (roundBannerTimeout) { clearTimeout(roundBannerTimeout); roundBannerTimeout = null; }
  roundBanner.value = { visible: true, text, kind };
  roundBannerTimeout = setTimeout(() => { roundBanner.value.visible = false; }, ms);
}

// Marcar como utilizada para evitar error TS
showRoundBanner;

const sessionId = computed(() => colyseusService.sessionId.value);
const myRole = computed(() => {
  const me = players.value.find(p => p.sessionId === sessionId.value);
  return me?.role || '';
});

// Traducir el estado del juego al español
const gameStatusDisplay = computed(() => {
  const statusMap: Record<string, string> = {
    'waiting': 'Esperando',
    'playing': 'Jugando',
    'paused': 'Pausado',
    'finished': 'Finalizado',
    'ready': 'Listo'
  };
  return statusMap[gameStatus.value.toLowerCase()] || gameStatus.value;
});

  const roundState = computed(() => ({
    // tick to recompute when non-ref state fields change via forceUpdate()
    _tick: refreshTick.value,
    isFinished: (gameStatus.value || '').toLowerCase() === 'finished',
    currentVariant: currentVariant.value,
    currentRound: currentRound.value,
    p1Action: p1Action.value,
    p2Action: p2Action.value,
    forcedByP2: forcedByP2.value,
    g2ForcePending: roomOffer('g2ForcePending'),
    reported: reported.value,
    shameAssigned: shameAssigned.value,
    offer: {
      offerPavo: roomOffer('offerPavo'),
      offerElote: roomOffer('offerElote'),
      requestPavo: roomOffer('requestPavo'),
      requestElote: roomOffer('requestElote'),
      active: roomOffer('offerActive')
    }
  }));

const componentMap: Record<string, any> = { G1, G2, G3, G4, G5 };
const currentComponent = computed(() => componentMap[currentVariant.value]);

onMounted(() => {
  // Reset header unlock state on mount
  adminUnlockedHeader.value = false;
  headerClickCount.value = 0;
  if (headerClickResetTimer) { clearTimeout(headerClickResetTimer); headerClickResetTimer = null; }

  let room = colyseusService.gameRoom.value;
  if (!room) {
    router.push(`/${routeUuid.value}`);
    return;
  }

  setupRoom(room);

  function setupRoom(room: any) {
  const $ = getStateCallbacks(room);

  room.onStateChange.once((state: any) => {
    gameStatus.value = state.gameStatus || 'waiting';
  });

  $(room.state).listen("gameStatus", (value: string) => { 
    gameStatus.value = value; 
    if ((value || '').toLowerCase() === 'finished') {
      showEndModal();
    }
  });
  $(room.state).listen("roomId", (value: string) => { roomId.value = value; });
  $(room.state).listen("currentVariant", (value: string) => { currentVariant.value = value as any; });
  $(room.state).listen("currentRound", (value: number) => { currentRound.value = value; });
  $(room.state).listen("p1Action", (value: string) => { p1Action.value = value; });
  $(room.state).listen("p2Action", (value: string) => { p2Action.value = value; });
  $(room.state).listen("forcedByP2", (value: boolean) => { forcedByP2.value = value; });
  $(room.state).listen("g2ForcePending", () => forceUpdate());
  $(room.state).listen("reported", (value: boolean) => { reported.value = value; });
  $(room.state).listen("shameAssigned", (value: boolean) => { shameAssigned.value = value; });
  // Offer fields
  $(room.state).listen("offerPavo", () => forceUpdate());
  $(room.state).listen("offerElote", () => forceUpdate());
  $(room.state).listen("requestPavo", () => forceUpdate());
  $(room.state).listen("requestElote", () => forceUpdate());
  $(room.state).listen("offerActive", () => forceUpdate());

  $(room.state).players.onAdd((player: any, key: string) => {
    const idx = players.value.findIndex(p => p.sessionId === key);
    if (idx === -1) {
      players.value.push({
        sessionId: key,
        name: player.name,
        role: player.role,
        pavoTokens: player.pavoTokens,
        eloteTokens: player.eloteTokens,
        shameTokens: player.shameTokens,
        color: player.color,
      });
    }
    $(player).listen("role", (v: string) => { const p = players.value.find(x => x.sessionId === key); if (p) p.role = v; });
    $(player).listen("pavoTokens", (v: number) => { const p = players.value.find(x => x.sessionId === key); if (p) p.pavoTokens = v; });
    $(player).listen("eloteTokens", (v: number) => { const p = players.value.find(x => x.sessionId === key); if (p) p.eloteTokens = v; });
    $(player).listen("shameTokens", (v: number) => { const p = players.value.find(x => x.sessionId === key); if (p) p.shameTokens = v; });
    $(player).listen("color", (v: string) => { const p = players.value.find(x => x.sessionId === key); if (p) p.color = v; });
  });
  $(room.state).players.onRemove((_: any, key: string) => {
    const i = players.value.findIndex(p => p.sessionId === key);
    if (i !== -1) players.value.splice(i, 1);
  });

  room.onMessage("playerInfo", (info: any) => {
    colyseusService.sessionId.value = info.sessionId;
    colyseusService.playerName.value = info.name;
  });

  room.onMessage("gameEnd", () => { modalRound.value = currentRound.value; showEndModal(); });
  room.onMessage("roundEnded", (payload: any) => {
    // Use the server-provided summary to render the modal between rounds
    if (payload && Array.isArray(payload.scores)) {
      modalScoresOverride.value = payload.scores;
    }
    if (payload && typeof payload.round === 'number') {
      modalRound.value = payload.round;
    } else {
      modalRound.value = currentRound.value;
    }
    showEndModal();
  });
  // Do not auto-dismiss on roundStarted; let the modal's timer or user close it

  // Register additional message handlers to avoid warnings
  room.onMessage("gamePaused", () => {
    // Game paused, could update UI state if needed
  });

  room.onMessage("gameRestart", () => {
    // Game restarted, could update UI state if needed
  });

  room.onMessage("variantChanged", (data: { variant: string }) => {
    currentVariant.value = data.variant as any;
    // Close end modal if it's open when variant changes
    if (endModalVisible.value) {
      dismissEndModal();
    }
  });

  // No round transition banners

  // Handle room closure/disconnection
  room.onLeave((code: number) => {
    console.log('[DemoGame] Room disconnected with code:', code);
    
    // Handle shuffle disconnection specially
    if (code === 1002) {
      console.log('[DemoGame] Disconnected for player shuffle - will redirect to lobby');
      try { 
        if (typeof window !== 'undefined') { 
          window.localStorage.removeItem('snatch.game.roomId'); 
          window.localStorage.removeItem('snatch.game.sessionId'); 
        } 
      } catch {}
      
      // Redirect to lobby and let it handle the shuffle redirect
      router.push(`/${routeUuid.value}`);
      return;
    }
    
    // Normal disconnection handling
    // Always clean up local storage when room closes
    // no-op for local storage cleanup
    
    // If not on lobby page, redirect there
    if (router.currentRoute.value.path !== `/${routeUuid.value}`) {
      console.log('[DemoGame] Room closed, redirecting to lobby');
      router.push(`/${routeUuid.value}`);
    }
  });

  room.onError((code: number, message: any) => {
    console.error('[DemoGame] Room error:', code, message);
    // On error, redirect to lobby
    router.push(`/${routeUuid.value}`);
  });
  }
});

function roomOffer<K extends string>(key: K): any {
  const room = colyseusService.gameRoom.value as any;
  return room?.state?.[key as any];
}

const refreshTick = ref(0);
function forceUpdate() { refreshTick.value++; }

function setVariant(g: string) { colyseusService.setVariant(g); }
function onP2Force(force: boolean) { colyseusService.p2Force(force); }
function onP1Action(_action: 'no_offer') { colyseusService.noOffer(); }
function onProposeOffer(payload: { offerPavo:number; offerElote:number; requestPavo:number; requestElote:number; }) { colyseusService.proposeOffer(payload.offerPavo, payload.offerElote, payload.requestPavo, payload.requestElote); }
function onP2Action(action: 'accept'|'reject'|'snatch') { colyseusService.p2Action(action); }
function onReport(val: boolean) { colyseusService.report(val); }
function onAssignShame(val: boolean) { colyseusService.assignShame(val); }

async function leaveGame() { 
  // Ask for confirmation before closing the room for both players
  if (!confirm('¿Cerrar la sala para ambos jugadores? Esto terminará el juego inmediatamente.')) {
    return;
  }
  
  console.log('[DemoGame] User closing room for both players');
  
  try {
    // Close the room for both players using the admin API
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/rooms/${roomId.value}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      console.error('Failed to close room via API');
      // Fallback to normal leave if API fails
      colyseusService.leaveGame();
    } else {
      console.log(`Room ${roomId.value} closed successfully for both players`);
      // Just leave locally, the server will handle disconnecting both players
      if (colyseusService.gameRoom.value) {
        colyseusService.gameRoom.value.leave();
      }
    }
  } catch (error) {
    console.error('Error closing room:', error);
    // Fallback to normal leave if error occurs
    colyseusService.leaveGame();
  }
  
  // Navigate back to lobby
  router.push(`/${routeUuid.value}`);
}
</script>

<style scoped>
.game { min-height: calc(var(--app-vh, 1vh) * 100); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display:flex; align-items:center; justify-content:center; padding:20px; }
.game-container { background: white; border-radius: 20px; padding: 24px; max-width: 1000px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin-bottom: 50px; }
.game-footer { display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }
.game-footer .app-credits.inline { width: auto; flex: 0 0 auto; }
.game-footer .app-credits.inline.is-collapsed .credits-card { white-space: nowrap; }
.game-footer .app-credits.inline.is-expanded { flex: 1 1 100%; width: 100%; }
.game-footer .btn-leave { order: 1; }
.game-footer .app-credits.inline.is-collapsed { margin-left: auto; order: 1; }
.game-footer .app-credits.inline.is-expanded { flex: 1 1 100%; order: 2; }
.game-header { display:flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.game-header h1 { margin: 0; font-size: 20px; }
.meta { display:flex; gap: 16px; font-size: 14px; }
.badge { background:#e3f2fd; color:#2196f3; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.variant-selector { display:flex; gap: 8px; flex-wrap: wrap; }
.btn { padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; }
.btn-variant { background: #f2f2f2; }
.btn-variant.active { background: #667eea; color: white; }
.btn-variant:disabled { opacity: 0.55; cursor: default; filter: grayscale(0.2) brightness(0.98); box-shadow: none; }
.btn-next { background:#2196f3; color:white; margin-top: 12px; }
.btn-leave { background:#f44336; color:white; }
.players-section { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 12px 0; }
.player-card { padding: 12px; background:#f8f9fa; border-radius: 10px; }
.player-role { color:#666; margin-top: 4px; }
.player-tokens { display:flex; gap: 12px; margin-top: 8px; }
.waiting-area { text-align:center; padding: 24px 0; }
.spinner { width:40px; height:40px; border: 4px solid #eee; border-top:4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px; }
@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
.outcome-box { display:flex; gap: 24px; background:#f5f5f5; padding: 12px; border-radius: 8px; }

/* Full-screen overlay while paused */
.pause-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index: 1000; }
.pause-box { background: white; color:#333; border-radius: 16px; padding: 24px 32px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.pause-box .icon { font-size: 48px; margin-bottom: 8px; }
.pause-box .title { font-weight: 800; font-size: 20px; }
.pause-box .hint { margin-top: 6px; color:#666; font-size: 14px; }
.pause-box .actions { margin-top: 16px; }
</style>
