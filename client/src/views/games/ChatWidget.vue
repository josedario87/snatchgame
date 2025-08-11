<template>
  <div class="chat-widget">
    <!-- System bubbles: top-left, newest on top -->
    <TransitionGroup name="ephem" tag="div" class="ephemeral-stack-sys" v-if="ephemeralBubblesSys.length">
      <div class="bubble" :class="[ e.kind ? `k-${e.kind}` : null, { fading: e.fading } ]" v-for="e in ephemeralBubblesSys" :key="e.id">{{ e.text }}</div>
    </TransitionGroup>

    <!-- Chat bubbles: bottom-right, newest at bottom -->
    <TransitionGroup name="ephem" tag="div" class="ephemeral-stack-chat" v-if="ephemeralBubblesChat.length">
      <div class="bubble chat" :class="{ fading: e.fading }" v-for="e in ephemeralBubblesChat" :key="e.id" :style="{ background: e.bg, color: e.fg }">{{ e.text }}</div>
    </TransitionGroup>

    <div class="composer" :class="{ 'is-focused': isComposerFocused }">
      <input
        v-model="text"
        @keyup.enter="send"
        @focus="isComposerFocused = true"
        @blur="isComposerFocused = false"
        type="text"
        placeholder="Mensaje (no vinculante)"
      />
      <button class="btn" @click="send">Enviar</button>
      <button class="btn secondary" @click="openModal" title="Abrir chat">💬</button>
    </div>

    <div class="modal-backdrop" v-if="showModal" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header compact">
          <div class="title">Chat</div>
          <button class="btn close" @click="closeModal" aria-label="Cerrar">✕</button>
        </div>
        <div class="messages" ref="messagesEl">
          <div
            v-for="m in messages"
            :key="m.id"
            :class="['msg', m.system ? 'system' : (m.mine ? 'mine' : 'theirs'), m.kind ? `k-${m.kind}` : null]"
          >
            <div class="meta">
              <span class="author">{{ m.mine ? 'Tú' : m.from }}</span>
              <span class="time">{{ formatTime(m.ts) }}</span>
            </div>
            <div class="body">{{ m.text }}</div>
          </div>
        </div>
        <div class="modal-composer">
          <input
            v-model="text"
            @keyup.enter="send"
            type="text"
            placeholder="Escribe un mensaje"
          />
          <button class="btn" @click="send">Enviar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { colyseusService } from "../../services/colyseus";

interface ChatMsg {
  id: string;
  from: string;
  fromId: string;
  text: string;
  ts: number;
  mine: boolean;
  kind?: string;
  system?: boolean;
  color?: string;
}

const text = ref("");
const isComposerFocused = ref(false);
const messages = ref<ChatMsg[]>([]);
const showModal = ref(false);
const messagesEl = ref<HTMLDivElement | null>(null);
const ephemeralBubblesSys = ref<{ id: string; text: string; expiresAt: number; fading?: boolean; kind?: string }[]>([]);
const ephemeralBubblesChat = ref<{ id: string; text: string; expiresAt: number; fading?: boolean; bg?: string; fg?: string }[]>([]);

const ephemeralTimersSys = new Map<string, { fade?: any; remove?: any }>();
const ephemeralTimersChat = new Map<string, { fade?: any; remove?: any }>();
let removeHandler: (() => void) | null = null;
const FADE_MS = 500; // start leave transition this long before removal

function send() {
  const t = text.value.trim();
  if (!t) return;

  // Push locally
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const mine: ChatMsg = {
    id,
    from: colyseusService.playerName.value || "Yo",
    fromId: colyseusService.sessionId.value || "",
    text: t,
    ts: Date.now(),
    mine: true,
  };
  messages.value.push(mine);
  scrollToBottomSoon();

  // Try to send through the room (server will broadcast)
  const room = colyseusService.gameRoom.value;
  try {
    room?.send("chat", { id, text: t });
  } catch (e) {
    // no-op if room not available
  }
  text.value = "";
}

function handleIncoming(payload: any) {
  // Avoid duplicates: if we already have this id, skip.
  if (payload?.id && messages.value.some(m => m.id === payload.id)) {
    return;
  }
  const mine = payload.fromId === colyseusService.sessionId.value;
  const msg: ChatMsg = {
    id: payload.id || `${payload.ts}-${payload.fromId}-${Math.random().toString(36).slice(2)}`,
    from: payload.from || "Jugador",
    fromId: payload.fromId || "",
    text: payload.text || "",
    ts: payload.ts || Date.now(),
    mine,
    kind: payload.kind,
    system: payload.fromId === 'system',
    color: payload.color,
  };
  messages.value.push(msg);
  scrollToBottomSoon();

  if (!mine && msg.system) {
    queueEphemeralSystem(msg.id, msg.text, msg.kind);
  } else if (!mine && !msg.system) {
    queueEphemeralChat(msg.id, msg.text, msg.color);
  }
}

function openModal() { showModal.value = true; }
function closeModal() { showModal.value = false; }

function queueEphemeralSystem(id: string, t: string, kind?: string) {
  // System: top-left, longer duration (min 4s, 0.7s/word, max 20s)
  const words = (t || '').trim().split(/\s+/).filter(Boolean).length;
  const computed = Math.min(20, Math.max(4, words * 0.7));
  const now = Date.now();
  const expiresAt = now + computed * 1000;

  const bubble = { id, text: t, expiresAt, kind };
  ephemeralBubblesSys.value.unshift(bubble); // newest on top

  if (ephemeralTimersSys.has(id)) {
    const t = ephemeralTimersSys.get(id)!;
    if (t.fade) clearTimeout(t.fade);
    if (t.remove) clearTimeout(t.remove);
  }
  const delay = Math.max(0, expiresAt - now);
  const startDelay = Math.max(0, delay - FADE_MS);
  const fadeTimer = setTimeout(() => {
    const b = ephemeralBubblesSys.value.find(e => e.id === id);
    if (b) b.fading = true;
  }, startDelay);
  const removeTimer = setTimeout(() => {
    const idx = ephemeralBubblesSys.value.findIndex(e => e.id === id);
    if (idx !== -1) ephemeralBubblesSys.value.splice(idx, 1);
    ephemeralTimersSys.delete(id);
  }, delay);
  ephemeralTimersSys.set(id, { fade: fadeTimer, remove: removeTimer });
}

function queueEphemeralChat(id: string, t: string, bg?: string) {
  // Chat: bottom-right, slightly shorter (min 3s, 0.5s/word, max 15s)
  const words = (t || '').trim().split(/\s+/).filter(Boolean).length;
  const computed = Math.min(15, Math.max(3, words * 0.5));
  const now = Date.now();
  const expiresAt = now + computed * 1000;

  const fg = getReadableTextColor(bg || '#667eea');
  const bubble = { id, text: t, expiresAt, bg: bg || '#667eea', fg };
  ephemeralBubblesChat.value.push(bubble); // newest at bottom

  if (ephemeralTimersChat.has(id)) {
    const t = ephemeralTimersChat.get(id)!;
    if (t.fade) clearTimeout(t.fade);
    if (t.remove) clearTimeout(t.remove);
  }
  const delay = Math.max(0, expiresAt - now);
  const startDelay = Math.max(0, delay - FADE_MS);
  const fadeTimer = setTimeout(() => {
    const b = ephemeralBubblesChat.value.find(e => e.id === id);
    if (b) b.fading = true;
  }, startDelay);
  const removeTimer = setTimeout(() => {
    const idx = ephemeralBubblesChat.value.findIndex(e => e.id === id);
    if (idx !== -1) ephemeralBubblesChat.value.splice(idx, 1);
    ephemeralTimersChat.delete(id);
  }, delay);
  ephemeralTimersChat.set(id, { fade: fadeTimer, remove: removeTimer });
}

function getReadableTextColor(hex?: string): string {
  const c = (hex || '').trim();
  const m = c.match(/^#?([a-fA-F0-9]{6})$/);
  let r=102, g=126, b=234; // fallback to #667eea
  if (m) {
    const int = parseInt(m[1], 16);
    r = (int >> 16) & 255; g = (int >> 8) & 255; b = int & 255;
  }
  // Perceived brightness formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#111111' : '#ffffff';
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function scrollToBottomSoon() {
  nextTick(() => {
    const el = messagesEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

onMounted(() => {
  const room = colyseusService.gameRoom.value;
  if (room) {
    const handler = (data: any) => handleIncoming(data);
    room.onMessage("chat", handler);
    removeHandler = () => {
      try { room.off?.("chat", handler as any); } catch(e) {}
    };
  }
});

onUnmounted(() => {
  if (removeHandler) removeHandler();
  for (const [, obj] of ephemeralTimersSys) {
    if (obj.fade) clearTimeout(obj.fade);
    if (obj.remove) clearTimeout(obj.remove);
  }
  for (const [, obj] of ephemeralTimersChat) {
    if (obj.fade) clearTimeout(obj.fade);
    if (obj.remove) clearTimeout(obj.remove);
  }
  ephemeralTimersSys.clear();
  ephemeralTimersChat.clear();
});

// Ensure modal autoscrolls when opened
watch(showModal, (v) => { if (v) scrollToBottomSoon(); });
</script>

<style scoped>
.chat-widget { position: fixed; right: 16px; bottom: 16px; z-index: 50; }
.composer { display:flex; gap:8px; background:rgba(255,255,255,0.5); padding:8px; border-radius:10px; border:1px solid #000; box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.35); transition: background-color 0.2s ease, background 0.2s ease; }
.composer.is-focused { background:#ffffff; }
.composer input { width: 60px; padding:8px; border:1px solid #e0e0e0; border-radius:8px; background: rgba(255,255,255,0.2); transition: width 0.25s ease, background-color 0.2s ease, border-color 0.2s ease; }
.composer.is-focused input { width: 240px; }
.composer.is-focused input { background: #ffffff; }
.composer .btn { background: rgba(227,242,253,0.5); transition: background-color 0.2s ease, background 0.2s ease; }
.composer .btn.secondary { background: rgba(245,245,245,0.4); }
.composer.is-focused .btn { background: #e3f2fd; }
.composer.is-focused .btn.secondary { background: #f5f5f5; }
.btn { padding:8px 10px; border:none; border-radius:8px; background:#e3f2fd; color:#1565c0; cursor:pointer; }
.btn.secondary { background:#f5f5f5; color:#333; }
.btn.close { background:#f5f5f5; color:#333; }

.ephemeral-stack-sys { position:fixed; left: 16px; top: 16px; display:flex; flex-direction: column; align-items:flex-start; gap:8px; pointer-events: none; width: clamp(220px, 50vw, 420px); z-index: 60; }
.ephemeral-stack-chat { position:fixed; right: 16px; bottom: 70px; display:flex; flex-direction: column; align-items:flex-end; gap:8px; pointer-events: none; width: clamp(220px, 50vw, 420px); z-index: 60; }
.bubble { max-width: 100%; background:#333; color:#fff; padding:8px 10px; border-radius:12px; box-shadow:0 8px 16px rgba(0,0,0,0.25); transition: opacity 0.5s ease; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
.bubble.k-p2_accept { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.bubble.k-p2_reject { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.bubble.k-p2_snatch { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.bubble.k-p1_shame { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.bubble.k-p1_no_shame { background: #6b7280; }
.bubble.k-p1_report { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
.bubble.k-p1_no_report { background: #6b7280; }
.bubble.k-p1_no_offer { background: #6b7280; }
.bubble.k-p1_propose { background: linear-gradient(135deg, #667eea 0%, #5a67d8 100%); }
.bubble.k-variant_change { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.bubble.k-round_advance { background: linear-gradient(135deg, #2196f3 0%, #1e88e5 100%); }
.bubble.fading { opacity: 0; }
/* TransitionGroup animations for stacking upward smoothly and fading */
.ephem-enter-from { opacity: 0; transform: translateY(-8px); }
.ephem-enter-to { opacity: 1; transform: translateY(0); }
.ephem-enter-active { transition: all 0.25s ease; }
.ephem-leave-from { opacity: 1; transform: translateY(0); }
.ephem-leave-to { opacity: 0; transform: translateY(0); }
.ephem-leave-active { transition: opacity 0.5s ease; position: absolute; }
.ephem-move { transition: transform 0.25s ease; }
@keyframes fadein { from { opacity:0; transform: translateY(8px);} to { opacity:1; transform: translateY(0);} }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display:flex; align-items:flex-end; justify-content:center; padding: 8px; }
.modal { width: 100%; max-width: 480px; background:#fff; border-radius: 10px; box-shadow: 0 -10px 30px rgba(0,0,0,0.25); display:flex; flex-direction:column; max-height: 70vh; }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:4px 6px; border-bottom:1px solid #eee; min-height: 28px; }
.modal-header.compact .title { font-weight:600; font-size: 12px; line-height: 1; }
.messages { padding: 10px; overflow:auto; display:flex; flex-direction:column; gap:10px; flex: 1 1 auto; }
.modal-composer { display:flex; gap:8px; padding:8px 10px; border-top:1px solid #eee; }
.modal-composer input { flex:1; padding:8px; border:1px solid #e0e0e0; border-radius:8px; }
.btn.close { width: 22px; height: 22px; padding: 0; line-height: 1; display: inline-flex; align-items:center; justify-content:center; border-radius: 6px; }
.msg { max-width: 75%; padding:8px 10px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.08); }
.msg .meta { font-size: 12px; color:#666; margin-bottom: 2px; display:flex; gap:8px; }
.msg .body { white-space: pre-wrap; }
.msg.mine { align-self: flex-end; background:#e3f2fd; }
.msg.theirs { align-self: flex-start; background:#f5f5f5; }
.msg.system { align-self: center; background:#fafafa; border:1px solid #eee; color:#333; }
.msg.system.k-p2_accept { border-left: 4px solid #10b981; }
.msg.system.k-p2_reject { border-left: 4px solid #f59e0b; }
.msg.system.k-p2_snatch { border-left: 4px solid #ef4444; }
.msg.system.k-p1_shame { border-left: 4px solid #f59e0b; }
.msg.system.k-p1_no_shame { border-left: 4px solid #6b7280; }
.msg.system.k-p1_report { border-left: 4px solid #7c3aed; }
.msg.system.k-p1_no_report { border-left: 4px solid #6b7280; }
.msg.system.k-p1_no_offer { border-left: 4px solid #6b7280; }
.msg.system.k-p1_propose { border-left: 4px solid #667eea; }
.msg.system.k-variant_change { border-left: 4px solid #764ba2; }
.msg.system.k-round_advance { border-left: 4px solid #2196f3; }
</style>
