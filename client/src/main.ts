import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);

app.mount('#app');

// Registrar Service Worker en producción para PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // no-op: registro del SW falló
    });
  });
}

// Ajuste de altura dinámica para móviles (evita espacios en blanco por 100vh)
function setAppVhVar() {
  try {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  } catch {}
}
setAppVhVar();
window.addEventListener('resize', setAppVhVar);
window.addEventListener('orientationchange', setAppVhVar);

// Handle OS-level file open for .snatchSave via PWA File Handlers (Chromium desktop)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const navAny = navigator as any;
if (navAny.launchQueue && typeof navAny.launchQueue.setConsumer === 'function') {
  navAny.launchQueue.setConsumer(async (params: any) => {
    try {
      const files = (params && params.files) ? params.files : [];
      for (const fh of files) {
        const file: File = await fh.getFile();
        if (file && file.name.endsWith('.snatchSave')) {
          const text = await file.text();
          // Stash for Dashboard to import and navigate there.
          localStorage.setItem('snatch.pendingSnatchSave', text);
          router.push('/dashboard');
          break;
        }
      }
    } catch {
      // ignore
    }
  });
}
