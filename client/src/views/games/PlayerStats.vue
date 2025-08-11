<template>
  <div class="player-card" :class="{ 'current-player': highlight }" :style="{ '--primary': primary } as any">
    <div class="header">
      <div class="name">{{ player.name || '—' }}</div>
      <div class="role" :class="player.role">{{ player.role || '—' }}</div>
    </div>
    <div class="tokens">
      <div class="token pill">
        <span class="icon">🦃</span>
        <span class="val"><AnimatedNumber :value="player.pavoTokens ?? 0" /></span>
      </div>
      <div class="token pill">
        <span class="icon">🌽</span>
        <span class="val"><AnimatedNumber :value="player.eloteTokens ?? 0" /></span>
      </div>
      <Transition name="pop">
        <div v-if="(player.shameTokens ?? 0) > 0" class="token pill subtle shame-pill">
          <span class="icon">😶</span>
          <span class="val"><AnimatedNumber :value="player.shameTokens ?? 0" :pulseOnFirst="true" /></span>
        </div>
      </Transition>
    </div>
    <div class="score">
      <span class="label">Puntuación</span>
      <span class="value"><AnimatedNumber :value="displayScore" /></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedNumber from './AnimatedNumber.vue';

interface PlayerView {
  sessionId?: string;
  name: string;
  role: 'P1' | 'P2' | '';
  pavoTokens: number;
  eloteTokens: number;
  shameTokens?: number;
}

const props = defineProps<{ player: PlayerView & { color?: string }; highlight?: boolean }>();
const highlight = computed(() => !!props.highlight);

const scoreAsP1 = computed(() => (props.player.pavoTokens || 0) * 1 + (props.player.eloteTokens || 0) * 2);
const scoreAsP2 = computed(() => (props.player.eloteTokens || 0) * 1 + (props.player.pavoTokens || 0) * 2);
const displayScore = computed(() => props.player.role === 'P2' ? scoreAsP2.value : scoreAsP1.value);
const primary = computed(() => props.player.color || '#667eea');
</script>

<style scoped>
.player-card { background:#fff; border-radius:12px; padding:12px; border:1px solid #eee; box-shadow:0 10px 24px rgba(0,0,0,0.08); }
.player-card.current-player { outline: 0.5px solid b; box-shadow:0 1px 7px  var(--primary); }
.header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.name { font-weight: 700; color:#333; }
.role { font-size:12px; padding:2px 8px; border-radius:10px; background:#f0f0f0; color:#555; }
.role.P1 { background: color-mix(in srgb, var(--primary) 15%, white); color: var(--primary); }
.role.P2 { background: color-mix(in srgb, var(--primary) 15%, white); color: var(--primary); }
.tokens { display:flex; gap:10px; margin:8px 0; }
.pill { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:#f7f7f7; border:1px solid #eee; }
.pill.subtle { background:#fafafa; color:#666; }
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
