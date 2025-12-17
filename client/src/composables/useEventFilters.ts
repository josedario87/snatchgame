import { ref, computed } from 'vue';

export interface DetailedEvent {
  kind: string;
  round?: number;
  gameVariant?: string;
  playerUuid?: string;
  playerName?: string;
  roomId?: string;
}

export type DataSource = 'aggregated' | 'active-rooms';
export type RoundFilterMulti = number[]; // empty means all
export type GameFilterMulti = string[];  // empty means all
export type RoomFilterMulti = string[];  // empty means all

export function useEventFilters() {
  // Filter states
  const dataSource = ref<DataSource>('aggregated');
  const roundFilter = ref<RoundFilterMulti>([]);
  const gameFilter = ref<GameFilterMulti>([]);
  const roomFilter = ref<RoomFilterMulti>([]);

  // Event data stores
  const detailedEventsAggregated = ref<DetailedEvent[]>([]);
  const detailedEventsActiveRooms = ref<DetailedEvent[]>([]);
  
  // Global event counts
  const globalEventCounts = ref<Record<string, number>>({});
  const globalEventCountsAggregated = ref<Record<string, number>>({});
  const globalEventCountsActiveRooms = ref<Record<string, number>>({});

  // Function to apply filters and recalculate counts
  function applyFilters(eventTypes: string[]) {
    const sourceEvents = dataSource.value === 'aggregated' 
      ? detailedEventsAggregated.value 
      : detailedEventsActiveRooms.value;
    
    // Filter events based on round, game, and room
    const filteredEvents = sourceEvents.filter(event => {
      if (roundFilter.value.length && !roundFilter.value.includes(Number(event.round))) {
        return false;
      }
      if (gameFilter.value.length && !gameFilter.value.includes(String(event.gameVariant))) {
        return false;
      }
      if (roomFilter.value.length && !roomFilter.value.includes(String(event.roomId))) {
        return false;
      }
      return true;
    });
    
    // Recalculate counts from filtered events
    const counts: Record<string, number> = Object.fromEntries(eventTypes.map(k => [k, 0]));
    filteredEvents.forEach(event => {
      if (eventTypes.includes(event.kind)) {
        counts[event.kind] = (counts[event.kind] || 0) + 1;
      }
    });
    
    globalEventCounts.value = counts;
  }

  // Update aggregated data
  function updateAggregatedData(events: DetailedEvent[], counts: Record<string, number>) {
    detailedEventsAggregated.value = events;
    globalEventCountsAggregated.value = counts;
  }

  // Update active rooms data
  function updateActiveRoomsData(events: DetailedEvent[], counts: Record<string, number>) {
    detailedEventsActiveRooms.value = events;
    globalEventCountsActiveRooms.value = counts;
  }

  // Reset filters
  function resetFilters() {
    roundFilter.value = [];
    gameFilter.value = [];
    roomFilter.value = [];
  }

  // Computed properties
  const currentSourceEvents = computed(() => 
    dataSource.value === 'aggregated' ? detailedEventsAggregated.value : detailedEventsActiveRooms.value
  );

  const currentSourceCounts = computed(() => 
    dataSource.value === 'aggregated' ? globalEventCountsAggregated.value : globalEventCountsActiveRooms.value
  );

  const hasActiveFilters = computed(() => 
    roundFilter.value.length > 0 || gameFilter.value.length > 0 || roomFilter.value.length > 0
  );

  const filterSummary = computed(() => {
    const parts = [];
    if (roundFilter.value.length) parts.push(`Round ${roundFilter.value.join(',')}`);
    if (gameFilter.value.length) parts.push(`Game ${gameFilter.value.join(',')}`);
    if (roomFilter.value.length) parts.push(`Rooms ${roomFilter.value.length}`);
    return parts.length > 0 ? parts.join(' + ') : 'Sin filtros';
  });

  return {
    // State
    dataSource,
    roundFilter,
    gameFilter,
    roomFilter,
    detailedEventsAggregated,
    detailedEventsActiveRooms,
    globalEventCounts,
    globalEventCountsAggregated,
    globalEventCountsActiveRooms,
    
    // Methods
    applyFilters,
    updateAggregatedData,
    updateActiveRoomsData,
    resetFilters,
    
    // Computed
    currentSourceEvents,
    currentSourceCounts,
    hasActiveFilters,
    filterSummary
  };
}
