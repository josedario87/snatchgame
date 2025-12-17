<template>
  <div class="uuid-selector-container">
    <div class="selector-card">
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
            <span v-if="canPromptInstall">Acceso desde tu pantalla de inicio.</span>
            <span v-else>iOS: Compartir → Añadir a inicio.</span>
          </div>
        </div>
        <div class="install-actions">
          <button v-if="canPromptInstall" class="btn-install" @click="triggerInstall">Instalar</button>
          <button class="btn-dismiss" @click="dismissBanner" aria-label="Cerrar">✕</button>
        </div>
      </div>
      <div class="header">
        <h1 class="title">
          <GameLogo size="large" /> Snatch Game
        </h1>
        <p class="subtitle">Selecciona tu UUID para continuar</p>
      </div>
      <!-- Acciones rápidas (arriba, estilo más sutil) -->
      <div class="quick-actions top">
        <button @click="selectRandom" class="qa-btn">
          🎲 Seleccionar Aleatorio
        </button>
        <button @click="goToDashboard" class="qa-btn">
          🎛️ Panel de Adminstración
        </button>
        <button @click="goToLeaderboard" class="qa-btn">
          📈 Estadísticas
        </button>
        <button @click="goToCredits" class="qa-btn">
          👨‍💻 Créditos
        </button>
      </div>

      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar UUID o nombre..."
          class="search-input"
          @input="filterUuids"
        />
        <span class="search-icon">🔍</span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Cargando UUIDs...</p>
      </div>

      <!-- Loaded Content -->
      <div v-else>
        <div class="uuids-grid">
          <div
            v-for="(uuidInfo, index) in filteredUuids"
            :key="uuidInfo.uuid"
            class="uuid-card"
            :class="{ 
              'has-name': uuidInfo.hasName, 
              'has-color': !!uuidInfo.color,
              'has-shame': uuidInfo.shameTokens && uuidInfo.shameTokens > 0
            }"
            @click="selectUuid(uuidInfo.uuid)"
            @contextmenu.prevent="showContextMenu($event, uuidInfo)"
            :style="{ 
              animationDelay: `${index * 0.02}s`,
              '--player-color': uuidInfo.color || '#667eea'
            }"
          >
            <div v-if="uuidInfo.shameTokens && uuidInfo.shameTokens > 0" class="shame-indicator" :title="`Vergüenza: ${uuidInfo.shameTokens}`">
              <span class="shame-icon">😶</span>
              <span v-if="uuidInfo.shameTokens > 1" class="shame-count">{{ uuidInfo.shameTokens }}</span>
            </div>
            <div class="uuid-number" :style="uuidInfo.color ? { color: uuidInfo.color } : {}">
              {{ getUuidIndex(uuidInfo.uuid) }}
            </div>
            <div v-if="uuidInfo.name" class="player-name">{{ uuidInfo.name }}</div>
            <div class="uuid-text">{{ formatUuid(uuidInfo.uuid) }}</div>
            <div v-if="uuidInfo.color" class="color-indicator" :style="{ background: uuidInfo.color }"></div>
          </div>
        </div>

        <!-- QR Mode Toggle -->
        <div class="qr-mode-container">
          <label class="qr-mode-label">
            <input type="checkbox" v-model="qrMode" class="qr-mode-checkbox" />
            <span class="qr-toggle" aria-hidden="true"></span>
            <span class="qr-mode-text">
              {{ qrMode ? '📱 Modo QR activo - Click para ver código' : '🔓 Activar modo QR para acceso rápido' }}
            </span>
          </label>
        </div>

        <!-- Credits (component inline) -->
        <AppCredits variant="inline" />
      </div>
      
      <!-- Context Menu -->
      <div 
        v-if="contextMenu.visible" 
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click="contextMenu.visible = false"
      >
        <div class="context-menu-item" @click="printQR(contextMenu.uuid)">
          🖨️ Imprimir QR
        </div>
      </div>
      
      <!-- QR Print Modal -->
      <div v-if="printModal.visible" class="print-modal-overlay" @click="closePrintModal">
        <div class="print-modal-content" @click.stop>
          <button class="close-button" @click="closePrintModal">✕</button>
          <div class="print-container" ref="printContainer">
            <div class="qr-print-page">
              <div class="qr-header">
                <div class="header-title">
                  <img src="/SnatchGame.png?v=2" alt="SnatchGame" class="qr-logo" />
                  <h2>SnatchGame</h2>
                </div>
                <p class="player-info">{{ printModal.name || 'Jugador' }}</p>
              </div>
              <div class="qr-code-container">
                <canvas ref="qrCanvas"></canvas>
              </div>
              <div class="qr-footer">
                <p class="uuid-display">UUID: {{ printModal.uuidShort }}</p>
                <p class="url-display">{{ printModal.url }}</p>
                <div class="instructions">
                  <p>📱 Escanea este código QR</p>
                  <p>para acceder al juego</p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-buttons">
            <button class="btn-download" @click="downloadPNG">📥 Descargar PNG</button>
            <button class="btn-share" @click="shareQR">📤 Compartir</button>
            <button class="btn-print" @click="executePrint">🖨️ Imprimir</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import GameLogo from '../components/GameLogo.vue';
import AppCredits from '../components/AppCredits.vue';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

interface UuidInfo {
  uuid: string;
  name: string | null;
  hasName: boolean;
  color?: string | null;
  shameTokens?: number;
}

const router = useRouter();
const loading = ref(true);
const allUuids = ref<UuidInfo[]>([]);
const searchQuery = ref('');
const filteredUuids = ref<UuidInfo[]>([]);
const qrMode = ref(false);
const qrCanvas = ref<HTMLCanvasElement>();
const printContainer = ref<HTMLElement>();

// Detect PWA standalone mode
function isStandalone(): boolean {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    // iOS standalone
    (window as any).navigator?.standalone === true
  );
}

// Install banner state and logic
const showInstallBanner = ref(false);
const canPromptInstall = ref(false);
let deferredPrompt: any = null;
let onBipHandler: ((e: any) => void) | null = null;
let installTimer: any = null;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function maybeShowInstallBanner() {
  const dismissed = localStorage.getItem('sg_install_banner_dismissed') === '1';
  if (dismissed || isStandalone()) return;
  if (deferredPrompt) {
    canPromptInstall.value = true;
    showInstallBanner.value = true;
    if (installTimer) clearTimeout(installTimer);
    installTimer = setTimeout(() => { showInstallBanner.value = false; }, 10000);
  } else if (isIOS()) {
    canPromptInstall.value = false;
    showInstallBanner.value = true;
    if (installTimer) clearTimeout(installTimer);
    installTimer = setTimeout(() => { showInstallBanner.value = false; }, 12000);
  }
}

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  uuid: null as UuidInfo | null
});

// Print modal state
const printModal = ref({
  visible: false,
  uuid: '',
  name: '',
  uuidShort: '',
  url: ''
});

onMounted(async () => {
  try {
    // Install prompt listener (Android/Chrome)
    onBipHandler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      maybeShowInstallBanner();
    };
    window.addEventListener('beforeinstallprompt', onBipHandler);
    console.log('Loading UUIDs with names...');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/uuids-with-names`);
    
    if (!response.ok) {
      console.warn('Failed to fetch uuids-with-names, trying fallback...');
      // Fallback to regular UUIDs endpoint
      const fallbackResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/uuids`);
      const fallbackData = await fallbackResponse.json();
      allUuids.value = (fallbackData.uuids || []).map((uuid: string) => ({
        uuid,
        name: null,
        hasName: false
      }));
    } else {
      const data = await response.json();
      allUuids.value = data.uuids || [];
    }
    
    filteredUuids.value = allUuids.value;
    console.log(`Loaded ${allUuids.value.length} UUIDs`);
  } catch (error) {
    console.error('Failed to load UUIDs:', error);
    allUuids.value = [];
  } finally {
    loading.value = false;
  }
  // Show banner if applicable (iOS or after BIP fires)
  maybeShowInstallBanner();
});

onUnmounted(() => {
  if (onBipHandler) window.removeEventListener('beforeinstallprompt', onBipHandler);
  if (installTimer) clearTimeout(installTimer);
});

async function triggerInstall() {
  try {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    showInstallBanner.value = false;
  } catch {}
}

function dismissBanner() {
  showInstallBanner.value = false;
  localStorage.setItem('sg_install_banner_dismissed', '1');
  if (installTimer) clearTimeout(installTimer);
}

function filterUuids() {
  const query = searchQuery.value.toLowerCase();
  if (!query) {
    filteredUuids.value = allUuids.value; // Show all when no search
    return;
  }

  filteredUuids.value = allUuids.value.filter(uuidInfo => 
    uuidInfo.uuid.toLowerCase().includes(query) || 
    (uuidInfo.name && uuidInfo.name.toLowerCase().includes(query)) ||
    getUuidIndex(uuidInfo.uuid).toString().includes(query)
  );
}

function getUuidIndex(uuid: string): number {
  return allUuids.value.findIndex(u => u.uuid === uuid) + 1;
}

function formatUuid(uuid: string): string {
  // Show first 8 chars for better readability
  return uuid.substring(0, 8) + '...';
}

function selectUuid(uuid: string) {
  if (qrMode.value) {
    // Find the UUID info and show QR modal
    const uuidInfo = allUuids.value.find(u => u.uuid === uuid);
    if (uuidInfo) {
      printQR(uuidInfo);
    }
  } else {
    if (isStandalone()) {
      // En PWA, navegar usando ruta nombrada para mayor robustez
      router.push({ name: 'LobbyWithUuid', params: { uuid } });
    } else {
      const url = `${window.location.origin}/${uuid}`;
      window.open(url, '_blank');
    }
  }
}

function selectRandom() {
  if (allUuids.value.length > 0) {
    const randomUuidInfo = allUuids.value[Math.floor(Math.random() * allUuids.value.length)];
    if (qrMode.value) {
      // Show QR modal if in QR mode
      printQR(randomUuidInfo);
    } else {
      const uuid = randomUuidInfo.uuid;
      if (isStandalone()) {
        router.push({ name: 'LobbyWithUuid', params: { uuid } });
      } else {
        const url = `${window.location.origin}/${uuid}`;
        window.open(url, '_blank');
      }
    }
  }
}

function goToDashboard() {
  router.push('/dashboard');
}

function goToLeaderboard() {
  router.push('/leaderboard');
}

function goToCredits() {
  router.push('/credits');
}

// Context menu functions
function showContextMenu(event: MouseEvent, uuidInfo: UuidInfo) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    uuid: uuidInfo
  };
}

// Hide context menu when clicking elsewhere
document.addEventListener('click', () => {
  contextMenu.value.visible = false;
});

// QR Print functions
async function printQR(uuidInfo: UuidInfo | null) {
  if (!uuidInfo) return;
  
  contextMenu.value.visible = false;
  
  // Get the base URL (production or development)
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}/${uuidInfo.uuid}`;
  
  printModal.value = {
    visible: true,
    uuid: uuidInfo.uuid,
    name: uuidInfo.name || '',
    uuidShort: uuidInfo.uuid.substring(0, 8),
    url: fullUrl
  };
  
  // Wait for modal to render
  await nextTick();
  
  // Generate QR code
  if (qrCanvas.value) {
    await QRCode.toCanvas(qrCanvas.value, fullUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Add logo to QR code
    await addLogoToQR(qrCanvas.value);
  }
}

function closePrintModal() {
  printModal.value.visible = false;
}

function executePrint() {
  if (!printContainer.value) return;
  
  const printContent = printContainer.value.innerHTML;
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Code - ${printModal.value.name || printModal.value.uuidShort}</title>
      <style>
        @page { 
          size: portrait;
          margin: 0;
        }
        body { 
          margin: 0; 
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .qr-print-page {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 40px 20px;
          box-sizing: border-box;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .qr-header {
          text-align: center;
        }
        .header-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .qr-logo {
          max-width: 48px;
          max-height: 48px;
          width: auto;
          height: auto;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        .qr-header h2 {
          font-size: 36px;
          margin: 0;
        }
        .player-info {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .qr-code-container {
          background: white;
          padding: 20px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .qr-code-container canvas {
          display: block;
        }
        .qr-footer {
          text-align: center;
        }
        .uuid-display {
          font-family: monospace;
          font-size: 14px;
          margin: 10px 0;
          opacity: 0.9;
        }
        .url-display {
          font-size: 12px;
          opacity: 0.7;
          margin: 5px 0;
        }
        .instructions {
          margin-top: 20px;
          font-size: 18px;
        }
        .instructions p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      ${printContent}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Add canvas to print window
  const printCanvas = printWindow.document.querySelector('canvas');
  if (printCanvas && qrCanvas.value) {
    const ctx = printCanvas.getContext('2d');
    if (ctx) {
      printCanvas.width = qrCanvas.value.width;
      printCanvas.height = qrCanvas.value.height;
      ctx.drawImage(qrCanvas.value, 0, 0);
    }
  }
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

async function downloadPNG() {
  if (!printContainer.value || !qrCanvas.value) return;
  
  try {
    // Create a dedicated container for PNG generation
    const pngContainer = document.createElement('div');
    pngContainer.style.position = 'absolute';
    pngContainer.style.left = '-9999px';
    pngContainer.style.top = '0';
    pngContainer.style.width = '400px';
    pngContainer.style.height = '600px';
    
    // Create the QR card HTML with inline styles
    const qrDataURL = qrCanvas.value.toDataURL('image/png');
    
    pngContainer.innerHTML = `
      <div style="
        width: 400px;
        height: 600px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 40px 20px;
        box-sizing: border-box;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="text-align: center;">
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 10px;
          ">
            <img src="/SnatchGame.png?v=2" style="
              max-width: 48px;
              max-height: 48px;
              width: auto;
              height: auto;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            " alt="SnatchGame" />
            <h2 style="
              font-size: 36px;
              margin: 0;
              font-weight: bold;
            ">SnatchGame</h2>
          </div>
          <p style="
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          ">${printModal.value.name || 'Jugador'}</p>
        </div>
        
        <div style="
          background: white;
          padding: 20px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
          <img src="${qrDataURL}" style="
            display: block;
            width: 256px;
            height: 256px;
          " />
        </div>
        
        <div style="text-align: center;">
          <p style="
            font-family: monospace;
            font-size: 14px;
            margin: 10px 0;
            opacity: 0.9;
          ">UUID: ${printModal.value.uuidShort}</p>
          <p style="
            font-size: 12px;
            opacity: 0.7;
            margin: 5px 0;
          ">${printModal.value.url}</p>
          <div style="margin-top: 20px;">
            <p style="
              margin: 5px 0;
              font-size: 18px;
            ">📱 Escanea este código QR</p>
            <p style="
              margin: 5px 0;
              font-size: 18px;
            ">para acceder al juego</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(pngContainer);
    
    // Capture with html2canvas
    const canvas = await html2canvas(pngContainer, {
      width: 400,
      height: 600,
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      allowTaint: false,
      logging: false,
      removeContainer: false
    });
    
    // Remove the temporary container
    document.body.removeChild(pngContainer);
    
    // Create download link
    const link = document.createElement('a');
    link.download = `qr-code-${printModal.value.name || printModal.value.uuidShort}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error generating PNG:', error);
    alert('Error al generar la imagen PNG');
  }
}

function shareQR() {
  if (!printModal.value.uuid) return;
  
  if (navigator.share) {
    navigator.share({
      title: 'Únete a Snatch Game',
      text: `¡Únete a una partida de Snatch Game!`,
      url: printModal.value.url
    }).catch(err => console.log('Error sharing:', err));
  } else {
    // Fallback: copy to clipboard
    copyToClipboard();
  }
}

// Function to add logo to QR code with high quality
async function addLogoToQR(canvas: HTMLCanvasElement) {
  return new Promise<void>((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Calculate logo size (about 18% of QR code size for better readability)
        const qrSize = Math.min(canvas.width, canvas.height);
        const logoSize = qrSize * 0.18;
        
        // Center position
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate aspect ratio preserving dimensions
        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        let logoWidth = logoSize;
        let logoHeight = logoSize;
        
        if (imgAspectRatio > 1) {
          // Image is wider than tall
          logoHeight = logoSize / imgAspectRatio;
        } else {
          // Image is taller than wide
          logoWidth = logoSize * imgAspectRatio;
        }
        
        const logoX = centerX - logoWidth / 2;
        const logoY = centerY - logoHeight / 2;
        
        // Draw white background with rounded corners for better appearance
        const padding = 8;
        const bgWidth = logoWidth + padding * 2;
        const bgHeight = logoHeight + padding * 2;
        const bgX = centerX - bgWidth / 2;
        const bgY = centerY - bgHeight / 2;
        const cornerRadius = 6;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgWidth, bgHeight, cornerRadius);
        ctx.fill();
        
        // Add subtle shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Draw logo with high quality
        ctx.drawImage(img, logoX, logoY, logoWidth, logoHeight);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      console.warn('Failed to load logo for QR, continuing without it');
      resolve(); // Continue without logo if it fails to load
    };
    
    img.src = '/SnatchGame.png?v=2';
  });
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(printModal.value.url);
    alert('Link copiado al portapapeles');
  } catch (error) {
    console.error('Failed to copy URL:', error);
    alert('Error al copiar el link');
  }
}
</script>

<style scoped>
.uuid-selector-container {
  min-height: calc(var(--app-vh, 1vh) * 100);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.selector-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 1200px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.5s ease-out;
}

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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 3rem;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: bold;
}

.subtitle {
  color: #666;
  font-size: 1.2rem;
  margin-top: 10px;
}

.search-container {
  position: relative;
  margin-bottom: 30px;
}

.quick-actions.top {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 8px 0 14px 0;
}

.qa-btn {
  appearance: none;
  background: linear-gradient(135deg, rgba(102,126,234,0.28) 0%, rgba(118,75,162,0.28) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.55);
  color: #243147;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 6px 18px rgba(102,126,234,0.12);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.qa-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(118,75,162,0.16);
}

.qa-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.qa-btn:focus, .qa-btn:focus-visible { outline: none; }

.search-input {
  width: 100%;
  padding: 15px 50px 15px 20px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s;
  outline: none;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  opacity: 0.6;
}

/* QR Mode Toggle Styles */
.qr-mode-container { margin: 16px 0 0 0; display: flex; justify-content: center; }
.qr-mode-label { display:flex; align-items:center; gap: 10px; cursor: pointer; user-select:none; -webkit-tap-highlight-color: transparent; outline: none; }
.qr-mode-checkbox { position:absolute; opacity:0; width:0; height:0; }
.qr-toggle { width: 48px; height: 26px; background: linear-gradient(180deg, rgba(246,247,250,0.95), rgba(226,229,235,0.85)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border:1px solid rgba(0,0,0,0.18); border-radius: 999px; position: relative; transition: background 0.25s ease, border-color 0.25s ease; box-shadow: inset 0 2px 6px rgba(0,0,0,0.14); }
.qr-toggle:hover { border-color: rgba(0,0,0,0.24); }
.qr-toggle::after { content: ''; width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: transform 0.25s ease, box-shadow 0.25s ease; box-shadow: 0 3px 8px rgba(0,0,0,0.18); }
.qr-mode-checkbox:checked + .qr-toggle { background: linear-gradient(135deg, rgba(102,126,234,0.6) 0%, rgba(118,75,162,0.6) 100%); border-color: rgba(255,255,255,0.7); }
.qr-mode-checkbox:checked + .qr-toggle::after { transform: translateX(22px); }
.qr-mode-text { font-size: 14px; font-weight: 600; color: #374151; }

/* Remove distracting tap highlight / outlines on touch for cards */
.uuid-card { -webkit-tap-highlight-color: transparent; outline: none; }
.uuid-card:focus, .uuid-card:focus-visible { outline: none; }

/* Credits */
/* credits moved to AppCredits component */

.uuids-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 25px;
  max-height: 500px;
  overflow-y: auto;
  padding: 10px;
}

.uuids-grid::-webkit-scrollbar {
  width: 8px;
}

.uuids-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.uuids-grid::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.uuids-grid::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.uuid-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 16px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  animation: fadeIn 0.5s ease-out backwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  min-height: 120px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.uuid-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.uuid-card.has-name {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border: 2px solid rgba(102, 126, 234, 0.3);
}

.uuid-card.has-color {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--player-color) 8%, #f5f7fa) 0%, 
    color-mix(in srgb, var(--player-color) 15%, #c3cfe2) 100%);
  border: 2px solid color-mix(in srgb, var(--player-color) 30%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--player-color) 20%, transparent);
}

.uuid-card.has-color:hover {
  box-shadow: 0 10px 25px color-mix(in srgb, var(--player-color) 35%, transparent);
}

.color-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--player-color);
  opacity: 0.8;
  transition: all 0.3s ease;
}

.uuid-card:hover .color-indicator {
  height: 6px;
  opacity: 1;
}

.shame-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 999px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
  z-index: 10;
  transition: all 0.3s ease;
}

.shame-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

.shame-icon {
  font-size: 14px;
}

.shame-count {
  font-size: 11px;
  background: #dc2626;
  color: white;
  padding: 0 5px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
}

.uuid-card.has-shame {
  border: 2px solid #fecaca;
  background: linear-gradient(135deg, 
    color-mix(in srgb, #fee2e2 50%, #f5f7fa) 0%, 
    color-mix(in srgb, #fecaca 30%, #c3cfe2) 100%);
}

.uuid-card.has-shame.has-color {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--player-color) 8%, color-mix(in srgb, #fee2e2 40%, #f5f7fa)) 0%, 
    color-mix(in srgb, var(--player-color) 15%, color-mix(in srgb, #fecaca 30%, #c3cfe2)) 100%);
  border: 2px solid color-mix(in srgb, #ef4444 40%, var(--player-color) 60%);
}

.uuid-number {
  font-size: 22px;
  font-weight: bold;
  color: #667eea;
  transition: all 0.3s;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  line-height: 1;
  margin: 0;
}

.uuid-card.has-color .uuid-number {
  font-weight: 900;
  text-shadow: 0 1px 3px color-mix(in srgb, var(--player-color) 30%, transparent);
}

.player-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  transition: all 0.3s;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  margin: 2px 0;
  line-height: 1.2;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uuid-card.has-color .player-name {
  background: color-mix(in srgb, var(--player-color) 15%, rgba(255, 255, 255, 0.8));
  border: 1px solid color-mix(in srgb, var(--player-color) 25%, transparent);
  font-weight: 700;
}

.uuid-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #666;
  transition: color 0.3s;
  opacity: 0.8;
}

.loading {
  text-align: center;
  padding: 60px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.quick-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn-random,
.btn-dashboard,
.btn-leaderboard {
  padding: 12px 30px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-random {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-random:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(240, 147, 251, 0.4);
}

.btn-dashboard {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-dashboard:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
}

.btn-leaderboard {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-leaderboard:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  color: #333;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-item:hover {
  background: #f5f5f5;
}

/* Print Modal */
.print-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
}

.print-modal-content {
  background: white;
  border-radius: 20px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s ease-out;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}

.close-button:hover {
  color: #333;
}

.print-container {
  margin: 20px 0;
}

.qr-print-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  border-radius: 15px;
  color: white;
  text-align: center;
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 10px;
}

.qr-logo {
  max-width: 48px;
  max-height: 48px;
  width: auto;
  height: auto;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.qr-header h2 {
  margin: 0;
  font-size: 28px;
}

.player-info {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 20px 0;
}

.qr-code-container {
  background: white;
  padding: 20px;
  border-radius: 15px;
  display: inline-block;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  margin: 20px 0;
}

.qr-code-container canvas {
  display: block;
}

.qr-footer {
  margin-top: 20px;
}

.uuid-display {
  font-family: monospace;
  font-size: 12px;
  opacity: 0.9;
  margin: 10px 0;
}

.url-display {
  font-size: 11px;
  opacity: 0.7;
  margin: 5px 0;
}

.instructions {
  margin-top: 15px;
}

.instructions p {
  margin: 5px 0;
  font-size: 14px;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-download,
.btn-share,
.btn-print {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-download {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
}

.btn-share {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-share:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(240, 147, 251, 0.4);
}

.btn-print {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-print:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .selector-card {
    padding: 20px;
  }

  .title {
    font-size: 2rem;
  }
  
  .qr-mode-container { margin: 12px 0 0 0; }
  .qr-mode-text { font-size: 13px; }

  .uuids-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .quick-actions.top { justify-content: center; gap: 8px; }
  .quick-actions.top .qa-btn { min-width: 120px; padding: 8px 10px; font-size: 13px; }
  .print-modal-content {
    width: 95%;
    padding: 20px;
  }
  
  .modal-buttons {
    flex-direction: column;
  }
}
</style>
