<template>
  <div class="filters-wrapper">
    <!-- Time selector -->
    <div class="time-selector">
      <div class="mode-buttons">
        <button 
          class="mode-btn" 
          :class="{ active: filters.timeMode === 'active' }"
          @click="updateTimeMode('active')"
          title="Mostrar solo salas activas (tiempo real)"
        >
          🔴 Salas activas
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: filters.timeMode === 'range' }"
          @click="updateTimeMode('range')"
          title="Filtrar por rango de fecha y hora"
        >
          📅 Rango de tiempo
        </button>
      </div>
      <div class="range-inputs" :class="{ disabled: filters.timeMode !== 'range' }">
        <label>
          Desde
          <input 
            type="datetime-local" 
            :value="filters.rangeFrom" 
            :disabled="filters.timeMode !== 'range'" 
            @change="updateRangeFrom(($event.target as HTMLInputElement).value)" 
          />
        </label>
        <label>
          Hasta
          <input 
            type="datetime-local" 
            :value="filters.rangeTo" 
            :disabled="filters.timeMode !== 'range' || filters.liveEnd" 
            @change="updateRangeTo(($event.target as HTMLInputElement).value)" 
          />
        </label>
      </div>
      <div class="quick">
        <button 
          class="qs-btn live-btn" 
          :class="{ active: filters.liveEnd }" 
          :disabled="filters.timeMode !== 'range'" 
          @click="toggleLiveEnd" 
          title="Hasta ahora"
        >
          ⏱
        </button>
        <button class="qs-btn" :disabled="filters.timeMode !== 'range'" @click="incrementFrom(1, 'm')">1m</button>
        <button class="qs-btn" :disabled="filters.timeMode !== 'range'" @click="incrementFrom(10, 'm')">10m</button>
        <button class="qs-btn" :disabled="filters.timeMode !== 'range'" @click="incrementFrom(1, 'h')">1h</button>
        <button class="qs-btn" :disabled="filters.timeMode !== 'range'" @click="incrementFrom(1, 'd')">1D</button>
        <button class="qs-btn" :disabled="filters.timeMode !== 'range'" @click="incrementFrom(1, 'mo')">1M</button>
        <button class="qs-btn" :disabled="filters.timeMode !== 'range'" @click="incrementFrom(1, 'y')">1Y</button>
      </div>
    </div>
    
    <hr class="divider" />
    
    <!-- Round and Game filters -->
    <div class="filters-container" :class="{ compact }">
      <div class="filter-group">
        <label class="filter-label">Ronda:</label>
        <div class="filter-buttons">
          <button 
            class="filter-btn" 
            :class="{ active: filters.rounds.length === 0 }"
            @click="updateRounds([])"
            title="Mostrar todas las rondas"
          >
            Todas
          </button>
          <button 
            v-for="r in [1, 2, 3]" 
            :key="r"
            class="filter-btn" 
            :class="{ active: filters.rounds.includes(r) }"
            @click="toggleRound(r)"
            :title="`Mostrar ronda ${r}`"
          >
            R{{ r }}
          </button>
        </div>
      </div>
      
      <div class="filter-group">
        <label class="filter-label">Juego:</label>
        <div class="filter-buttons">
          <button 
            class="filter-btn" 
            :class="{ active: filters.games.length === 0 }"
            @click="updateGames([])"
            title="Mostrar todas las variantes"
          >
            Todas
          </button>
          <button 
            v-for="g in ['G1', 'G2', 'G3', 'G4', 'G5']" 
            :key="g"
            class="filter-btn" 
            :class="{ active: filters.games.includes(g) }"
            @click="toggleGame(g)"
            :title="`Mostrar variante ${g}`"
          >
            {{ g }}
          </button>
        </div>
      </div>
    </div>
    
    <hr class="divider" />
    
    <!-- Player selection -->
    <div class="player-chips compact">
      <div class="search-controls">
        <input 
          v-model="playerSearch" 
          class="search" 
          placeholder="Buscar jugador…" 
        />
        <div class="pagination compact" v-if="playerPageCount > 1">
          <button class="pg-btn compact" @click="playerPage--" :disabled="playerPage <= 1">‹</button>
          <span class="pg-ind">{{ playerPage }}/{{ playerPageCount }}</span>
          <button class="pg-btn compact" @click="playerPage++" :disabled="playerPage >= playerPageCount">›</button>
        </div>
      </div>
      <div class="chips">
        <button
          v-for="p in playersPage"
          :key="p.uuid"
          class="chip"
          :class="{ active: filters.playerUuids.includes(p.uuid) }"
          @click="togglePlayer(p.uuid)"
          :title="p.uuid"
          :style="({ '--primary': p.color || '#667eea' } as any)"
        >
          <span class="avatar">{{ initials(p.name) }}</span>
          <span class="label">{{ p.name || 'Jugador' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue';

type TimeMode = 'active' | 'range';

interface FilterState {
  timeMode: TimeMode;
  rangeFrom: string;
  rangeTo: string;
  liveEnd: boolean;
  rounds: number[];
  games: string[];
  playerUuids: string[];
  rooms: string[];
}

interface PlayerData {
  uuid: string;
  name: string;
  color?: string;
  total?: number;
  shameTokens?: number;
  counts?: Record<string, number>;
  roomScoreHistory?: Array<{
    roomId: string;
    scores: Array<{
      round: number;
      variant: string;
      role: string;
      score: number;
    }>;
  }>;
}

interface Props {
  modelValue: FilterState;
  rawData?: {
    players?: PlayerData[];
    activeRooms?: any;
    aggregatedEvents?: any[];
    aggregated?: {
      detailedEvents?: any[];
      counts?: Record<string, number>;
    };
  };
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
});

const emit = defineEmits<{
  'update:modelValue': [value: FilterState];
  'filtered': [data: any];
}>();

// Local reactive copy of filters
const filters = ref<FilterState>({
  timeMode: 'range',
  rangeFrom: '',
  rangeTo: '',
  liveEnd: true,
  rounds: [],
  games: [],
  playerUuids: [],
  rooms: []
});

// Sync with v-model
watch(() => props.modelValue, (newVal) => {
  filters.value = { ...newVal };
}, { immediate: true, deep: true });

// Player search and pagination
const playerSearch = ref('');
const playerPage = ref(1);
const pageSize = 15;

// Initialize default time range
function initDefaultRange() {
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
  filters.value.rangeFrom = formatLocal(from);
  filters.value.rangeTo = formatLocal(now);
  emitUpdate();
}

function formatLocal(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const d = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mm = pad(dt.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

// Players list from raw data
const players = computed(() => {
  if (!props.rawData?.players) return [];
  return props.rawData.players.filter(p => p.name);
});

const playersFiltered = computed(() => {
  const q = playerSearch.value.toLowerCase();
  if (!q) return players.value;
  return players.value.filter(p => 
    (p.name || '').toLowerCase().includes(q) || 
    (p.uuid || '').toLowerCase().includes(q)
  );
});

const playerPageCount = computed(() => 
  Math.ceil(playersFiltered.value.length / pageSize)
);

const playersPage = computed(() => {
  const start = (playerPage.value - 1) * pageSize;
  return playersFiltered.value.slice(start, start + pageSize);
});

// Reset page when search changes
watch(playerSearch, () => {
  playerPage.value = 1;
});

// Helper to get initials
function initials(name: string): string {
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Update functions that emit changes
function emitUpdate() {
  emit('update:modelValue', { ...filters.value });
}

function updateTimeMode(mode: TimeMode) {
  filters.value.timeMode = mode;
  emitUpdate();
  applyFilters();
}

function updateRangeFrom(value: string) {
  filters.value.rangeFrom = value;
  emitUpdate();
  applyFilters();
}

function updateRangeTo(value: string) {
  filters.value.rangeTo = value;
  emitUpdate();
  applyFilters();
}

function toggleLiveEnd() {
  filters.value.liveEnd = !filters.value.liveEnd;
  if (filters.value.liveEnd) {
    const now = new Date();
    filters.value.rangeTo = formatLocal(now);
    // Set rangeFrom to 1 minute before rangeTo
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    filters.value.rangeFrom = formatLocal(oneMinuteAgo);
  }
  emitUpdate();
  applyFilters();
}

function incrementFrom(n: number, unit: 'm' | 'h' | 'd' | 'mo' | 'y') {
  const to = filters.value.liveEnd ? new Date() : new Date(Date.parse(filters.value.rangeTo || ''));
  if (Number.isNaN(to.getTime())) {
    to.setTime(Date.now());
  }
  
  let from = new Date(Date.parse(filters.value.rangeFrom || ''));
  if (Number.isNaN(from.getTime())) {
    from = new Date(to.getTime());
  }
  
  // Move 'from' backwards in time
  if (unit === 'm') from.setMinutes(from.getMinutes() - n);
  else if (unit === 'h') from.setHours(from.getHours() - n);
  else if (unit === 'd') from.setDate(from.getDate() - n);
  else if (unit === 'mo') from.setMonth(from.getMonth() - n);
  else if (unit === 'y') from.setFullYear(from.getFullYear() - n);
  
  // Ensure minimum window
  const minWindowMs = 60 * 1000;
  if (to.getTime() - from.getTime() < minWindowMs) {
    from = new Date(to.getTime() - minWindowMs);
  }
  
  filters.value.rangeFrom = formatLocal(from);
  filters.value.rangeTo = formatLocal(to);
  emitUpdate();
  applyFilters();
}

function updateRounds(rounds: number[]) {
  filters.value.rounds = rounds;
  emitUpdate();
  applyFilters();
}

function toggleRound(round: number) {
  const idx = filters.value.rounds.indexOf(round);
  if (idx >= 0) {
    filters.value.rounds.splice(idx, 1);
  } else {
    filters.value.rounds.push(round);
  }
  emitUpdate();
  applyFilters();
}

function updateGames(games: string[]) {
  filters.value.games = games;
  emitUpdate();
  applyFilters();
}

function toggleGame(game: string) {
  const idx = filters.value.games.indexOf(game);
  if (idx >= 0) {
    filters.value.games.splice(idx, 1);
  } else {
    filters.value.games.push(game);
  }
  emitUpdate();
  applyFilters();
}

function togglePlayer(uuid: string) {
  const idx = filters.value.playerUuids.indexOf(uuid);
  if (idx >= 0) {
    filters.value.playerUuids.splice(idx, 1);
  } else {
    filters.value.playerUuids.push(uuid);
  }
  emitUpdate();
  applyFilters();
}

// Live update timer
let liveTimer: any = null;

watchEffect(() => {
  if (filters.value.liveEnd && filters.value.timeMode === 'range') {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(() => {
      // Just re-apply filters, don't update rangeTo
      // applyFilters will use Date.now() when liveEnd is true
      applyFilters();
    }, 1000); // Update every second for real-time updates
  } else {
    if (liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  }
});

// Apply filters to raw data and emit filtered result
function applyFilters() {
  if (!props.rawData) {
    emit('filtered', null);
    return;
  }
  
  const result: any = {
    players: [],
    events: [],
    metrics: {},
    aggregatedCounts: {},
    sourceData: filters.value.timeMode
  };
  
  let sourceEvents: any[] = [];
  
  // Get events based on time mode
  if (filters.value.timeMode === 'active') {
    // Extract events from active rooms
    result.activeRooms = props.rawData.activeRooms;
    if (props.rawData.activeRooms?.rooms) {
      sourceEvents = props.rawData.activeRooms.rooms.flatMap((room: any) => 
        (room.systemMessages || []).map((msg: any) => ({
          ...msg,
          playerUuid: msg.playerUuid || undefined
        }))
      );
    }
  } else {
    // Use aggregated events from multiple possible sources
    sourceEvents = props.rawData.aggregatedEvents || 
                   props.rawData.aggregated?.detailedEvents || 
                   [];
  }
  
  // Apply filters to events
  const fromMs = Date.parse(filters.value.rangeFrom || '');
  // If liveEnd is active, use current timestamp for toMs instead of rangeTo
  let toMs = Date.parse(filters.value.rangeTo || '');
  if (filters.value.liveEnd && filters.value.timeMode === 'range') {
    toMs = Date.now(); // Use current time for real-time updates
  }
  
  result.events = sourceEvents.filter((ev: any) => {
    // Time filter (only for range mode)
    if (filters.value.timeMode === 'range' && !Number.isNaN(fromMs) && !Number.isNaN(toMs)) {
      const t = ev.timestamp;
      if (typeof t === 'number' && (t < fromMs || t > toMs)) return false;
    }
    
    // Round filter
    if (filters.value.rounds.length > 0) {
      if (!filters.value.rounds.includes(ev.round)) return false;
    }
    
    // Game filter  
    if (filters.value.games.length > 0) {
      if (!filters.value.games.includes(ev.gameVariant)) return false;
    }
    
    // Room filter
    if (filters.value.rooms.length > 0) {
      if (!filters.value.rooms.includes(ev.roomId)) return false;
    }
    
    // Player filter
    if (filters.value.playerUuids.length > 0 && ev.playerUuid) {
      if (!filters.value.playerUuids.includes(ev.playerUuid)) return false;
    }
    
    return true;
  });
  
  // Filter players
  if (props.rawData.players) {
    if (filters.value.playerUuids.length > 0) {
      result.players = props.rawData.players.filter((p: PlayerData) => 
        filters.value.playerUuids.includes(p.uuid)
      );
    } else {
      result.players = [...props.rawData.players];
    }
    
    // Calculate metrics from filtered players and their score history
    let totalP1Scores = 0;
    let totalP2Scores = 0;
    let p1Count = 0;
    let p2Count = 0;
    let playersWithShame = 0;
    
    result.players.forEach((player: PlayerData) => {
      if (player.shameTokens && player.shameTokens > 0) {
        playersWithShame++;
      }
      
      if (player.roomScoreHistory) {
        player.roomScoreHistory.forEach(roomScore => {
          roomScore.scores.forEach(score => {
            // Apply same filters to score history
            let includeScore = true;
            
            if (filters.value.rounds.length > 0 && !filters.value.rounds.includes(score.round)) {
              includeScore = false;
            }
            if (filters.value.games.length > 0 && !filters.value.games.includes(score.variant)) {
              includeScore = false;
            }
            if (filters.value.rooms.length > 0 && !filters.value.rooms.includes(roomScore.roomId)) {
              includeScore = false;
            }
            
            if (includeScore) {
              if (score.role === 'P1') {
                totalP1Scores += score.score;
                p1Count++;
              } else if (score.role === 'P2') {
                totalP2Scores += score.score;
                p2Count++;
              }
            }
          });
        });
      }
    });
    
    result.metrics = {
      players_seated: result.players.length,
      score_p1: p1Count > 0 ? Math.round((totalP1Scores / p1Count) * 10) / 10 : 0,
      score_p2: p2Count > 0 ? Math.round((totalP2Scores / p2Count) * 10) / 10 : 0,
      players_with_shame: playersWithShame,
      players_without_shame: result.players.length - playersWithShame
    };
  }
  
  // Count events by type from filtered events
  const eventTypes = [
    'p1_propose', 'p1_no_offer',
    'p2_snatch', 'p2_accept', 'p2_force', 'p2_no_force', 'p2_reject',
    'p1_shame', 'p1_no_shame', 'p1_report', 'p1_no_report'
  ];
  
  result.aggregatedCounts = {};
  eventTypes.forEach(type => {
    result.aggregatedCounts[type] = result.events.filter((e: any) => e.kind === type).length;
  });
  
  // Add debug info
  result._debug = {
    totalSourceEvents: sourceEvents.length,
    filteredEvents: result.events.length,
    activeFilters: {
      timeMode: filters.value.timeMode,
      rounds: filters.value.rounds,
      games: filters.value.games,
      players: filters.value.playerUuids,
      rooms: filters.value.rooms
    },
    timeRange: filters.value.timeMode === 'range' ? {
      from: filters.value.rangeFrom,
      to: filters.value.rangeTo,
      fromMs,
      toMs
    } : null
  };
  
  emit('filtered', result);
}

// Initialize on mount
if (!filters.value.rangeFrom) {
  initDefaultRange();
}

// Apply filters whenever raw data changes
watch(() => props.rawData, () => {
  applyFilters();
}, { deep: true, immediate: true });

// Watch for specific nested changes that might not trigger deep watch
// These are critical for range mode to update in real-time
watch(() => props.rawData?.aggregated?.detailedEvents?.length, () => {
  if (filters.value.timeMode === 'range') {
    // Just apply filters, don't update rangeTo
    applyFilters();
  }
});

watch(() => props.rawData?.aggregatedEvents?.length, () => {
  if (filters.value.timeMode === 'range') {
    // Just apply filters, don't update rangeTo
    applyFilters();
  }
});

// Watch for player data changes
watch(() => props.rawData?.players?.length, () => {
  applyFilters();
});
</script>

<style scoped>
.filters-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filters-container {
  display: flex;
  gap: 12px;
  padding: 0;
  margin: 0;
  align-items: center;
  flex-wrap: wrap;
}

.filters-container.compact {
  gap: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label { 
  font-size: 13px; 
  font-weight: 700; 
  color: #334155; 
  min-width: 52px; 
}

.filter-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: rgba(255,255,255,0.6);
  color: #64748b;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  background: rgba(255,255,255,0.9);
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
  box-shadow: 0 4px 16px rgba(102,126,234,0.3);
}

.filter-btn.active:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102,126,234,0.4);
}

/* Time selector styles */
.time-selector { 
  align-items: center; 
}

.mode-buttons { 
  display: flex; 
  gap: 6px; 
  margin-bottom: 10px; 
}

.mode-btn { 
  padding: 6px 10px; 
  border-radius: 8px; 
  border: 1px solid #cbd5e1; 
  background: #fff; 
  color: #334155; 
  font-weight: 800; 
  font-size: 12px; 
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.mode-btn.active { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
  color: #fff; 
  border-color: #667eea; 
}

.range-inputs { 
  display: flex; 
  gap: 10px; 
  align-items: center; 
  flex-wrap: wrap; 
  margin-bottom: 10px; 
}

.range-inputs.disabled { 
  opacity: 0.6; 
  filter: grayscale(0.1); 
}

.range-inputs label { 
  display: flex; 
  gap: 6px; 
  align-items: center; 
  font-weight: 700; 
  color: #334155; 
  font-size: 13px;
}

.range-inputs input[type="datetime-local"] { 
  padding: 6px 8px; 
  border: 1px solid #cbd5e1; 
  border-radius: 8px; 
  font-size: 12px; 
  background: #fff;
  color: #0f172a;
}

/* Quick select buttons */
.quick { 
  display: flex; 
  gap: 6px; 
}

.qs-btn { 
  padding: 4px 8px; 
  border-radius: 999px; 
  border: 1px solid rgba(148,163,184,0.35); 
  background: rgba(255,255,255,0.6); 
  color: #475569; 
  font-size: 11px; 
  font-weight: 800; 
  cursor: pointer; 
  opacity: 0.85; 
  transition: all 0.2s ease; 
}

.qs-btn:hover:not(:disabled) { 
  opacity: 1; 
  box-shadow: 0 2px 6px rgba(0,0,0,0.08); 
  transform: translateY(-1px); 
}

.qs-btn:active { 
  transform: translateY(0); 
}

.qs-btn:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}

.live-btn.active { 
  background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); 
  color: #fff; 
  border-color: #06b6d4; 
  opacity: 1;
}

.divider { 
  border: 0; 
  border-top: 1px solid rgba(203,213,225,0.6); 
  margin: 6px 0; 
}

/* Player chips styles */
.player-chips {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-chips.compact .search { 
  padding: 6px 8px; 
  min-width: 180px; 
  font-size: 12px; 
}

.player-chips.compact .chip { 
  padding: 6px 10px; 
  font-size: 12px; 
}

.player-chips.compact .avatar { 
  width: 20px; 
  height: 20px; 
  font-size: 12px; 
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: start;
  flex-wrap: wrap;
}

.search { 
  padding: 8px 10px; 
  border: 1px solid #cbd5e1; 
  background: #fff; 
  color: #0f172a; 
  border-radius: 10px; 
  min-width: 240px; 
  outline: none; 
  flex: 1;
  max-width: 300px;
}

.search::placeholder { 
  color: #64748b; 
}

.chips { 
  display: flex; 
  gap: 10px; 
  flex-wrap: wrap; 
  align-items: center;
}

.chip { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  background: color-mix(in srgb, var(--primary) 6%, white); 
  border: 1px solid color-mix(in srgb, var(--primary) 24%, #e5e7eb); 
  padding: 8px 12px; 
  border-radius: 999px; 
  color: #111827; 
  cursor: pointer; 
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease; 
}

.chip:hover { 
  transform: translateY(-1px); 
  background: color-mix(in srgb, var(--primary) 10%, white); 
  box-shadow: 0 6px 18px rgba(102,126,234,0.18); 
}

.chip.active { 
  background: color-mix(in srgb, var(--primary) 18%, white); 
  border-color: color-mix(in srgb, var(--primary) 45%, #c7d2fe); 
  box-shadow: 0 6px 22px rgba(99,102,241,0.22); 
}

.avatar { 
  width: 24px; 
  height: 24px; 
  border-radius: 50%; 
  background: color-mix(in srgb, var(--primary) 25%, #eef2ff); 
  display: grid; 
  place-items: center; 
  font-weight: 900; 
  color: color-mix(in srgb, var(--primary) 80%, #111); 
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(229,231,235,0.9);
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.pagination.compact {
  gap: 6px;
  padding: 4px 8px;
}

.pg-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 900;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(102,126,234,0.25);
}

.pg-btn.compact {
  width: 24px;
  height: 24px;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(102,126,234,0.2);
}

.pg-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102,126,234,0.35);
}

.pg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #e5e7eb;
  color: #94a3b8;
  box-shadow: none;
}

.pg-ind {
  font-weight: 600;
  color: #334155;
  font-size: 12px;
  min-width: 35px;
  text-align: center;
}

@media (max-width: 768px) {
  .filters-container {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .filter-group {
    justify-content: space-between;
  }
  
  .filter-buttons {
    justify-content: flex-end;
  }
  
  .time-selector {
    padding: 8px;
  }
  
  .range-inputs {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .filter-group {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .filter-label {
    min-width: auto;
    text-align: center;
  }
  
  .filter-buttons {
    justify-content: center;
  }
  
  .mode-buttons {
    flex-direction: column;
    gap: 8px;
  }
  
  .mode-btn {
    width: 100%;
  }
  
  .quick {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>