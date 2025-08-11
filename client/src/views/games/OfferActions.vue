<template>
  <div
    v-if="shouldShowComponent"
    class="offer-actions-card"
    :style="({ '--p1': p1Color, '--p2': p2Color } as any)"
  >
    <!-- G2: Force option for P2 -->
    <div v-if="myRole === 'P2' && currentVariant === 'G2' && !state.offer?.active" class="force-section">
      <label class="force-checkbox">
        <input 
          type="checkbox" 
          :checked="state.forcedByP2" 
          @change="$emit('p2Force', ($event.target as HTMLInputElement).checked)"
        />
        <span class="checkbox-label">Forzar oferta</span>
      </label>
    </div>

    <!-- Offer display when active -->
    <div v-if="state.offer?.active" class="offer-display">
      <div class="offer-summary">
        <div class="offer-part giving">
          <span class="offer-label">P1 Ofrece</span>
          <div class="tokens-display">
            <span v-if="state.offer.offerPavo > 0" class="token-item pill">
              <span class="icon">🦃</span>
              <span class="val">{{ state.offer.offerPavo }}</span>
            </span>
            <span v-if="state.offer.offerElote > 0" class="token-item pill">
              <span class="icon">🌽</span>
              <span class="val">{{ state.offer.offerElote }}</span>
            </span>
            <span v-if="state.offer.offerPavo === 0 && state.offer.offerElote === 0" class="no-tokens pill subtle">Nada</span>
          </div>
        </div>
        <div class="exchange-arrows">
          <span class="arrow-p1" :style="{ color: p1Color }">→</span>
          <span class="arrow-p2" :style="{ color: p2Color }">←</span>
        </div>
        <div class="offer-part requesting">
          <span class="offer-label">P2 Entrega</span>
          <div class="tokens-display">
            <span v-if="state.offer.requestPavo > 0" class="token-item pill">
              <span class="icon">🦃</span>
              <span class="val">{{ state.offer.requestPavo }}</span>
            </span>
            <span v-if="state.offer.requestElote > 0" class="token-item pill">
              <span class="icon">🌽</span>
              <span class="val">{{ state.offer.requestElote }}</span>
            </span>
            <span v-if="state.offer.requestPavo === 0 && state.offer.requestElote === 0" class="no-tokens pill subtle">Nada</span>
          </div>
        </div>
      </div>

      <!-- P2 Actions: Accept/Reject/Snatch -->
      <div v-if="myRole === 'P2' && !state.p2Action" class="action-buttons">
        <button class="btn accept" @click="$emit('p2Action', 'accept')">
          <span class="btn-icon">✓</span>
          Aceptar
        </button>
        <button class="btn reject" @click="$emit('p2Action', 'reject')">
          <span class="btn-icon">✕</span>
          Rechazar
        </button>
        <button class="btn snatch" @click="$emit('p2Action', 'snatch')">
          <span class="btn-icon">👹</span>
          Robar
        </button>
      </div>

      <!-- P1 waiting for P2 decision -->
      <div v-else-if="myRole === 'P1' && !state.p2Action" class="waiting-state">
        <div class="spinner spinner--p2"></div>
        <span class="waiting-text">Esperando decisión de P2...</span>
      </div>

      <!-- P2 waiting for P1 punishment decision after snatch (G3/G4) -->
      <div
        v-else-if="myRole === 'P2' && state.p2Action === 'snatch' && (currentVariant === 'G3' || currentVariant === 'G4') && ((currentVariant === 'G3' && !state.shameAssigned) || (currentVariant === 'G4' && state.reported === false))"
        class="waiting-state"
      >
        <div class="spinner spinner--p1"></div>
        <span class="waiting-text">Esperando castigo de P1...</span>
      </div>

      <!-- Show P2's decision -->
      <div v-else-if="state.p2Action && !showP1PostActions" class="decision-display">
        <div class="decision-badge" :class="state.p2Action">
          <span v-if="state.p2Action === 'accept'">✓ Oferta Aceptada</span>
          <span v-else-if="state.p2Action === 'reject'">✕ Oferta Rechazada</span>
          <span v-else-if="state.p2Action === 'snatch'">👹 Tokens Robados</span>
        </div>
      </div>
    </div>

    <!-- P1 Actions after P2's snatch -->
    <!-- G3: Assign shame -->
    <div v-if="myRole === 'P1' && state.p2Action === 'snatch' && currentVariant === 'G3' && !state.shameAssigned" class="p1-response">
      <div class="response-prompt">P2 ha robado los tokens. ¿Asignar token de vergüenza?</div>
      <div class="action-buttons">
        <button class="btn shame" @click="$emit('assignShame', true)">
          <span class="btn-icon">😶</span>
          Asignar vergüenza
        </button>
        <button class="btn no-action" @click="$emit('assignShame', false)">
          No asignar
        </button>
      </div>
    </div>

    <!-- G4: Report to judge -->
    <div v-if="myRole === 'P1' && state.p2Action === 'snatch' && currentVariant === 'G4' && !state.reported" class="p1-response">
      <div class="response-prompt">P2 ha robado los tokens. ¿Denunciar al juez?</div>
      <div class="action-buttons">
        <button class="btn report" @click="$emit('report', true)">
          <span class="btn-icon">⚖️</span>
          Denunciar (confiscar)
        </button>
        <button class="btn no-action" @click="$emit('report', false)">
          No denunciar
        </button>
      </div>
    </div>

    <!-- Waiting for offer from P1 (P2 perspective) -->
    <div v-else-if="myRole === 'P2' && !state.offer?.active && currentVariant !== 'G2'" class="waiting-state">
      <div class="spinner spinner--p1"></div>
      <span class="waiting-text">Esperando oferta de P1...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  state: any;
  myRole: string;
  currentVariant?: string;
  p1Color?: string;
  p2Color?: string;
}

const props = defineProps<Props>();
const p1Color = props.p1Color || "#667eea";
const p2Color = props.p2Color || "#764ba2";

const showP1PostActions = computed(() => {
  if (props.myRole !== 'P1' || props.state.p2Action !== 'snatch') return false;
  if (props.currentVariant === 'G3' && !props.state.shameAssigned) return true;
  if (props.currentVariant === 'G4' && !props.state.reported) return true;
  return false;
});

const shouldShowComponent = computed(() => {
  // Show for P2 in G2 when forcing offer (even without active offer)
  if (props.myRole === 'P2' && props.currentVariant === 'G2' && !props.state.offer?.active) {
    return true;
  }
  
  // Show when there's an active offer
  if (props.state.offer?.active) {
    return true;
  }
  
  // Show P1 post-actions for G3/G4
  if (showP1PostActions.value) {
    return true;
  }
  
  // Show waiting state for P2 (except in G2 which is handled above)
  if (props.myRole === 'P2' && !props.state.offer?.active && props.currentVariant !== 'G2') {
    return true;
  }
  
  // Don't show for P1 when creating offer
  return false;
});

defineEmits(['p2Action', 'p2Force', 'assignShame', 'report']);
</script>

<style scoped>
.offer-actions-card {
  background: #ffffff;
  border: 1px solid #eeeeee;
  border-radius: 12px;
  padding: 12px;
  margin-top: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}

.force-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e9f0;
}

.force-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.force-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-right: 10px;
  cursor: pointer;
}

.checkbox-label {
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}

.offer-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.offer-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.offer-part {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.offer-part.giving {
  background: color-mix(in srgb, var(--p1) 10%, white);
  border-color: color-mix(in srgb, var(--p1) 30%, #e6e9ff);
}

.offer-part.requesting {
  background: color-mix(in srgb, var(--p2) 10%, white);
  border-color: color-mix(in srgb, var(--p2) 30%, #e6e9ff);
}

.offer-label {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tokens-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.pill { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:#f7f7f7; border:1px solid #eee; }
.pill.subtle { background:#fafafa; color:#666; }
.token-item { display:flex; align-items:center; gap:4px; }
.icon { font-size: 16px; }
.val { font-weight: 700; color:#333; }

/* separator removed in favor of pill grouping */

.exchange-arrows {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.arrow-p1, .arrow-p2 {
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  opacity: 0.9;
}

.no-tokens {
  color: #94a3b8;
  font-style: italic;
  font-size: 14px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(85px, 1fr));
  gap: 8px;
}

.btn {
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.btn-icon {
  font-size: 14px;
}

.btn.accept { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; box-shadow: 0 10px 20px rgba(16,185,129,0.25); }

.btn.accept:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
}

.btn.reject { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; box-shadow: 0 10px 20px rgba(245,158,11,0.25); }

.btn.reject:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
}

.btn.snatch { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; box-shadow: 0 10px 20px rgba(239,68,68,0.25); }

.btn.snatch:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.btn.shame { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #fff; box-shadow: 0 10px 20px rgba(251,191,36,0.25); }

.btn.shame:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(251, 191, 36, 0.35);
}

.btn.report { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; box-shadow: 0 10px 20px rgba(139,92,246,0.25); }

.btn.report:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
}

.btn.no-action {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.btn.no-action:hover {
  background: #e5e7eb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.waiting-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #64748b;
}

.spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-radius: 50%; animation: spin 1s linear infinite; }
.spinner--p1 { border-top: 3px solid var(--p1); }
.spinner--p2 { border-top: 3px solid var(--p2); }

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.waiting-text {
  font-weight: 500;
  font-size: 14px;
}

.decision-display {
  display: flex;
  justify-content: center;
  padding: 12px;
}

.decision-badge { padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 14px; text-align: center; }

.decision-badge.accept { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; box-shadow: 0 6px 14px rgba(16,185,129,0.15); }

.decision-badge.reject { background: #fed7aa; color: #92400e; border: 1px solid #fb923c; box-shadow: 0 6px 14px rgba(245,158,11,0.15); }

.decision-badge.snatch { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; box-shadow: 0 6px 14px rgba(239,68,68,0.15); }

.p1-response {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e9f0;
}

.response-prompt {
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
  text-align: center;
}

@media (max-width: 480px) {
  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
