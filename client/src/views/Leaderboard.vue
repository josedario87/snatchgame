<template>
  <div class="leaderboard light">
    <div class="header glass light">
      <div class="header-row">
        <div class="header-left">
        <button class="btn-back" @click="goHome" title="Volver al inicio">
          ← <span class="label">Inicio</span>
        </button>
        <h1><GameLogo size="medium" /> Estadísticas</h1>
        </div>
        <div class="actions">
        <button class="btn-collapse" @click="filtersCollapsed = !filtersCollapsed" :title="filtersCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'">
          <span class="collapse-icon" :class="{ rotated: filtersCollapsed }">▼</span>
          <span class="collapse-text">{{ filtersCollapsed ? 'Mostrar filtros' : 'Ocultar filtros' }}</span>
        </button>
        </div>
      </div>
      <div class="header-markers filters-indicators">
        <span class="marker-chip">
          <span class="key time"></span>
          {{ periodLabel }}
          <button class="chip-x" v-if="filterState.timeMode == 'range'" @click="clearTimeFilter" title="Borrar filtro de tiempo">×</button>
        </span>
        <span class="marker-chip" v-if="filterState.rounds.length">
          <span class="key round"></span>
          Ronda: {{ filterState.rounds.join(',') }}
          <button class="chip-x" @click="filterState.rounds = []">×</button>
        </span>
        <span class="marker-chip" v-if="filterState.games.length">
          <span class="key game"></span>
          Juego: {{ filterState.games.join(',') }}
          <button class="chip-x" @click="filterState.games = []">×</button>
        </span>
        <span class="marker-chip" v-if="filterState.playerUuids.length" >
          <span class="key player"></span>
          Jugadores: {{ filterState.playerUuids.length }}
          <button class="chip-x" @click="filterState.playerUuids = []" title="Quitar selección de jugadores">×</button>
        </span>
      </div>
    </div>
  

  <div>
    
    <Transition name="filters-slide">
      <div v-if="!filtersCollapsed" class="controls glass light">
        <!-- EventFilters component with v-model -->
        <EventFilters 
          v-model="filterState"
          :raw-data="{
            players: allPlayersWithScores,
            aggregatedEvents: fullAggregatedEvents,
            aggregated: rawActionsPayload?.aggregated,
            activeRooms: rawActionsPayload?.activeRooms
          }"
          :compact="true"
          @filtered="onFiltered"
        />
        
        <!-- Room slice UI removida: reemplazada por rango de tiempo/activas -->
      </div>
    </Transition>
  </div>


    <EventChart 
      :filtered-data="filteredData"
      :selected-player-uuid="filterState.playerUuids.length ? filterState.playerUuids[0] : ''"
      view-mode="ratio"
      :loading="loading"
      :filters-collapsed="filtersCollapsed"
      :active-filters="activeFilters"
    />
    
    <!-- Filter Data Viewer Component -->
    <FilterDataViewer 
      :raw-data="rawActionsPayload"
      :filter-state="filterState"
      :filtered-data="filteredData"
    />
    
    <AppCredits position="bottom-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import EventChart from '../components/EventChart.vue';
import EventFilters from '../components/EventFilters.vue';
import FilterDataViewer from '../components/FilterDataViewer.vue';
import GameLogo from '../components/GameLogo.vue';
import AppCredits from '../components/AppCredits.vue';


const router = useRouter();
const loading = ref(false);
const filtersCollapsed = ref(false);

// Filter state using new EventFilters approach
const filterState = ref({
  timeMode: 'range' as 'active' | 'range',
  rangeFrom: '',
  rangeTo: '',
  liveEnd: true,
  rounds: [] as number[],
  games: [] as string[],
  playerUuids: [] as string[],
  rooms: [] as string[]
});

const fullAggregatedEvents = ref<Array<{ kind: string; round?: number; gameVariant?: string; roomId?: string; playerUuid?: string; timestamp?: number }>>([]);
const filteredData = ref<any>(null);

// Clear time filter - switch to active rooms mode
function clearTimeFilter() {
  filterState.value.timeMode = 'active';
}

// Handle filtered data from EventFilters component
function onFiltered(data: any) {
  filteredData.value = data;
}




// Store room score history from players
const allPlayersWithScores = ref<any[]>([]);



// Active filters object
const activeFilters = computed(() => ({
  dataSource: filterState.value.timeMode === 'active' ? 'active-rooms' : 'aggregated',
  round: filterState.value.rounds.join(',') || 'all',
  game: filterState.value.games.join(',') || 'all',
  hasFilters: filterState.value.rounds.length > 0 || filterState.value.games.length > 0 || filterState.value.playerUuids.length > 0,
  selectedPlayer: filterState.value.playerUuids.length ? `${filterState.value.playerUuids.length} jugadores` : undefined,
  selectedRoom: filterState.value.rooms.length ? `${filterState.value.rooms.length} salas` : undefined
}));


const availableRooms = ref<{ roomId: string; name: string; playerCount?: number }[]>([]);




function goHome() {
  router.push('/');
}





const apiBase = (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
const esActions = ref<EventSource|null>(null);
const rawActionsPayload = ref<any>(null);

// Indicator labels
const periodLabel = computed(() => {
  if (filterState.value.timeMode === 'active') return 'Salas activas';
  const from = (filterState.value.rangeFrom || '').replace('T', ' ');
  const to = (filterState.value.rangeTo || '').replace('T', ' ');
  return `${from} → ${to}${filterState.value.liveEnd ? ' (ahora)' : ''}`;
});





function closeStreams() {
  try { esActions.value?.close(); } catch {}
  esActions.value = null;
}

function setupStreams() {
  loading.value = true;
  closeStreams();

  // Único stream: players-actions-stream
  esActions.value = new EventSource(`${apiBase}/players-actions-stream`);
  esActions.value.onmessage = (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data || '{}');
      rawActionsPayload.value = data;

      const list = Array.isArray(data?.players) ? data.players : [];
      allPlayersWithScores.value = list;

      // Construir mapa de colores desde snapshot de salas activas (si está)
      const colorMap = new Map<string, string|undefined>();
      const activeRooms = data?.activeRooms?.rooms || [];
      activeRooms.forEach((r: any) => {
        (Array.isArray(r?.players) ? r.players : []).forEach((p: any) => {
          const uuid = String(p?.uuid || '');
          if (uuid && !colorMap.has(uuid)) colorMap.set(uuid, p?.color || undefined);
        });
      });



      // Store aggregated events for the EventFilters component
      const aggEvents = Array.isArray(data?.aggregated?.detailedEvents) ? data.aggregated.detailedEvents : [];
      fullAggregatedEvents.value = aggEvents as any;


      // Construir listado de salas desde aggregated.rooms si está, si no derivar de eventos
      const roomsList = Array.isArray(data?.aggregated?.rooms) ? data.aggregated.rooms : null;
      if (roomsList) {
        availableRooms.value = roomsList
          .slice()
          .sort((a: any, b: any) => (a?.lastSeenIndex || 0) - (b?.lastSeenIndex || 0))
          .map((r: any) => ({
            roomId: String(r?.roomId || ''),
            name: `Sala ${String(r?.roomId || '').slice(0, 8)}`,
            playerCount: Number(r?.messageCount || 0)
          }))
          .filter((r: any) => !!r.roomId);
      } else {
        const lastSeenIndex: Record<string, number> = {};
        const ids = new Set<string>();
        aggEvents.forEach((ev: any, i: number) => {
          const rid = String(ev?.roomId || '').trim();
          if (!rid) return;
          ids.add(rid);
          lastSeenIndex[rid] = i;
        });
        availableRooms.value = Array.from(ids).map(rid => ({
          roomId: rid,
          name: `Sala ${rid.slice(0, 8)}`,
          playerCount: aggEvents.filter((e: any) => e?.roomId === rid).length,
          _lastSeen: lastSeenIndex[rid] ?? -1
        })).sort((a: any, b: any) => (a._lastSeen - b._lastSeen)).map(({ _lastSeen, ...rest }: any) => rest);
      }


    } finally {
      loading.value = false;
    }
  };
  esActions.value.onerror = () => {};
}







onMounted(() => {
  setupStreams();
  
  // Initialize default time range for filter state
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatLocal = (dt: Date) => {
    const y = dt.getFullYear();
    const m = pad(dt.getMonth() + 1);
    const d = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mm = pad(dt.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };
  filterState.value.rangeFrom = formatLocal(from);
  filterState.value.rangeTo = formatLocal(now);
});

onUnmounted(() => {
  closeStreams();
});


// Removed totals table and sorting; keep actions stream for per-player counts only
// Deprecated: previously used to show a totals list; now unused
// const allPlayersActions = ref<{ uuid: string; name: string; total: number }[]>([]);



</script>

<style scoped>
/* Light theme aligned with other pages (UUID selector, lobby, game) */
.leaderboard.light { min-height: 100vh; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#0f172a; display:flex; flex-direction:column; }

.glass.light { background: rgba(255, 255, 255, 0.92); border: 1px solid rgba(229, 231, 235, 0.95); box-shadow: 0 18px 50px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.75); backdrop-filter: blur(18px) saturate(120%); -webkit-backdrop-filter: blur(18px) saturate(120%); border-radius: 16px; }

.header { display:flex; flex-direction: column; gap: 6px; padding: 8px 10px; margin-bottom: 10px; }
.header-row { display:flex; align-items:center; justify-content:space-between; gap: 8px; flex-wrap: nowrap; }
.header h1 { margin: 0; font-size: 18px; line-height: 1.2; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 8px; }
.header-left { display:flex; align-items:center; gap: 10px; flex: 1 1 auto; min-width: 0; }
.btn-back { background:#667eea; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-weight:600; cursor:pointer; transition: all 0.3s ease; font-size: 12px; }
.btn-back:hover { background:#5b6bda; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); }
.actions { display:flex; gap: 6px; flex-wrap: nowrap; align-items: center; justify-content: flex-end; flex: 0 0 auto; }
.actions .btn { background:#667eea; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-weight:800; font-size: 11px; cursor:pointer; }
.actions .btn.toggle { background:#eef2ff; color:#3949ab; border:1px solid #c7d2fe; }
.actions .btn.toggle.active { background:#3949ab; color:#fff; border-color:#2e3f9a; }

.controls { display:grid; grid-template-columns: 1fr; gap: 10px; padding: 10px 12px; margin-bottom: 14px; }
.divider { border: 0; border-top: 1px solid rgba(203,213,225,0.6); margin: 6px 0; }
.legend { font-size: 13px; color:#334155; display:flex; align-items:center; gap:10px; }
.key { width: 12px; height: 12px; border-radius: 999px; display:inline-block; }
.key.global { background: linear-gradient(90deg, #34d399, #10b981); box-shadow: 0 0 8px rgba(16,185,129,0.35); }
.key.player { background: linear-gradient(90deg, #a78bfa, #6366f1); box-shadow: 0 0 8px rgba(99,102,241,0.35); }
.key.room { background: linear-gradient(90deg, #f59e0b, #d97706); box-shadow: 0 0 8px rgba(245,158,11,0.35); }
.key.round { background: linear-gradient(90deg, #06b6d4, #0891b2); box-shadow: 0 0 8px rgba(8,145,178,0.35); }
.key.game { background: linear-gradient(90deg, #ec4899, #8b5cf6); box-shadow: 0 0 8px rgba(236,72,153,0.35); }
.sep { opacity: 0.6; }

.player-chips, .room-chips { 
  display: flex; 
  flex-direction: column;
  gap: 12px;
}

.room-chips {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(203, 213, 225, 0.5);
}

/* Room slice controls */
.room-slice { margin-top: 10px; padding-top: 12px; border-top: 1px solid rgba(203,213,225,0.5); display: flex; flex-direction: column; gap: 10px; }
.slice-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.slice-info { display: flex; align-items: center; gap: 10px; color: #334155; font-weight: 600; }
.slice-summary { color: #475569; font-weight: 700; }

/* Dual range slider */
.dual-slider { position: relative; height: 36px; padding: 16px 8px; }
.dual-slider .track { position: absolute; left: 8px; right: 8px; top: 50%; height: 8px; transform: translateY(-50%); border-radius: 999px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); box-shadow: inset 0 1px 2px rgba(0,0,0,0.06); }
.dual-slider .highlight { position: absolute; top: 50%; height: 8px; transform: translateY(-50%); border-radius: 999px; background: linear-gradient(90deg, #06b6d4, #8b5cf6); box-shadow: 0 2px 8px rgba(139,92,246,0.25); }
.dual-slider .range { -webkit-appearance: none; appearance: none; position: absolute; left: 0; right: 0; top: 0; bottom: 0; background: transparent; pointer-events: none; }
.dual-slider .range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #8b5cf6; border-radius: 50%; box-shadow: 0 4px 12px rgba(139,92,246,0.3); pointer-events: auto; cursor: pointer; }
.dual-slider .range::-moz-range-thumb { width: 22px; height: 22px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #8b5cf6; border-radius: 50%; box-shadow: 0 4px 12px rgba(139,92,246,0.3); pointer-events: auto; cursor: pointer; }
.dual-slider .range::-ms-thumb { width: 22px; height: 22px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #8b5cf6; border-radius: 50%; box-shadow: 0 4px 12px rgba(139,92,246,0.3); pointer-events: auto; cursor: pointer; }
.dual-slider .range.start { z-index: 2; }
.dual-slider .range.end { z-index: 3; }


@media (max-width: 640px) {
  .dual-slider { height: 32px; padding: 14px 6px; }
  .dual-slider .track, .dual-slider .highlight { height: 6px; }
  .dual-slider .range::-webkit-slider-thumb, .dual-slider .range::-moz-range-thumb { width: 18px; height: 18px; }
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
.player-chips.compact .search { padding: 6px 8px; min-width: 180px; font-size: 12px; }
.player-chips.compact .chip { padding: 6px 10px; font-size: 12px; }
.player-chips.compact .avatar { width: 20px; height: 20px; font-size: 12px; }
.player-chips.compact .pagination.compact { padding: 3px 6px; }
.filters-indicators .chip-x { background: transparent; border: none; color: #64748b; margin-left: 6px; cursor: pointer; font-weight: 900; }
.secondary-filters { margin: 6px 0 4px; }
.chip { display:flex; align-items:center; gap:8px; background: color-mix(in srgb, var(--primary) 6%, white); border:1px solid color-mix(in srgb, var(--primary) 24%, #e5e7eb); padding:8px 12px; border-radius: 999px; color:#111827; cursor:pointer; transition: transform .18s ease, background .18s ease, box-shadow .18s ease; }
.chip:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--primary) 10%, white); box-shadow: 0 6px 18px rgba(102,126,234,0.18); }
.chip.active { background: color-mix(in srgb, var(--primary) 18%, white); border-color: color-mix(in srgb, var(--primary) 45%, #c7d2fe); box-shadow: 0 6px 22px rgba(99,102,241,0.22); }
.chip.clear { background:#fff; border-style:dashed; color:#334155; }
.chip.room-chip { --primary: #f59e0b; }
.chip.room-chip .count { 
  background: color-mix(in srgb, var(--primary) 20%, white); 
  color: color-mix(in srgb, var(--primary) 80%, #111); 
  font-size: 11px; 
  font-weight: 800; 
  padding: 2px 6px; 
  border-radius: 10px; 
  margin-left: 4px; 
}
.avatar { width: 24px; height: 24px; border-radius: 50%; background: color-mix(in srgb, var(--primary) 25%, #eef2ff); display:grid; place-items:center; font-weight:900; color: color-mix(in srgb, var(--primary) 80%, #111); }



/* Pagination styles */
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

.pg-btn.compact:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(102,126,234,0.3);
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

/* Compact filter indicators */
.filters-indicators { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; padding: 4px 0; margin: 6px 0 0; }
.marker-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 4px; border-radius: 999px; border: none; background: transparent; color: #334155; font-size: 12px; font-weight: 700; }
.marker-chip.clickable { cursor: pointer; }


/* Time indicator key */
.key.time { background: linear-gradient(90deg, #f59e0b, #d97706); box-shadow: 0 0 8px rgba(245,158,11,0.35); }


/* Filters section styles */
.filters-section {
  transition: all 0.3s ease;
}

.btn-collapse { 
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: none;
  border-radius: 6px;
  background: #eef2ff;
  color: #3949ab;
  border: 1px solid #c7d2fe;
  font-weight: 800;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-collapse:hover {
  background: rgba(255,255,255,0.9);
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.collapse-icon { transition: transform 0.3s ease; font-size: 11px; }

.collapse-icon.rotated {
  transform: rotate(-90deg);
}

.filters-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Transition for filters */
.filters-slide-enter-active,
.filters-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.filters-slide-enter-from,
.filters-slide-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-20px);
}

.filters-slide-enter-to,
.filters-slide-leave-from {
  opacity: 1;
  max-height: 200px;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .header { padding: 6px 8px; margin-bottom: 8px; }
  .header h1 { font-size: 16px; }
  .btn-back { padding: 5px 8px; font-size: 11px; border-radius: 6px; }
  .actions { gap: 6px; flex-wrap: nowrap; }
  .actions .btn { padding: 4px 6px; font-size: 10px; border-radius: 5px; }
  .header-row { flex-wrap: nowrap; }

  
  .search {
    min-width: auto;
    max-width: none;
  }
  
  .pagination.compact {
    align-self: center;
  }
}

@media (max-width: 640px) {
  .header { gap: 4px; }
  .header-row { flex-wrap: nowrap; }
  .header-left { min-width: 120px; }
  .actions { justify-content: flex-start; flex-wrap: nowrap; }
  .btn-collapse .collapse-text {
    display: none;
  }
  
  .btn-collapse {
    padding: 4px 6px;
    min-width: 34px;
    justify-content: center;
    font-size: 10px;
    border-radius: 5px;
  }
}

@media (max-width: 480px) {
  .header h1 { font-size: 14px; }
  .btn-back { padding: 4px 6px; font-size: 10px; }
  .actions { gap: 4px; }
  .actions .btn { padding: 3px 5px; font-size: 9px; border-radius: 4px; }
  .btn-collapse { padding: 3px 5px; min-width: 30px; font-size: 9px; border-radius: 4px; }
  /* Ultra-compact: single-line header on very small screens */
  .header { flex-wrap: nowrap; padding: 4px 6px; }
  .header-left { flex: 0 1 auto; }
  .btn-back .label { display: none; }
  .actions .btn .label { display: none; }
  .header h1 { font-size: 13px; }
  .header h1 .emoji { display: none; }
  .player-chips {
    gap: 8px;
  }
  
  .chips {
    gap: 8px;
    justify-content: center;
  }
  
  .chip {
    padding: 6px 10px;
  }
  
  .pg-btn.compact {
    width: 20px;
    height: 20px;
    font-size: 12px;
  }
  
  .pg-ind {
    font-size: 11px;
    min-width: 30px;
  }
}

</style>
