<template>
  <div class="app-credits" :class="[variantClass, positionClass, (collapsed ? 'is-collapsed' : 'is-expanded')]" aria-label="Créditos y contacto" ref="rootEl">
    <div class="credits-card" :class="{ collapsed }">
      <button v-if="!collapsed" class="btn-toggle close" @click="collapse" title="Ocultar">×</button>

      <template v-if="!collapsed">
        <span>Hecho por <strong>Nucleo Inteligencia</strong></span>
        <span class="sep">•</span>
        <span>2024</span>
        <span class="sep">•</span>
        <a href="mailto:firstcontact@nucleoriofrio.com" class="credits-link">firstcontact@nucleoriofrio.com</a>
        <span class="sep">•</span>
        <RouterLink to="/credits" class="credits-link icon" title="Créditos detallados">ⓘ</RouterLink>
      </template>

      <template v-else>
        <button class="btn-toggle expand" @click="expand" title="Mostrar">◄</button>
        <RouterLink to="/credits" class="credits-link icon" title="Créditos detallados">ⓘ</RouterLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';

interface Props { 
  position?: 'bottom-right'|'bottom-center';
  variant?: 'overlay'|'inline';
  defaultCollapsed?: boolean;
}
const props = defineProps<Props>();
const positionClass = computed(() => (props.variant === 'inline') ? '' : (props.position || 'bottom-right'));
const variantClass = computed(() => props.variant === 'inline' ? 'inline' : 'overlay');
const rootEl = ref<HTMLElement | null>(null);
const collapsed = ref(false);

function setBottomGap() {
  if (variantClass.value !== 'overlay') return;
  try {
    const el = rootEl.value?.querySelector('.credits-card') as HTMLElement | null;
    const h = el ? el.offsetHeight : 0;
    const gap = h ? h + 12 : 0;
    document.documentElement.style.setProperty('--credits-gap', gap ? `${gap}px` : '0px');
  } catch {}
}

function collapse() { collapsed.value = true; setTimeout(setBottomGap, 0); }
function expand() { collapsed.value = false; setTimeout(setBottomGap, 0); }

onMounted(async () => {
  // Set initial collapsed state (default true for inline uses)
  if (typeof props.defaultCollapsed === 'boolean') collapsed.value = props.defaultCollapsed;
  else collapsed.value = props.variant === 'inline' ? true : false;
  await nextTick();
  setBottomGap();
  window.addEventListener('resize', setBottomGap);
  window.addEventListener('orientationchange', setBottomGap as any);
});

onUnmounted(() => {
  if (variantClass.value === 'overlay') {
    document.documentElement.style.setProperty('--credits-gap', '0px');
  }
  window.removeEventListener('resize', setBottomGap);
  window.removeEventListener('orientationchange', setBottomGap as any);
});
</script>

<style scoped>
.app-credits { z-index: 40; pointer-events: none; }
.app-credits.overlay { position: fixed; }
.app-credits.bottom-right { right: 12px; bottom: 12px; }
.app-credits.bottom-center { left: 50%; transform: translateX(-50%); bottom: 12px; position: fixed; }
.app-credits.inline { position: static; margin-top: 10px; display: flex; justify-content: flex-end; width: 100%; }

.credits-card {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  line-height: 1.1;
  color: #394352;
  background: rgba(255, 255, 255, 0.322);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  pointer-events: auto; /* allow clicking the mailto link */
  max-width: 100%;
}
.credits-card.collapsed { gap: 6px; padding: 4px 6px; }
.credits-card.collapsed > span:not(.sep),
.credits-card.collapsed > .sep,
.credits-card.collapsed > .credits-link:not(.icon),
.credits-card.collapsed > .btn-toggle.close { display: none; }
.app-credits.inline .credits-card { background: rgba(255,255,255,0.14); border-color: rgba(0,0,0,0.04); }
.credits-card strong { color: #475569; font-weight: 700; }
.credits-card .sep { opacity: 0.55; }
.credits-link { color: #64748b; text-decoration: none; border-bottom: 1px dotted rgba(100,116,139,0.45); overflow-wrap: anywhere; word-break: break-word; }
.credits-link:hover { color: #334155; border-bottom-color: rgba(51,65,85,0.55); }
.credits-link.icon { border-bottom: none; display: inline-flex; align-items:center; justify-content:center; width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.6); color:#334155; font-weight: 700; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.credits-link.icon:hover { background: rgba(255,255,255,0.9); }

.btn-toggle { appearance: none; border: none; background: transparent; color:#475569; cursor: pointer; padding: 0; margin: 0; border-radius: 6px; }
.btn-toggle.close { font-size: 14px; line-height: 1; margin-right: 4px; }
.btn-toggle.expand { font-size: 12px; line-height: 1; margin-right: 4px; }
.btn-toggle:focus { outline: none; }

@media (max-width: 480px) {
  .app-credits.inline { margin-top: 6px; }
  .app-credits.inline .credits-card {
    font-size: 10px;
    padding: 4px 6px;
    gap: 4px;
    border-radius: 8px;
    white-space: normal;
    display: flex;
    flex-wrap: wrap;
    max-width: 100%;
  }
  .app-credits.inline .credits-card .sep { margin: 0 4px; }
  .app-credits.inline .credits-link.icon { width: 16px; height: 16px; font-size: 11px; }
}
</style>
