<template>
  <!-- Loading state as a single card -->
  <div v-if="loading" class="card glass">
    <div class="card-header">
      <h2 class="card-title">Eventos y comparación</h2>
    </div>
    <div class="placeholder">Cargando datos…</div>
  </div>

  <!-- Single unified view with carousel: first slide shows all proportion bars; next slides are pies per group -->
  <div v-else class="card glass">
    <div class="card-header">
      <h2 class="card-title">Eventos y comparación</h2>
      <div v-if="filtersCollapsed && (activeFilters?.hasFilters || selectedPlayerUuid)" class="active-filters-summary">
        <span class="filter-tag" v-if="activeFilters?.dataSource !== 'aggregated'">
          {{ activeFilters?.dataSource === 'active-rooms' ? '🔴 Tiempo Real' : '📁 Agregado' }}
        </span>
        <span class="filter-tag" v-if="activeFilters?.round !== 'all'">
          Ronda {{ activeFilters?.round }}
        </span>
        <span class="filter-tag" v-if="activeFilters?.game !== 'all'">
          {{ activeFilters?.game }}
        </span>
        <span class="filter-tag player-tag" v-if="selectedPlayerUuid && activeFilters?.selectedPlayer">
          👤 {{ activeFilters.selectedPlayer }}
        </span>
        <span class="filter-tag room-tag" v-if="activeFilters?.selectedRoom">
          🏠 {{ activeFilters.selectedRoom }}
        </span>
      </div>
    </div>

    <div class="carousel-header">
      <button class="carousel-btn" @click="prevSlide()" :disabled="!hasPrevSlide">⟨</button>
      <div class="carousel-title">
        <span class="title">{{ slideTitle }}</span>
        <span class="slide-count">{{ currentSlide + 1 }} / {{ totalSlides }}</span>
      </div>
      <button class="carousel-btn" @click="nextSlide()" :disabled="!hasNextSlide">⟩</button>
    </div>

    <!-- Slide 0: All ratio bars together -->
    <div v-if="currentSlide === 0" class="ratio-cards">
      <div 
        v-for="group in ratioData" 
        :key="group.name"
        v-show="group.total > 0"
        class="card glass ratio-card"
        :class="{ highlight: highlighted === group.name }"
        @mouseenter="highlighted = group.name" 
        @mouseleave="highlighted = ''"
      >
        <div class="card-header">
          <h3 class="card-title">{{ group.name }}</h3>
          <span class="group-total">{{ group.total }}</span>
        </div>
        <div class="ratio-bar">
          <div 
            v-for="(action, actionIndex) in group.actions" 
            :key="action"
            class="ratio-segment"
            :style="{
              width: group.percentages[actionIndex] + '%',
              background: EVENT_STYLES[action]?.gradient || 'linear-gradient(90deg, #94a3b8, #64748b)'
            }"
          >
            <div 
              class="ratio-event-chip"
              v-if="group.percentages[actionIndex] > 5"
              :style="{
                background: getEventChipBg(action),
                borderColor: getEventBorderColor(action)
              }"
            >
              <span class="ratio-icon">{{ EVENT_STYLES[action]?.icon || '📊' }}</span>
              <span class="ratio-label">{{ group.labels[actionIndex] }}</span>
              <span class="ratio-count">{{ group.values[actionIndex] }} ({{ Math.round(group.percentages[actionIndex]) }}%)</span>
            </div>
          </div>
        </div>
      </div>
      <div class="hint small">
        {{ selectedPlayerUuid ? 'Proporciones del jugador seleccionado' : 'Proporciones globales' }}. 
        Los segmentos muestran la proporción relativa dentro de cada categoría.
      </div>
    </div>

    <!-- Slides 1..N: Pie per group -->
    <div v-else class="pie-wrapper">
      <div class="pie-canvas">
        <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" class="pie-svg">
          <defs>
            <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="rgba(0,0,0,0.15)" />
            </filter>
          </defs>
          <circle :cx="center" :cy="center" :r="outerR" class="pie-base" />
          <g filter="url(#pieShadow)">
            <transition-group name="pie-transition">
              <path v-for="(seg, i) in animatedPieSegments" 
                :key="`${seg.action}-${i}`"
                :d="describeArc(center, center, sliceR, seg.animatedStart, seg.animatedEnd)"
                :fill="EVENT_STYLES[seg.action]?.color || '#94a3b8'"
                class="pie-slice" />
            </transition-group>
          </g>
          <circle :cx="center" :cy="center" :r="innerR" class="pie-hole" />
          <g class="pie-center">
            <text v-if="currentPieSegments.length === 0" :x="center" :y="center - 4" text-anchor="middle" class="pie-center-title">Sin datos</text>
            <text v-else :x="center" :y="center - 4" text-anchor="middle" class="pie-center-title">{{ currentPie?.name || '' }}</text>
            <text v-if="currentPieSegments.length === 0" :x="center" :y="center + 16" text-anchor="middle" class="pie-center-sub">No hay eventos</text>
            <text v-else :x="center" :y="center + 16" text-anchor="middle" class="pie-center-sub">{{ selectedPlayerUuid ? 'Jugador' : 'Global' }}</text>
          </g>
        </svg>
      </div>
      <div class="pie-legend">
        <div 
          v-for="(action, idx) in currentPie?.actions || []" 
          :key="action"
          class="legend-chip"
          :style="getLegendChipStyle(action)"
        >
          <span class="legend-icon">{{ EVENT_STYLES[action]?.icon || '📊' }}</span>
          <span class="legend-label">{{ currentPie?.labels[idx] }}</span>
          <span class="legend-count">{{ (currentPie?.values[idx] || 0) }} ({{ round((currentPie?.percentages[idx] || 0)) }}%)</span>
        </div>
      </div>
      <div class="hint small">Usa el carrusel para navegar por las categorías.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue';

interface Props {
  filteredData?: {
    events: any[];
    players: any[];
    metrics: Record<string, number>;
    aggregatedCounts: Record<string, number>;
    sourceData: string;
  };
  selectedPlayerUuid?: string;
  // viewMode no longer used; kept for backward compat
  viewMode?: 'count' | 'percent' | 'ratio';
  loading?: boolean;
  filtersCollapsed?: boolean;
  activeFilters?: {
    dataSource: string;
    round: string;
    game: string;
    hasFilters: boolean;
    selectedPlayer?: string;
    selectedRoom?: string;
  };
}

const props = withDefaults(defineProps<Props>(), {
  selectedPlayerUuid: '',
  loading: false
});

// Carousel state: slide 0 = all ratio bars; slides 1..N = pies per group
const currentSlide = ref(0);

// Event types and styles
const EVENTS = [
  'p1_propose', 'p1_no_offer',
  'p2_snatch', 'p2_accept', 'p2_force', 'p2_no_force', 'p2_reject',
  'p1_shame', 'p1_no_shame', 'p1_report', 'p1_no_report'
];

const METRICS = [
  'players_seated', 'score_p1', 'score_p2', 'players_with_shame', 'players_without_shame'
];

const ALL_CHART_TYPES = [...EVENTS, ...METRICS];

const EVENT_STYLES: Record<string, { icon: string; color: string; gradient: string }> = {
  'p1_propose': { icon: '✨', color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  'p1_no_offer': { icon: '❌', color: '#6b7280', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' },
  'p2_accept': { icon: '✓', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  'p2_reject': { icon: '✕', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  'p2_snatch': { icon: '👹', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  'p2_force': { icon: '⚡', color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  'p2_no_force': { icon: '🚫', color: '#6b7280', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' },
  'p1_shame': { icon: '😶', color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' },
  'p1_no_shame': { icon: '🙂', color: '#6b7280', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' },
  'p1_report': { icon: '⚖️', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
  'p1_no_report': { icon: '🤝', color: '#6b7280', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' },
  'players_seated': { icon: '👥', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  'score_p1': { icon: '🦃', color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
  'score_p2': { icon: '🌽', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  'players_with_shame': { icon: '😶', color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
  'players_without_shame': { icon: '👥', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }
};

const highlighted = ref('');

// Main data computations
const eventTypes = computed(() => ALL_CHART_TYPES);

const globalEventCounts = computed(() => {
  if (!props.filteredData) return {};
  return {
    ...props.filteredData.aggregatedCounts,
    ...props.filteredData.metrics
  };
});

const playerEventCounts = computed(() => {
  if (!props.selectedPlayerUuid || !props.filteredData) return {};
  
  // Calculate player-specific counts from filtered events
  const playerCounts: Record<string, number> = {};
  EVENTS.forEach(eventType => {
    playerCounts[eventType] = props.filteredData!.events.filter(
      (e: any) => e.kind === eventType && e.playerUuid === props.selectedPlayerUuid
    ).length;
  });
  
  // Calculate player-specific metrics
  const selectedPlayer = props.filteredData.players.find((p: any) => p.uuid === props.selectedPlayerUuid);
  if (selectedPlayer) {
    let totalP1Scores = 0;
    let totalP2Scores = 0;
    let p1Count = 0;
    let p2Count = 0;
    let playersWithShame = selectedPlayer.shameTokens > 0 ? 1 : 0;
    
    if (selectedPlayer.roomScoreHistory) {
      selectedPlayer.roomScoreHistory.forEach((roomScore: any) => {
        roomScore.scores.forEach((score: any) => {
          if (score.role === 'P1') {
            totalP1Scores += score.score;
            p1Count++;
          } else if (score.role === 'P2') {
            totalP2Scores += score.score;
            p2Count++;
          }
        });
      });
    }
    
    playerCounts.players_seated = 1;
    playerCounts.score_p1 = p1Count > 0 ? Math.round((totalP1Scores / p1Count) * 10) / 10 : 0;
    playerCounts.score_p2 = p2Count > 0 ? Math.round((totalP2Scores / p2Count) * 10) / 10 : 0;
    playerCounts.players_with_shame = playersWithShame;
    playerCounts.players_without_shame = 1 - playersWithShame;
  }
  
  return playerCounts;
});

// Group totals computation
const groupTotals = computed(() => {
  const counts = globalEventCounts.value;
  return {
    offers: (counts.p1_propose || 0) + (counts.p1_no_offer || 0),
    responses: (counts.p2_accept || 0) + (counts.p2_reject || 0) + (counts.p2_snatch || 0),
    force: (counts.p2_force || 0) + (counts.p2_no_force || 0),
    shame: (counts.p1_shame || 0) + (counts.p1_no_shame || 0),
    report: (counts.p1_report || 0) + (counts.p1_no_report || 0),
    averageScore: calculateAverageScore(),
    totalPlayers: counts.players_seated || 0
  };
});

function calculateAverageScore(): number {
  if (!props.filteredData?.players.length) return 0;
  
  let totalScores = 0;
  let totalScoreCount = 0;
  
  props.filteredData.players.forEach((player: any) => {
    if (player.roomScoreHistory) {
      player.roomScoreHistory.forEach((roomScore: any) => {
        roomScore.scores.forEach((score: any) => {
          totalScores += score.score;
          totalScoreCount++;
        });
      });
    }
  });
  
  return totalScoreCount > 0 ? Math.round((totalScores / totalScoreCount) * 10) / 10 : 0;
}

// Define ratio groups for superposed view
const ratioGroups = computed(() => [
  {
    name: 'Ofertas',
    actions: ['p1_propose', 'p1_no_offer'],
    labels: ['Ofrecer', 'No Ofrecer'],
    total: groupTotals.value.offers
  },
  {
    name: 'Respuestas',
    actions: ['p2_accept', 'p2_reject', 'p2_snatch'],
    labels: ['Aceptar', 'Rechazar', 'Robar'],
    total: groupTotals.value.responses
  },
  {
    name: 'Forzar',
    actions: ['p2_force', 'p2_no_force'],
    labels: ['Forzar', 'No Forzar'],
    total: groupTotals.value.force
  },
  {
    name: 'Avergonzar',
    actions: ['p1_shame', 'p1_no_shame'],
    labels: ['Asignar', 'No Asignar'],
    total: groupTotals.value.shame
  },
  {
    name: 'Denunciar',
    actions: ['p1_report', 'p1_no_report'],
    labels: ['Denunciar', 'No Denunciar'],
    total: groupTotals.value.report
  },
  {
    name: 'Puntaje Promedio',
    actions: ['score_p1', 'score_p2'],
    labels: ['P1', 'P2'],
    total: groupTotals.value.averageScore.toFixed(1)
  },
  {
    name: 'Total Jugadores',
    actions: ['players_with_shame', 'players_without_shame'],
    labels: ['Con vergüenza', 'Sin vergüenza'],
    total: groupTotals.value.totalPlayers,
    isCustomRatio: true // Special handling needed
  }
]);

// Compute ratio data for each group
const ratioData = computed(() => {
  return ratioGroups.value.map(group => {
    const counts = props.selectedPlayerUuid 
      ? playerEventCounts.value 
      : globalEventCounts.value;
    
    let values = group.actions.map(action => counts[action] || 0);
    
    // Special handling for players ratio (shame vs no shame)
    if (group.isCustomRatio && group.name === 'Total Jugadores') {
      const playersWithShame = counts['players_with_shame'] || 0;
      const playersWithoutShame = counts['players_without_shame'] || 0;
      values = [playersWithShame, playersWithoutShame];
    }
    
    const total = values.reduce((sum, val) => sum + val, 0);
    
    return {
      ...group,
      values,
      total,
      percentages: total > 0 ? values.map(val => (val / total) * 100) : values.map(() => 0)
    };
  });
});

// Carousel + pies
const pieGroups = computed(() => ratioData.value.filter(g => (g.total as number) > 0));
const totalSlides = computed(() => 1 + pieGroups.value.length);
const hasPrevSlide = computed(() => currentSlide.value > 0);
const hasNextSlide = computed(() => currentSlide.value < totalSlides.value - 1);
function prevSlide() { if (hasPrevSlide.value) currentSlide.value--; }
function nextSlide() { if (hasNextSlide.value) currentSlide.value++; }
const currentPie = computed(() => pieGroups.value[currentSlide.value - 1]);
const slideTitle = computed(() => currentSlide.value === 0 ? 'Proporciones' : (currentPie.value?.name || ''));

// Convert group percentages into pie segments
const currentPieSegments = computed(() => {
  const segments: { startAngle: number; endAngle: number; action: string }[] = [];
  if (!currentPie.value) return segments;
  
  // Check if all values are 0
  const hasAnyValue = currentPie.value.values.some((v: number) => v > 0);
  
  if (!hasAnyValue) {
    // If all values are 0, return empty segments (will show "No hay datos" message)
    return segments;
  }
  
  // Filter out zero values for pie chart
  const nonZeroIndices: number[] = [];
  const nonZeroPercentages: number[] = [];
  
  currentPie.value.percentages.forEach((pct: number, idx: number) => {
    if (pct > 0) {
      nonZeroIndices.push(idx);
      nonZeroPercentages.push(pct);
    }
  });
  
  // If only one value is non-zero, show full circle
  if (nonZeroPercentages.length === 1) {
    const idx = nonZeroIndices[0];
    segments.push({
      startAngle: -90,
      endAngle: 270, // Full circle
      action: currentPie.value!.actions[idx]
    });
    return segments;
  }
  
  // Normal case: multiple non-zero values
  let angle = -90; // start at 12 o'clock
  nonZeroIndices.forEach((originalIdx, i) => {
    const pct = nonZeroPercentages[i];
    const span = (pct / 100) * 360;
    const seg = { 
      startAngle: angle, 
      endAngle: angle + span, 
      action: currentPie.value!.actions[originalIdx] 
    };
    segments.push(seg);
    angle += span;
  });
  
  return segments;
});

// Animated pie segments
const animatedPieSegments = ref<Array<{
  startAngle: number;
  endAngle: number;
  animatedStart: number;
  animatedEnd: number;
  action: string;
}>>([]);

// Animation frame ID for cleanup
let animationFrameId: number | null = null;

// Animate pie segments smoothly
watchEffect(() => {
  const targetSegments = currentPieSegments.value;
  
  // Initialize animated segments if empty
  if (animatedPieSegments.value.length === 0 && targetSegments.length > 0) {
    animatedPieSegments.value = targetSegments.map(seg => ({
      ...seg,
      animatedStart: seg.startAngle,
      animatedEnd: seg.startAngle // Start with 0 width for initial animation
    }));
  }
  
  // Cancel previous animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  
  // Animate to target positions
  const animate = () => {
    let needsAnimation = false;
    
    // Update or add segments
    targetSegments.forEach((target, i) => {
      let animated = animatedPieSegments.value.find(a => a.action === target.action);
      
      if (!animated) {
        // New segment - add it
        animatedPieSegments.value.push({
          ...target,
          animatedStart: target.startAngle,
          animatedEnd: target.startAngle
        });
        animated = animatedPieSegments.value[animatedPieSegments.value.length - 1];
      }
      
      // Animate towards target
      const speed = 0.15; // Animation speed
      
      if (Math.abs(animated.animatedStart - target.startAngle) > 0.1) {
        animated.animatedStart += (target.startAngle - animated.animatedStart) * speed;
        animated.startAngle = target.startAngle;
        needsAnimation = true;
      } else {
        animated.animatedStart = target.startAngle;
      }
      
      if (Math.abs(animated.animatedEnd - target.endAngle) > 0.1) {
        animated.animatedEnd += (target.endAngle - animated.animatedEnd) * speed;
        animated.endAngle = target.endAngle;
        needsAnimation = true;
      } else {
        animated.animatedEnd = target.endAngle;
      }
    });
    
    // Remove segments that are no longer in target
    animatedPieSegments.value = animatedPieSegments.value.filter(animated => 
      targetSegments.some(target => target.action === animated.action)
    );
    
    if (needsAnimation) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  };
  
  // Start animation after a small delay
  setTimeout(() => {
    animate();
  }, 50);
});

// Pie geometry based on fixed viewBox (400x400); SVG scales with CSS
const center = 200;
const outerR = 192;
const sliceR = 186;
const innerR = 102;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Special case for full circle (when only one value is non-zero)
  if (endAngle - startAngle >= 360) {
    // Draw a full circle as two semicircles
    const start = polarToCartesian(cx, cy, r, 0);
    const mid = polarToCartesian(cx, cy, r, 180);
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 0 0 ${mid.x} ${mid.y} A ${r} ${r} 0 0 0 ${start.x} ${start.y} Z`;
  }
  
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function round(n: number) { return Math.round(n); }

// (Removed legacy bar calculations)

// Styling helpers
function getEventChipBg(eventType: string): string {
  const style = EVENT_STYLES[eventType];
  if (!style) return 'rgba(255,255,255,0.82)';
  return `linear-gradient(135deg, ${style.color}15 0%, rgba(255,255,255,0.9) 100%)`;
}

function getEventBorderColor(eventType: string): string {
  const style = EVENT_STYLES[eventType];
  if (!style) return 'rgba(229,231,235,0.9)';
  return `${style.color}40`;
}

/* (Legacy friendlyEventName removed) */

// Legend chip coloring to closely match pie segments
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1; // default to light
  const srgb = [rgb.r, rgb.g, rgb.b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function getLegendChipStyle(action: string) {
  const style = EVENT_STYLES[action];
  const base = style?.color || '#94a3b8';
  return {
    background: base,
    borderColor: rgba(base, 0.6)
  } as Record<string, string>;
}
</script>

<style scoped>
.card { 
  padding: 14px 16px; 
  display: flex; 
  flex-direction: column; 
  flex: 1 1 auto; 
  min-height: 0; 
}

.glass { 
  background: rgba(255, 255, 255, 0.92); 
  border: 1px solid rgba(229, 231, 235, 0.95); 
  box-shadow: 0 18px 50px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.75); 
  backdrop-filter: blur(18px) saturate(120%); 
  -webkit-backdrop-filter: blur(18px) saturate(120%); 
  border-radius: 16px; 
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}
.card-title { 
  margin: 0; 
  color: #334155; 
}

/* Carousel header */
.carousel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.carousel-title { display: flex; align-items: center; gap: 10px; }
.slide-count {
  font-weight: 800;
  font-size: 12px;
  color: #64748b;
  background: rgba(99,102,241,0.06);
  border: 1px solid rgba(99,102,241,0.18);
  padding: 4px 8px;
  border-radius: 999px;
}

.ratio-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.active-filters-summary {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(102,126,234,0.25);
  white-space: nowrap;
}

.filter-tag.player-tag {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 2px 6px rgba(16,185,129,0.25);
}

.placeholder { 
  color: #64748b; 
  padding: 12px; 
  border: 1px dashed #e5e9f0; 
  border-radius: 10px; 
  background: #fff; 
}

.bars { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  flex: 1 1 auto; 
  min-height: 0; 
}

.bars.big { 
  height: 100%; 
}

.bars.big .bar-row { 
  flex: 1 1 0; 
  min-height: 36px; 
}

.bar-row { 
  display: flex; 
  align-items: stretch; 
  padding: 0; 
  background: transparent; 
  transition: transform .18s ease; 
}

.bar-row.highlight { 
  transform: translateX(4px); 
}

.bar { 
  position: relative; 
  height: 100%; 
  background: linear-gradient(135deg, rgba(238,242,255,0.4) 0%, rgba(199,210,254,0.2) 100%); 
  border-radius: 12px; 
  overflow: hidden; 
  border: 1px solid rgba(199,210,254,0.3); 
  width: 100%; 
}

.bar-fill { 
  position: absolute; 
  left: 0; 
  top: 0; 
  height: 100%; 
  transform-origin: left center; 
  transition: width .65s cubic-bezier(.2,.7,.1,1); 
  border-radius: 12px; 
}

.bar-fill.global { 
  backdrop-filter: blur(4px); 
  opacity: 0.75; 
}

.bar-fill.player { 
  mix-blend-mode: normal; 
  opacity: 0.85; 
  backdrop-filter: blur(4px); 
}

.bar-chip { 
  position: absolute; 
  left: 50%; 
  top: 50%; 
  transform: translate(-50%, -50%); 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  padding: 5px 10px; 
  border-radius: 999px; 
  border: 1px solid; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4); 
  backdrop-filter: blur(8px) saturate(120%); 
  -webkit-backdrop-filter: blur(8px) saturate(120%); 
  transition: all 0.3s ease;
  min-width: 160px;
}

.bar-row:hover .bar-chip { 
  transform: translate(-50%, -50%) scale(1.05); 
  box-shadow: 0 6px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6); 
}

.event-icon { 
  font-size: 16px; 
}

.chip-label { 
  font-weight: 800; 
  color: #0f172a; 
  letter-spacing: .1px; 
  white-space: nowrap; 
  font-size: 14px; 
  flex: 1;
  text-align: center;
}

.chip-count { 
  padding: 3px 8px; 
  border-radius: 999px; 
  font-weight: 800; 
  font-size: 12px; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
  margin-left: 4px; 
}

.chip-count.global { 
  background: rgba(255,255,255,0.7); 
  color: #1f2937; 
  border: 1px solid rgba(229,231,235,0.5); 
}

.chip-count.player { 
  background: rgba(99,102,241,0.15); 
  color: #312e81; 
  border: 1px solid rgba(99,102,241,0.3); 
}

/* (Legacy shimmer removed) */

.hint.small { 
  font-size: 12px; 
  color: #64748b; 
}

/* Ratio group styles */
.group-total {
  font-size: 16px;
  font-weight: 900;
  color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.08) 100%);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(102, 126, 234, 0.25);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  min-width: 48px;
  text-align: center;
}

/* Place the group total just next to the title */
.ratio-card .card-header {
  justify-content: flex-start;
  gap: 8px;
}
.ratio-card .group-total {
  margin-left: 6px;
}

.ratio-bar {
  position: relative;
  height: 60px;
  background: linear-gradient(135deg, rgba(238,242,255,0.4) 0%, rgba(199,210,254,0.2) 100%);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(199,210,254,0.3);
  width: 100%;
  display: flex;
}

/* Pie styles */
.pie-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pie-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pie-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.carousel-btn {
  appearance: none;
  border: 1px solid rgba(209, 213, 219, 0.9);
  background: white;
  color: #334155;
  font-weight: 900;
  font-size: 16px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  cursor: pointer;
}
.carousel-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pie-canvas {
  display: grid;
  place-items: center;
  width: min(100%, 70vh);
  max-height: 70vh;
  aspect-ratio: 1;
  margin: 0 auto;
}
.pie-svg { width: 100%; height: 100%; }
.pie-base {
  fill: rgba(238,242,255,0.6);
  stroke: rgba(199,210,254,0.6);
  stroke-width: 1;
}
.pie-slice { 
  stroke: rgba(255,255,255,0.9); 
  stroke-width: 1;
  opacity: 0.85;
  transition: opacity 0.3s ease;
}

.pie-slice:hover {
  opacity: 1;
}

/* Vue transition for pie slices */
.pie-transition-enter-active,
.pie-transition-leave-active {
  transition: all 0.2s ;
}

.pie-transition-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.pie-transition-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.pie-hole {
  fill: rgba(255,255,255,0.9);
  stroke: rgba(229,231,235,0.8);
  stroke-width: 1;
}
.pie-center-title { font-weight: 900; font-size: 14px; fill: #1f2937; }
.pie-center-sub { font-weight: 700; font-size: 11px; fill: #64748b; }
.pie-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: clamp(6px, 1.2vw, 12px);
}
.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: clamp(6px, 1.5vw, 18px);
  padding: clamp(4px, 1vw, 12px) clamp(8px, 2vw, 24px);
  border: 1px solid;
  border-radius: clamp(10px, 1.2vw, 14px);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.35);
}
.legend-icon { font-size: clamp(14px, 3vw, 42px); }
.legend-label, .legend-count {
  color: #111827; /* black-ish interior */
  font-weight: 900;
  /* white outline for legibility */
  text-shadow: 
    0 1px 0 #ffffff,
    1px 0 0 #ffffff,
    0 -1px 0 #ffffff,
    -1px 0 0 #ffffff,
    1px 1px 0 #ffffff,
    -1px 1px 0 #ffffff,
    1px -1px 0 #ffffff,
    -1px -1px 0 #ffffff;
}
.legend-label { font-size: clamp(12px, 2.4vw, 36px); }
.legend-count { 
  padding: clamp(2px, 0.6vw, 6px) clamp(6px, 1.8vw, 18px);
  border-radius: 999px;
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(229,231,235,0.6);
  font-size: clamp(11px, 2.2vw, 33px);
}

.ratio-segment {
  height: 100%;
  transition: all 0.6s cubic-bezier(.2,.7,.1,1);
  backdrop-filter: blur(4px);
  opacity: 0.8;
}

.ratio-segment:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.ratio-segment:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

.ratio-event-chip {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  transition: all 0.3s ease;
  white-space: nowrap;
  max-width: 95%;
}

.ratio-segment:hover .ratio-event-chip {
  transform: translate(-50%, -50%) scale(1.05);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6);
}

.ratio-icon {
  font-size: 14px;
}

.ratio-label {
  color: #0f172a;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: .1px;
}

.ratio-count {
  color: #1f2937;
  font-weight: 800;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(229,231,235,0.5);
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 11px;
  margin-left: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

@media (max-width: 767px) {
  .card { padding: 10px 12px; }
  .card-header { margin-bottom: 8px; }
  .card-title { font-size: 16px; }
  .ratio-group { min-height: 90px; }
  .ratio-bar { height: 42px; }
}

@media (max-width: 480px) {
  .ratio-cards {
    gap: 8px;
  }
  .card {
    padding: 8px 10px;
  }

  .card-header {
    margin-bottom: 6px;
  }
  
  .card-title {
    font-size: 14px;
  }

  .group-total {
    font-size: 12px;
    padding: 3px 8px;
    min-width: 40px;
  }

  .ratio-bar {
    height: 34px;
  }

  .ratio-group {
    min-height: 74px;
  }

  .ratio-group-header {
    margin-top: 6px;
    margin-bottom: 6px;
    padding: 6px 8px;
  }

  .bar-chip {
    min-width: 100px;
    padding: 3px 6px;
    gap: 3px;
  }
  
  .event-icon {
    font-size: 11px;
  }
  
  .chip-label {
    font-size: 10px;
  }
  
  .chip-count {
    padding: 1px 3px;
    font-size: 8px;
    margin-left: 1px;
  }

  /* Ratio responsive styles */
  .ratio-event-chip {
    padding: 3px 6px;
    gap: 3px;
  }
  
  .ratio-icon {
    font-size: 11px;
  }
  
  .ratio-label {
    font-size: 10px;
  }
  
  .ratio-count {
    font-size: 8px;
    padding: 1px 3px;
  }

  .filter-tag {
    font-size: 10px;
    padding: 3px 6px;
  }

  .hint.small {
    display: none;
  }
}

@media (max-width: 767px) {
  .ratio-event-chip {
    padding: 3px 7px;
    gap: 4px;
  }
  
  .ratio-icon {
    font-size: 12px;
  }
  
  .ratio-label {
    font-size: 11px;
  }
  
  .ratio-count {
    font-size: 9px;
    padding: 1px 4px;
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .ratio-event-chip {
    padding: 4px 8px;
    gap: 5px;
  }
  
  .ratio-icon {
    font-size: 13px;
  }
  
  .ratio-label {
    font-size: 12px;
  }
  
  .ratio-count {
    font-size: 10px;
  }
}

@media (min-width: 1200px) {
  .ratio-event-chip {
    padding: 6px 12px;
    gap: 8px;
  }
  
  .ratio-icon {
    font-size: 16px;
  }
  
  .ratio-label {
    font-size: 14px;
  }
  
  .ratio-count {
    font-size: 12px;
    padding: 3px 8px;
  }
}
</style>
