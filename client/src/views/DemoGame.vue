<template>
  <div class="game">
    <div class="game-container">
      <div class="game-header">
        <h1>🧪 Demo Room</h1>
        <div class="meta">
          <div>Room: <code>{{ roomId }}</code></div>
          <div>Round: {{ currentRound }}/3</div>
          <div>Status: <span class="badge">{{ gameStatus }}</span></div>
        </div>
        <div class="variant-selector">
          <button v-for="g in variants" :key="g" @click="setVariant(g)" :class="['btn', 'btn-variant', { active: currentVariant === g }]">
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
          <h2>Waiting for opponent...</h2>
          <p>Players in room: {{ players.length }}/2</p>
        </div>
      </div>

      <div v-else class="gameplay">
        <component :is="currentComponent"
                   :state="roundState"
                   :my-role="myRole"
                   @p2Force="onP2Force"
                   @p1Action="onP1Action"
                   @p2Action="onP2Action"
                   @report="onReport"
                   @assignShame="onAssignShame"
                   @proposeOffer="onProposeOffer"
        />

        <div class="outcome" v-if="outcomeP1 || outcomeP2">
          <div class="outcome-box">
            <div>Outcome P1: <strong>{{ outcomeP1 }}</strong></div>
            <div>Outcome P2: <strong>{{ outcomeP2 }}</strong></div>
          </div>
        </div>
      </div>

      <ChatWidget />

      <div class="game-footer">
        <button @click="leaveGame" class="btn btn-leave">Leave Game</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { colyseusService } from '../services/colyseus';
import { getStateCallbacks } from 'colyseus.js';

import G1 from './games/G1.vue';
import G2 from './games/G2.vue';
import G3 from './games/G3.vue';
import G4 from './games/G4.vue';
import G5 from './games/G5.vue';
import PlayerStats from './games/PlayerStats.vue';
import ChatWidget from './games/ChatWidget.vue';

const router = useRouter();

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

const sessionId = computed(() => colyseusService.sessionId.value);
const myRole = computed(() => {
  const me = players.value.find(p => p.sessionId === sessionId.value);
  return me?.role || '';
});

  const roundState = computed(() => ({
    currentVariant: currentVariant.value,
    currentRound: currentRound.value,
    p1Action: p1Action.value,
    p2Action: p2Action.value,
    forcedByP2: forcedByP2.value,
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
  const room = colyseusService.gameRoom.value;
  if (!room) {
    router.push('/');
    return;
  }

  const $ = getStateCallbacks(room);

  room.onStateChange.once((state: any) => {
    gameStatus.value = state.gameStatus || 'waiting';
  });

  $(room.state).listen("gameStatus", (value: string) => { gameStatus.value = value; });
  $(room.state).listen("roomId", (value: string) => { roomId.value = value; });
  $(room.state).listen("currentVariant", (value: string) => { currentVariant.value = value as any; });
  $(room.state).listen("currentRound", (value: number) => { currentRound.value = value; });
  $(room.state).listen("p1Action", (value: string) => { p1Action.value = value; });
  $(room.state).listen("p2Action", (value: string) => { p2Action.value = value; });
  $(room.state).listen("forcedByP2", (value: boolean) => { forcedByP2.value = value; });
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
  $(room.state).players.onRemove((player: any, key: string) => {
    const i = players.value.findIndex(p => p.sessionId === key);
    if (i !== -1) players.value.splice(i, 1);
  });

  room.onMessage("playerInfo", (info: any) => {
    colyseusService.sessionId.value = info.sessionId;
    colyseusService.playerName.value = info.name;
  });
});

function roomOffer<K extends string>(key: K): any {
  const room = colyseusService.gameRoom.value as any;
  return room?.state?.[key as any];
}

const refreshTick = ref(0);
function forceUpdate() { refreshTick.value++; }

function setVariant(g: string) { colyseusService.setVariant(g); }
function onP2Force(force: boolean) { colyseusService.p2Force(force); }
function onP1Action(action: 'no_offer') { colyseusService.noOffer(); }
function onProposeOffer(payload: { offerPavo:number; offerElote:number; requestPavo:number; requestElote:number; }) { colyseusService.proposeOffer(payload.offerPavo, payload.offerElote, payload.requestPavo, payload.requestElote); }
function onP2Action(action: 'accept'|'reject'|'snatch') { colyseusService.p2Action(action); }
function onReport(val: boolean) { colyseusService.report(val); }
function onAssignShame(val: boolean) { colyseusService.assignShame(val); }

function leaveGame() { colyseusService.leaveGame();
  router.push('/'); }
</script>

<style scoped>
.game { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display:flex; align-items:center; justify-content:center; padding:20px; }
.game-container { background: white; border-radius: 20px; padding: 24px; max-width: 1000px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.game-header { display:flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.game-header h1 { margin: 0; font-size: 20px; }
.meta { display:flex; gap: 16px; font-size: 14px; }
.badge { background:#e3f2fd; color:#2196f3; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.variant-selector { display:flex; gap: 8px; }
.btn { padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; }
.btn-variant { background: #f2f2f2; }
.btn-variant.active { background: #667eea; color: white; }
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
</style>
