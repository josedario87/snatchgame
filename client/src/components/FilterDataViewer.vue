<template>
  <div class="data-viewer glass light">
    <div class="viewer-header">
      <div class="tab-selector">
        <button 
          v-for="tab in dataTabs" 
          :key="tab.id"
          class="tab-btn" 
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
      <div class="viewer-actions">
        <button class="action-btn" @click="expanded = !expanded">
          {{ expanded ? '▼ Minimizar' : '▲ Expandir' }}
        </button>
        <button class="action-btn" @click="copyCurrentTab" title="Copiar JSON">
          📋 Copiar
        </button>
      </div>
    </div>
    
    <Transition name="slide">
      <div v-show="expanded" class="viewer-content">
        <pre class="data-pre">{{ currentTabData }}</pre>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  rawData?: any;
  filterState?: any;
  filteredData?: any;
}

const props = defineProps<Props>();

// Data viewer state
const activeTab = ref<'raw' | 'filters' | 'filtered'>('raw');
const expanded = ref(false);

const dataTabs = [
  { id: 'raw' as const, label: 'Raw Data', icon: '📊' },
  { id: 'filters' as const, label: 'Filter State', icon: '🔧' },
  { id: 'filtered' as const, label: 'Datos Filtrados', icon: '✨' }
];

const currentTabData = computed(() => {
  try {
    switch (activeTab.value) {
      case 'raw':
        return JSON.stringify(props.rawData || {}, null, 2);
      case 'filters':
        return JSON.stringify(props.filterState || {}, null, 2);
      case 'filtered':
        return JSON.stringify(props.filteredData || {}, null, 2);
      default:
        return '{}';
    }
  } catch (e) {
    return `Error: ${e}`;
  }
});

function copyCurrentTab() {
  try {
    navigator.clipboard.writeText(currentTabData.value);
  } catch (e) {
    console.error('Error copying to clipboard:', e);
  }
}
</script>

<style scoped>
/* Data Viewer Styles */
.data-viewer {
  margin-top: 20px;
  padding: 16px;
  border-radius: 16px;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}

.tab-selector {
  display: flex;
  gap: 4px;
  background: rgba(148, 163, 184, 0.1);
  padding: 3px;
  border-radius: 10px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.5);
  color: #334155;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.viewer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.8);
  color: #334155;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.viewer-content {
  overflow: hidden;
}

.data-pre {
  background: #0b1020;
  color: #e5e7eb;
  padding: 16px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid #1f2937;
  max-height: 400px;
  overflow: auto;
  margin: 0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
}

/* Scrollbar styling for data-pre */
.data-pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.data-pre::-webkit-scrollbar-track {
  background: #1a1f2e;
  border-radius: 4px;
}

.data-pre::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 4px;
}

.data-pre::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to {
  max-height: 420px;
  opacity: 1;
}

.slide-leave-from {
  max-height: 420px;
  opacity: 1;
}

.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (max-width: 768px) {
  .viewer-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tab-selector {
    width: 100%;
    overflow-x: auto;
  }
  
  .viewer-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .data-pre {
    font-size: 11px;
    max-height: 300px;
  }
}
</style>