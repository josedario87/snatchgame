<template>
  <div class="lobby">
    <div class="lobby-container">
      <div class="topbar">
        <div class="lobby-header">
          <button @click="goToSelector" class="btn btn-back">← UUIDs</button>
        </div>
        <!-- Install banner (sutil, inline con UUIDs) -->
        <div
          v-if="showInstallBanner"
          class="install-banner"
          role="status"
          aria-live="polite"
        >
          <div class="install-banner-content">
            <img class="install-icon" src="/pwa_icons/icon-72x72.png" alt="SnatchGame" />
            <div class="install-text">
              <strong>Instalá SnatchGame</strong>
              <span v-if="canPromptInstall">Acceso rápido desde tu pantalla de inicio.</span>
              <span v-else>iOS: Compartir → Añadir a pantalla de inicio.</span>
            </div>
          </div>
          <div class="install-actions">
            <button v-if="canPromptInstall" class="btn btn-install" @click="triggerInstall">Instalar</button>
            <button class="btn btn-dismiss" @click="dismissBanner" aria-label="Cerrar">✕</button>
          </div>
        </div>
      </div>
      <div class="hero">
        <div class="logo-row"><GameLogo size="large" /></div>
        <h1 class="title">Snatch Game</h1>
        <div class="subtitle">Arena de intercambio social</div>
      </div>

      <!-- Error notification for reconnection issues -->
      <div v-if="reconnectionError" class="error-notification">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-title">No se pudo reconectar a la partida</div>
          <div class="error-message">{{ reconnectionErrorMessage }}</div>
        </div>
        <button @click="dismissError" class="btn-dismiss-error">✕</button>
      </div>

      <div class="player-section">
        <!-- Estado inicial: solo nombre + color + stats (compacto en móvil) -->
        <div v-if="!nameConfirmed || editingName" class="setup-wrapper">
          <div class="name-input-group compact">
            <input
              ref="nameInputRef"
              v-model="inputName"
              @keyup.enter="updateName"
              type="text"
              placeholder="Ingresa tu nombre"
              class="name-input"
              maxlength="20"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              name="sg_player_name"
              inputmode="text"
            />
            <button @click="updateName" class="btn btn-secondary btn-compact">Confirmar</button>
          </div>
          <div class="color-picker">
            <label class="color-label">Color:</label>
            <input type="color" v-model="colorInput" @change="updateColor" class="color-input" />
          </div>
          <div class="preview">
            <PlayerStats :player="previewPlayer" :highlight="true" />
          </div>
        </div>

        <!-- Nombre confirmado: ocultar inputs, mostrar 'Jugando como' (clickable para editar) y CTA Jugar con glasmorphism -->
        <div v-else class="play-cta">
          <div
            class="current-name ready clickable"
            @click="startEditName"
            title="Editar nombre y color"
          >
            Jugando como: <span class="player-name">{{ playerName || 'invitado' }}</span><span class="edit-hint"> (✏️)</span>
          </div>
          <button
            @click="handleQuickPlay"
            class="btn btn-play glass"
            :style="({ '--accent': accentColor } as any)"
            :disabled="isJoining"
          >
            <span v-if="!isJoining">Jugar</span>
            <span v-else>Buscando partida...</span>
          </button>
        </div>
      </div>

      <AppCredits variant="inline" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import PlayerStats from './games/PlayerStats.vue';
import GameLogo from '../components/GameLogo.vue';
import AppCredits from '../components/AppCredits.vue';
import { useRouter, useRoute } from 'vue-router';
import { colyseusService } from '../services/colyseus';
import { getStateCallbacks } from 'colyseus.js';
// QR eliminado

const router = useRouter();
const route = useRoute();
const routeUuid = computed(() => (route.params as any)?.uuid as string || '');
const inputName = ref('');
const isJoining = ref(false);
const colorInput = ref('#667eea');

// Reconnection error state
const reconnectionError = ref(false);
const reconnectionErrorMessage = ref('');
const showInstallBanner = ref(false);
const canPromptInstall = ref(false);
let deferredPrompt: any = null;
let onBipHandler: ((e: any) => void) | null = null;
let installTimer: any = null;
const editingName = ref(false);
const nameInputRef = ref<HTMLInputElement | null>(null);

// QR eliminado

const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  // iOS
  (window as any).navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function maybeShowInstallBanner() {
  const dismissed = localStorage.getItem('sg_install_banner_dismissed') === '1';
  if (dismissed || isStandalone()) return;
  if (deferredPrompt) {
    canPromptInstall.value = true;
    showInstallBanner.value = true;
    if (installTimer) clearTimeout(installTimer);
    installTimer = setTimeout(() => {
      showInstallBanner.value = false;
    }, 10000);
  } else if (isIOS()) {
    canPromptInstall.value = false;
    showInstallBanner.value = true;
    if (installTimer) clearTimeout(installTimer);
    installTimer = setTimeout(() => {
      showInstallBanner.value = false;
    }, 12000);
  }
}

const playerName = computed(() => colyseusService.playerName.value);
const nameConfirmed = computed(() => colyseusService.nameConfirmed.value);
const playerColor = computed(() => colyseusService.playerColor.value);
const previewPlayer = computed(() => ({
  sessionId: 'preview',
  name: playerName.value || 'invitado',
  role: 'P1' as const,
  pavoTokens: 10,
  eloteTokens: 0,
  shameTokens: 0,
  color: colorInput.value || playerColor.value
}));

const accentColor = computed(() => playerColor.value || colorInput.value || '#667eea');

// Define missing reactive variables
const availableRooms = ref<any[]>([]);
const totalPlayers = ref(0);
const onlinePlayers = ref<any[]>([]);

onMounted(async () => {
  try {
    // install prompt listener
    onBipHandler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      maybeShowInstallBanner();
    };
    window.addEventListener('beforeinstallprompt', onBipHandler);

    const room = await colyseusService.joinLobby();
    colorInput.value = colyseusService.playerColor.value || '#667eea';
    // Mantener el input vacío por defecto; no precargar nombres previos

    let resumed = false;
    const guardResume = () => { if (resumed) return true; resumed = true; return false; };

    // Prefer reconnection token path to bypass locked rooms
    room.onMessage("resumeReconnection", async (data: any) => {
      if (guardResume()) return;
      try {
        await colyseusService.reconnectWithToken(data.token);
        // Leave lobby before navigating
        if (colyseusService.lobbyRoom.value) {
          colyseusService.lobbyRoom.value.leave();
          colyseusService.lobbyRoom.value = null;
        }
        await router.push(`/${routeUuid.value}/demo`);
      } catch (error: any) {
        console.error('Reconnection failed:', error);
        
        // Check if it's a reconnection token error
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('reconnection token invalid') || errorMessage.includes('expired')) {
          reconnectionError.value = true;
          reconnectionErrorMessage.value = 'Otro jugador ya está usando este UUID. Si eres tú en otro dispositivo, cierra esa sesión primero.';
        } else {
          reconnectionError.value = true;
          reconnectionErrorMessage.value = 'Error al reconectar: ' + errorMessage;
        }
      }
    });

    // Listen for server-initiated resume to existing game (fallback joinById)
    room.onMessage("resumeGame", async (data: any) => {
      if (guardResume()) return;
      const tryJoin = async (attempt = 1): Promise<void> => {
        try {
          await colyseusService.joinGameRoom(data.roomId);
          if (colyseusService.lobbyRoom.value) {
            colyseusService.lobbyRoom.value.leave();
            colyseusService.lobbyRoom.value = null;
          }
          await router.push(`/${routeUuid.value}/demo`);
        } catch (error: any) {
          const msg = String(error?.message || error);
          if (attempt < 3 && (msg.includes('locked') || msg.includes('full'))) {
            setTimeout(() => tryJoin(attempt + 1), 300);
            return;
          }
          console.error('Auto-join failed:', error);
          // allow future resume if this one failed entirely
          resumed = false;
        }
      };
      await tryJoin(1);
    });

    // Listen for shuffle redirect with complete player information
    room.onMessage("shuffleRedirect", async (data: any) => {
      if (guardResume()) return;
      console.log('[Lobby] Received shuffle redirect:', data);
      
      // Update player info before joining
      if (data.playerName) {
        colyseusService.playerName.value = data.playerName;
      }
      if (data.playerColor) {
        colyseusService.playerColor.value = data.playerColor;
      }
      
      const tryJoin = async (attempt = 1): Promise<void> => {
        try {
          // Join with shuffle flag to bypass normal restrictions
            await colyseusService.joinShuffledGameRoom(
            data.roomId, 
            data.role,
            data.playerName,
            data.playerColor
          );
          
          if (colyseusService.lobbyRoom.value) {
            colyseusService.lobbyRoom.value.leave();
            colyseusService.lobbyRoom.value = null;
          }
          await router.push(`/${routeUuid.value}/demo`);
        } catch (error: any) {
          if (attempt < 3) {
            setTimeout(() => tryJoin(attempt + 1), 500);
            return;
          }
          console.error('Shuffle join failed:', error);
          resumed = false;
        }
      };
      await tryJoin(1);
    });

    // After listeners are attached, ask server if we should resume (shuffle/currentRoom)
    try { room.send("resumeMe"); } catch {}

    // Keep color input synced with server-updated color
    watch(() => colyseusService.playerColor.value, (c) => {
      if (c && c !== colorInput.value) colorInput.value = c;
    });
    const $ = getStateCallbacks(room);
    
    $(room.state).listen("availableRooms", (value: any) => {
      availableRooms.value = value || [];
    });

    $(room.state).listen("totalPlayers", (value: number) => {
      totalPlayers.value = value;
    });

    $(room.state).players.onAdd((player: any) => {
      const exists = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
      if (!exists) {
        onlinePlayers.value.push({
          sessionId: player.sessionId,
          name: player.name,
          inGame: player.inGame,
          color: player.color
        });
      }

      $(player).listen("name", (value: string) => {
        const p = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
        if (p) p.name = value;
      });

      $(player).listen("inGame", (value: boolean) => {
        const p = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
        if (p) p.inGame = value;
      });

      $(player).listen("color", (value: string) => {
        const p = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
        if (p) p.color = value;
      });
    });

    $(room.state).players.onRemove((player: any) => {
      const index = onlinePlayers.value.findIndex(p => p.sessionId === player.sessionId);
      if (index !== -1) {
        onlinePlayers.value.splice(index, 1);
      }
    });

    // Show install banner if applicable (e.g., iOS or after BIP fired)
    maybeShowInstallBanner();
  } catch (error) {
    console.error('Failed to join lobby:', error);
  }
});

onUnmounted(() => {
  // Don't leave the current room - it might be a game room now
  console.log('Lobby component unmounting...');
  if (onBipHandler) window.removeEventListener('beforeinstallprompt', onBipHandler);
  if (installTimer) clearTimeout(installTimer);
});

async function updateName() {
  // Send even if empty; server will assign a default unique name when empty
  const name = inputName.value.trim();
  await colyseusService.setPlayerName(name);
  editingName.value = false;
}

async function updateColor() {
  const c = colorInput.value;
  await colyseusService.setPlayerColor(c);
}

async function handleQuickPlay() {
  if (!colyseusService.nameConfirmed.value) return;
  isJoining.value = true;
  console.log('Starting quickPlay...');
  try {
    const _gameRoom = await colyseusService.quickPlay();
    console.log('Game room joined. Full room object:', _gameRoom);
    
    // Leave the lobby room before navigating
    if (colyseusService.lobbyRoom.value) {
      console.log('Leaving lobby room...');
      colyseusService.lobbyRoom.value.leave();
      colyseusService.lobbyRoom.value = null;
    }
    
    console.log('Navigating to /:uuid/demo...');
    await router.push(`/${routeUuid.value}/demo`);
    console.log('Navigation complete');
  } catch (error) {
    console.error('Failed to join game:', error);
    isJoining.value = false;
  }
}



// QR eliminado

function goToSelector() {
  router.push('/');
}

function dismissError() {
  reconnectionError.value = false;
  reconnectionErrorMessage.value = '';
}

async function triggerInstall() {
  try {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismissBanner();
    }
    deferredPrompt = null;
  } catch {}
}

function dismissBanner() {
  showInstallBanner.value = false;
  localStorage.setItem('sg_install_banner_dismissed', '1');
  if (installTimer) clearTimeout(installTimer);
}

function startEditName() {
  editingName.value = true;
  inputName.value = '';
  nextTick(() => {
    nameInputRef.value?.focus();
  });
}
</script>

<style scoped>
.lobby {
  min-height: calc(var(--app-vh, 1vh) * 100);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lobby-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 800px;
  width: 100%;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.topbar { display:flex; align-items:center; gap: 8px; justify-content: space-between; margin-bottom: 10px; }
.topbar .install-banner { flex: 1; }

.install-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #f7f9ff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 12px;
}
.install-banner-content { display: flex; align-items: center; gap: 10px; }
.install-icon { width: 24px; height: 24px; border-radius: 6px; }
.install-text { display:flex; flex-direction: column; line-height: 1.1; }
.install-text strong { font-size: 14px; color: #334155; }
.install-text span { font-size: 12px; color: #64748b; }
.install-actions { display:flex; align-items:center; gap: 6px; }
.btn-install { background:#111; color:#fff; padding: 6px 10px; border-radius: 6px; font-size: 12px; }
.btn-dismiss { background: transparent; color:#64748b; padding: 4px 6px; font-size: 14px; }

.lobby-header {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
}

.btn-back {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  border-color: #94a3b8;
  transform: translateX(-2px);
}

@media (max-width: 640px) {
  .lobby-container {
    padding: 20px;
  }
  
  .lobby-header {
    margin-bottom: 15px;
  }
  
  .name-input {
    min-width: 100%;
  }
  
  .btn-secondary {
    min-width: 100px;
  }
}


.hero { display: flex; flex-direction: column; align-items: center; }
.logo-row { display: flex; justify-content: center; margin-top: 2px; margin-bottom: 2px; }
.title {
  font-size: 3rem;
  text-align: center;
  margin: 2px 0 0 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (max-width: 640px) {
  .title {
    font-size: 2rem;
  }
}

.subtitle {
  text-align: center;
  color: #666;
  margin-top: 2px;
  font-size: 1.2rem;
}

/* Error notification styles */
.error-notification {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  padding: 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid #fca5a5;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 700;
  color: #991b1b;
  margin-bottom: 4px;
}

.error-message {
  color: #dc2626;
  font-size: 14px;
  line-height: 1.4;
}

.btn-dismiss-error {
  background: none;
  border: none;
  font-size: 18px;
  color: #dc2626;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.btn-dismiss-error:hover {
  background: rgba(220, 38, 38, 0.1);
}

.player-section {
  margin: 30px 0;
  padding: 20px;
  border-radius: 10px;
}

.name-input-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.name-input {
  flex: 1;
  min-width: 200px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.name-input:focus {
  outline: none;
  border-color: #667eea;
}

.current-name {
  text-align: center;
  color: #666;
  font-size: 1.1rem;
}

.current-name.clickable { cursor: pointer; }
.current-name.clickable:hover .player-name { text-decoration: underline; }
.edit-hint { color: #94a3b8; font-size: 0.9rem; }

.player-name {
  color: #667eea;
  font-weight: bold;
}

.color-picker { display:flex; align-items:center; gap: 10px; margin: 12px 0 16px; }
.color-label { font-weight: 600; color:#444; margin-right: 6px; }
.color-input { width: 44px; height: 32px; padding: 0; border:1px solid #000; border-radius:8px; background: transparent; cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
.color-input::-webkit-color-swatch-wrapper { padding:2px; border-radius:8px; }
.color-input::-webkit-color-swatch { border: none; border-radius:6px; }
.color-input::-moz-color-swatch { border: none; border-radius:6px; }
.preview { margin-top: 8px; }

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #667eea;
  color: white;
}

.btn-secondary:hover {
  background: #5a67d8;
}

.btn-large {
  padding: 18px 36px;
  font-size: 20px;
}

.btn.tiny { padding: 6px 10px; font-size: 12px; }

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.main-actions {
  text-align: center;
  margin: 40px 0;
}

.main-actions.inline { margin: 12px 0; }

.rooms-section {
  margin: 40px 0;
}

.rooms-section h2 {
  color: #333;
  margin-bottom: 20px;
}

.no-rooms {
  text-align: center;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 10px;
  color: #666;
}

.rooms-list {
  display: grid;
  gap: 15px;
}

.room-card {
  padding: 15px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.room-card:hover {
  border-color: #667eea;
  transform: translateX(5px);
}

.room-info {
  display: flex;
  gap: 20px;
  align-items: center;
}

.room-id {
  font-weight: bold;
  color: #333;
}

.room-players {
  color: #666;
}

.room-status {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status-waiting {
  background: #e8f5e9;
  color: #4caf50;
}

.status-playing {
  background: #fff3e0;
  color: #ff9800;
}

.status-finished {
  background: #f3e5f5;
  color: #9c27b0;
}

.online-players {
  margin-top: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
}

.online-players h3 {
  color: #333;
  margin-bottom: 15px;
}

.players-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

/* Compact setup area */
.setup-wrapper { margin-top: 8px; }
.name-input-group.compact { display:flex; gap: 10px; align-items: center; }
.name-input-group.compact .name-input { flex: 1 1 auto; min-width: 0; }
.btn-compact { padding: 10px 14px; border-radius: 8px; }

/* Play CTA with glasmorphism and color glow */
.play-cta { display: flex; flex-direction: column; align-items: center; gap: 10px; margin: 28px 0; }
.current-name.ready { color: #475569; font-size: 1rem; }
.btn-play {
  position: relative;
  padding: 16px 32px;
  font-size: 22px;
  border-radius: 16px;
  color: #0f172a;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: none;
  overflow: hidden;
  min-width: 300px;
}
.btn-play.glass { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.btn-play::before {
  content: "";
  position: absolute;
  left: -22%;
  right: -22%;
  bottom: -50%;
  height: 160%;
  background:
    radial-gradient(70% 70% at 50% 100%, var(--accent, #667eea) 0%, var(--accent, #667eea) 42%, rgba(255,255,255,0) 85%);
  filter: blur(28px);
  opacity: 0.75;
  pointer-events: none;
}
.btn-play::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0; top: 0;
  background: linear-gradient(to top, var(--accent, #667eea) 0%, rgba(255,255,255,0) 55%);
  filter: blur(18px);
  opacity: 0.45;
  pointer-events: none;
}
.btn-play:hover { transform: translateY(-2px); box-shadow: none; }
.btn-play:disabled { opacity: 0.8; cursor: not-allowed; }

.player-tag {
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  font-size: 14px;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.player-tag.in-game {
  border-color: #667eea;
  background: #f5f7ff;
}

.status-dot {
  font-size: 12px;
}

.player-count {
  text-align: center;
  color: #666;
  font-size: 14px;
}

/* Additional guards and hints */
.room-card.disabled { opacity: 0.6; cursor: not-allowed; }
.hint { color:#666; font-size: 14px; margin-top: 10px; }
.hint.ok { color: #2e7d32; }

/* QR Code Section Styles */
.qr-section {
  margin: 40px 0;
}

.qr-section.compact { margin: 20px 0; }

.qr-section h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.qr-container {
  background: #f8f9fa;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  border: 2px solid #e0e0e0;
  transition: all 0.3s;
}

.qr-container.compact { padding: 8px; }

.qr-container:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.1);
}

.qr-header h3 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 1.4rem;
}

.uuid-display {
  font-family: monospace;
  color: #666;
  font-size: 14px;
margin: 0 0 20px 0;
}
.uuid-display.small { font-size: 11px; margin: 0; }

.qr-code-wrapper {
  display: inline-block;
  background: white;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.qr-canvas {
  display: block;
  border-radius: 8px;
}
.qr-canvas.small { image-rendering: pixelated; }

.qr-inline { display:flex; align-items:center; gap: 8px; justify-content:center; }
.qr-side { display:flex; flex-direction: column; gap: 6px; align-items: flex-start; }

.qr-footer {
  margin-top: 20px;
}

.url-display {
  font-size: 12px;
  color: #666;
  margin: 0 0 15px 0;
  word-break: break-all;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
.url-display.small { font-size: 11px; margin: 0; padding: 4px 6px; }

.qr-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.qr-actions.tight { gap: 6px; }

.btn-copy,
.btn-share {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
}

.btn-copy {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-copy:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(79, 172, 254, 0.3);
}

.btn-share {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-share:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(240, 147, 251, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .lobby {
    padding: 10px;
  }
  
  .lobby-container {
    padding: 20px;
    max-width: none;
    width: 100%;
    margin: 0;
  }

  /* Back button ultra-compact on mobile */
  .topbar { gap: 6px; margin-bottom: 6px; }
  .lobby-header { margin-bottom: 6px; }
  .btn-back { padding: 4px 8px; font-size: 12px; border-radius: 6px; }
  .btn-back:hover { transform: none; box-shadow: none; }

  /* Install banner: much more compact on mobile */
  .install-banner { padding: 6px 8px; gap: 8px; border-radius: 8px; }
  .install-banner-content { gap: 6px; }
  .install-icon { width: 18px; height: 18px; }
  .install-text strong { font-size: 12px; }
  .install-text span { font-size: 11px; }
  .install-actions { gap: 4px; }
  .btn-install { padding: 4px 8px; font-size: 11px; border-radius: 6px; }
  .btn-dismiss { padding: 2px 4px; font-size: 12px; }
  
  .qr-container { padding: 14px; }
  .qr-code-wrapper { padding: 10px; margin: 10px 0; }
  .qr-canvas.small { width: 100px !important; height: 100px !important; }
  
  .qr-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-copy,
  .btn-share {
    width: 100%;
    margin: 5px 0;
  }
  
  .url-display {
    font-size: 11px;
    padding: 6px 8px;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .main-actions {
    margin: 20px 0;
  }
  
  .btn-large {
    padding: 15px 20px;
    font-size: 18px;
    width: 100%;
  }

  /* Compact the setup area further on mobile */
  .name-input-group.compact { gap: 8px; }
  .name-input-group.compact .name-input { padding: 10px; font-size: 15px; }
  .btn-compact { padding: 10px 12px; font-size: 14px; }
  .color-picker { gap: 8px; margin-top: 8px; }
  .color-input { width: 38px; height: 28px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
  .preview { margin-top: 6px; }
  .play-cta .btn-play { width: 100%; max-width: 100%; min-width: 0; padding: 14px 20px; font-size: 20px; border-radius: 14px; }
}
</style>

<!-- Credits overlay -->
<AppCredits position="bottom-right" />
