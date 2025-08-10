<template>
  <div class="chat-widget">
    <TransitionGroup name="ephem" tag="div" class="ephemeral-stack" v-if="ephemeralBubbles.length">
      <div class="bubble" :class="{ fading: e.fading }" v-for="e in ephemeralBubbles" :key="e.id">{{ e.text }}</div>
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
            :class="['msg', m.mine ? 'mine' : 'theirs']"
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
}

const text = ref("");
const isComposerFocused = ref(false);
const messages = ref<ChatMsg[]>([]);
const showModal = ref(false);
const messagesEl = ref<HTMLDivElement | null>(null);
const ephemeralBubbles = ref<{ id: string; text: string; expiresAt: number; fading?: boolean }[]>([]);

const ephemeralTimers = new Map<string, { fade?: any; remove?: any }>();
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
  };
  messages.value.push(msg);
  scrollToBottomSoon();

  if (!mine) {
    queueEphemeral(msg.id, msg.text);
  }
}

function openModal() { showModal.value = true; }
function closeModal() { showModal.value = false; }

function queueEphemeral(id: string, t: string) {
  // Compute duration based on words: min 3s, +0.5s per word up to 15s
  const words = (t || '').trim().split(/\s+/).filter(Boolean).length;
  const computed = Math.min(15, Math.max(3, words * 0.5));
  const now = Date.now();
  const upperMax = ephemeralBubbles.value.length
    ? Math.max(...ephemeralBubbles.value.map(e => e.expiresAt))
    : 0;
  const expiresAt = Math.max(now + computed * 1000, upperMax || 0);

  const bubble = { id, text: t, expiresAt };
  ephemeralBubbles.value.push(bubble);

  // Schedule removal when its time comes
  // Clear old timers if any
  if (ephemeralTimers.has(id)) {
    const t = ephemeralTimers.get(id)!;
    if (t.fade) clearTimeout(t.fade);
    if (t.remove) clearTimeout(t.remove);
  }
  const delay = Math.max(0, expiresAt - now);
  const startDelay = Math.max(0, delay - FADE_MS);
  const fadeTimer = setTimeout(() => {
    const b = ephemeralBubbles.value.find(e => e.id === id);
    if (b) b.fading = true;
  }, startDelay);
  const removeTimer = setTimeout(() => {
    const idx = ephemeralBubbles.value.findIndex(e => e.id === id);
    if (idx !== -1) ephemeralBubbles.value.splice(idx, 1);
    ephemeralTimers.delete(id);
  }, delay);
  ephemeralTimers.set(id, { fade: fadeTimer, remove: removeTimer });
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
  for (const [, obj] of ephemeralTimers) {
    if (obj.fade) clearTimeout(obj.fade);
    if (obj.remove) clearTimeout(obj.remove);
  }
  ephemeralTimers.clear();
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

.ephemeral-stack { position:absolute; right: 0; bottom: 56px; display:flex; flex-direction: column; align-items:flex-end; gap:8px; pointer-events: none; width: clamp(220px, 50vw, 380px); }
.bubble { max-width: 100%; background:#333; color:#fff; padding:8px 10px; border-radius:12px; box-shadow:0 8px 16px rgba(0,0,0,0.25); transition: opacity 0.5s ease; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
.bubble.fading { opacity: 0; }
/* TransitionGroup animations for stacking upward smoothly and fading */
.ephem-enter-from { opacity: 0; transform: translateY(10px); }
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
</style>
