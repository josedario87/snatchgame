<template>
  <div class="actions-container">
    <div class="section-header">
      <h2>📥 Export / Tools</h2>
    </div>
    <div class="buttons">
      <button class="btn btn-export" @click="downloadCsvByRoom">Descargar por sala (CSV)</button>
      <button class="btn btn-export alt" @click="downloadCsvByUuid">Descargar por UUID (CSV)</button>
      <button class="btn btn-save" @click="downloadNameManagerState">💾 Descargar Estado (.snatchSave)</button>
      <div class="upload-container">
        <input 
          ref="fileInput" 
          type="file" 
          accept=".snatchSave" 
          @change="handleFileUpload" 
          style="display: none"
        />
        <button class="btn btn-load" @click="triggerFileUpload">📂 Cargar Estado (.snatchSave)</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

interface PlayerRow {
  sessionId: string;
  uuid?: string;
  name: string;
  role: 'P1' | 'P2' | '';
  pavoTokens?: number;
  eloteTokens?: number;
  shameTokens?: number;
  color?: string;
}

interface RoomDetail {
  roomId: string;
  players?: PlayerRow[];
  gameStatus?: string;
  variant?: string;
  round?: number;
  systemMessages?: Array<{ text: string; kind: string; timestamp: number }>;
}

const props = defineProps<{ rooms: any[]; roomDetails: { [key: string]: RoomDetail } }>();

const fileInput = ref<HTMLInputElement>();
const gameRooms = computed(() => props.rooms.filter(r => r.name === 'game'));

function csvEscape(v: any): string {
  const s = String(v ?? '').replace(/\r?\n/g, ' ');
  if (/[",]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function buildCsvByRoom(): string {
  const headers = [
    'roomId', 'variant', 'round', 'status',
    'p1_uuid', 'p1_name', 'p1_pavo', 'p1_elote', 'p1_shame',
    'p2_uuid', 'p2_name', 'p2_pavo', 'p2_elote', 'p2_shame',
    'events_history'
  ];
  const lines: string[] = [headers.join(',')];

  gameRooms.value.forEach(room => {
    const det = (props.roomDetails[room.roomId] || {}) as any;
    const status = det.gameStatus || room?.metadata?.gameStatus || 'waiting';
    const variant = det.variant || room?.metadata?.currentVariant || 'G1';
    const round = det.round || room?.metadata?.currentRound || 1;
    const players = (det.players || []) as PlayerRow[];
    const p1 = players.find(p => p.role === 'P1') || players[0] || ({} as any);
    const p2 = players.find(p => p.role === 'P2') || players[1] || ({} as any);

    const kinds = ((det.systemMessages || []) as Array<{ kind: string }>).map(m => (m?.kind || '').toString()).filter(Boolean);
    const eventsHistory = kinds.join('|');

    const row = [
      room.roomId,
      variant,
      round,
      status,
      p1?.uuid || '',
      p1?.name || '',
      p1?.pavoTokens ?? 0,
      p1?.eloteTokens ?? 0,
      p1?.shameTokens ?? 0,
      p2?.uuid || '',
      p2?.name || '',
      p2?.pavoTokens ?? 0,
      p2?.eloteTokens ?? 0,
      p2?.shameTokens ?? 0,
      eventsHistory
    ].map(csvEscape).join(',');
    lines.push(row);
  });

  return lines.join('\n') + '\n';
}

async function buildCsvByUuid(): Promise<string> {
  const headers = [
    'roomId', 'variant', 'round', 'status',
    'uuid', 'name', 'role', 'pavo', 'elote', 'shame', 'events_made'
  ];
  const lines: string[] = [headers.join(',')];

  const apiBase = (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
  const historyCache = new Map<string, any[]>();

  for (const room of gameRooms.value) {
    const det = (props.roomDetails[room.roomId] || {}) as any;
    const status = det.gameStatus || room?.metadata?.gameStatus || 'waiting';
    const variant = det.variant || room?.metadata?.currentVariant || 'G1';
    const round = det.round || room?.metadata?.currentRound || 1;
    const players = (det.players || []) as PlayerRow[];

    for (const p of players) {
      const uuid = (p?.uuid || '').toString();
      let history = uuid ? historyCache.get(uuid) : [];
      if (uuid && !history) {
        try {
          const resp = await fetch(`${apiBase}/players/${uuid}/history`);
          const data = await resp.json();
          history = Array.isArray(data?.history) ? data.history : [];
        } catch {
          history = [];
        }
        historyCache.set(uuid, (history as any));
      }

      // Build events_made generically:
      // - If kind starts with p1_ or p2_, include only when event.role matches P1/P2
      // - Otherwise include by default (system/agnostic events)
      const events = (history ?? []).filter((h: any) => {
        const kind = (h?.kind || '').toString();
        if (!kind) return false;
        const evRole = kind.startsWith('p1_') ? 'P1' : (kind.startsWith('p2_') ? 'P2' : null);
        if (!evRole) return true; // role-agnostic
        const r = ((h?.role || '') as string).toUpperCase();
        return r === evRole;
      }).map((h: any) => h.kind);

      const eventsHistory = events.join('|');
      const row = [
        room.roomId,
        variant,
        round,
        status,
        uuid,
        p?.name || '',
        p?.role || '',
        p?.pavoTokens ?? 0,
        p?.eloteTokens ?? 0,
        p?.shameTokens ?? 0,
        eventsHistory
      ].map(csvEscape).join(',');
      lines.push(row);
    }
  }

  return lines.join('\n') + '\n';
}


function triggerDownload(csv: string, suffix: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fname = `snatch-results-${suffix}-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCsvByRoom() { triggerDownload(buildCsvByRoom(), 'by-room'); }
async function downloadCsvByUuid() { const csv = await buildCsvByUuid(); triggerDownload(csv, 'by-uuid'); }

// NameManager save/load functions
async function downloadNameManagerState() {
  try {
    const apiBase = (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
    const response = await fetch(`${apiBase}/admin/namemanager/export`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch nameManager state: ${response.status}`);
    }
    
    const data = await response.json();
    const jsonString = JSON.stringify(data, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/x-snatchsave' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fileName = `namemanager-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.snatchSave`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error downloading nameManager state:', error);
    alert('Error al descargar el estado del nameManager');
  }
}

function triggerFileUpload() {
  fileInput.value?.click();
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  
  if (!file.name.endsWith('.snatchSave')) {
    alert('Por favor selecciona un archivo .snatchSave válido');
    return;
  }
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const apiBase = (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
    const response = await fetch(`${apiBase}/admin/namemanager/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload nameManager state: ${response.status}`);
    }
    
    const result = await response.json();
    const message = result.importedUuids 
      ? `Estado cargado exitosamente. ${result.importedUuids} UUIDs importados. ${result.message || ''}`
      : `Estado cargado exitosamente. ${result.message || 'NameManager actualizado.'}`;
    alert(message);
    
  } catch (error: any) {
    console.error('Error uploading nameManager state:', error);
    
    // Handle different error types
    if (error?.message && error.message.includes('413')) {
      alert('Error: El archivo es demasiado grande (máximo 50MB). Considera crear un archivo de guardado más pequeño.');
    } else if (error?.message && error.message.includes('400')) {
      alert('Error: Archivo inválido. Asegúrate de subir un archivo .snatchSave válido.');
    } else {
      alert('Error al cargar el estado del nameManager. Verifica que el archivo sea válido y la conexión sea estable.');
    }
  } finally {
    // Reset file input
    target.value = '';
  }
}

// Helper: import NameManager state from JSON text (used by PWA file handler)
async function importNameManagerFromText(text: string) {
  try {
    const data = JSON.parse(text);
    const apiBase = (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
    const response = await fetch(`${apiBase}/admin/namemanager/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to upload nameManager state: ${response.status}`);
    const result = await response.json();
    const message = result.importedUuids 
      ? `Estado cargado exitosamente. ${result.importedUuids} UUIDs importados. ${result.message || ''}`
      : `Estado cargado exitosamente. ${result.message || 'NameManager actualizado.'}`;
    alert(message);
  } catch (e) {
    alert('Error al procesar el archivo .snatchSave');
  }
}

// If PWA was launched with a .snatchSave file, auto-import here
onMounted(async () => {
  const pending = localStorage.getItem('snatch.pendingSnatchSave');
  if (pending) {
    localStorage.removeItem('snatch.pendingSnatchSave');
    await importNameManagerFromText(pending);
  }
});
</script>

<style scoped>
.actions-container { 
  margin-bottom: 24px; 
  background: rgba(255,255,255,0.1); 
  border-radius: 12px; 
  padding: 16px; 
}
.section-header { 
  display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; 
}
.section-header h2 { margin:0; font-size: 1.3rem; }
.buttons { display:flex; gap: 10px; flex-wrap: wrap; }
.btn { padding: 10px 14px; border:none; border-radius: 10px; font-weight:700; cursor:pointer; transition: all 0.3s ease; }
.btn-export { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color:white; }
.btn-export.alt { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.btn-export:hover { filter: brightness(1.05); }
.btn-save { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color:white; }
.btn-save:hover { filter: brightness(1.05); transform: translateY(-1px); }
.btn-load { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color:white; }
.btn-load:hover { filter: brightness(1.05); transform: translateY(-1px); }
.upload-container { position: relative; }
</style>
