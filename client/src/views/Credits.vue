<template>
  <div class="credits-page">
    <div class="card">
      <div class="header">
        <button class="btn-back" @click="goBack" title="Volver">
          ← Volver
        </button>
        <h1>Créditos de SnatchGame</h1>
      </div>

      <div class="content">
        <p>
          SnatchGame es un proyecto abierto y de uso público, sin fines de lucro.
        </p>
        <ul class="list">
          <li>
            Creado por <strong>Nucleo Inteligencia</strong>
          </li>
          <li>
            Año de creación: <strong>2025</strong>
          </li>
          <li>
            Contacto: <a href="mailto:firstcontact@nucleoriofrio.com">firstcontact@nucleoriofrio.com</a>
          </li>
        </ul>

        <p class="note">
          Gracias por jugar y contribuir a la comunidad. Si querés colaborar, difundir o proponer mejoras, ¡escribinos!
        </p>

        <!-- Sección de mensajes -->
        <div class="messages-section">
          <h2>Mensajes de la comunidad</h2>
          <div class="message-input-group">
            <textarea
              v-model="newMessage"
              placeholder="Deja tu mensaje, sugerencia o comentario..."
              class="message-input"
              maxlength="500"
              rows="3"
            ></textarea>
            <div class="input-actions">
              <span class="char-count">{{ newMessage.length }}/500</span>
              <button 
                @click="submitMessage" 
                :disabled="!newMessage.trim() || isSubmitting"
                class="btn-submit"
              >
                {{ isSubmitting ? 'Enviando...' : 'Enviar mensaje' }}
              </button>
            </div>
          </div>

          <div v-if="messages.length > 0" class="messages-list">
            <div class="messages-header">
              <h3>Mensajes recibidos ({{ messages.length }})</h3>
              <button @click="downloadMessages" class="btn-download">
                📥 Descargar .md
              </button>
            </div>
            <div class="messages-container">
              <div 
                v-for="(message, index) in messages" 
                :key="message.id"
                class="message-item"
              >
                <div class="message-meta">
                  <span class="message-number">#{{ messages.length - index }}</span>
                  <span class="message-date">{{ formatDate(message.timestamp) }}</span>
                </div>
                <div class="message-content">{{ message.content }}</div>
              </div>
            </div>
          </div>
          <div v-else class="no-messages">
            No hay mensajes todavía. ¡Sé el primero en dejar uno!
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface Message {
  id: string;
  content: string;
  timestamp: number;
}

const router = useRouter();
const newMessage = ref('');
const messages = ref<Message[]>([]);
const isSubmitting = ref(false);

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/');
}

async function submitMessage() {
  if (!newMessage.value.trim() || isSubmitting.value) return;
  
  isSubmitting.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMessage.value.trim() })
    });
    
    if (response.ok) {
      newMessage.value = '';
      await loadMessages(); // Recargar mensajes
    } else {
      console.error('Failed to submit message');
    }
  } catch (error) {
    console.error('Error submitting message:', error);
  } finally {
    isSubmitting.value = false;
  }
}

async function loadMessages() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/messages`);
    if (response.ok) {
      const data = await response.json();
      messages.value = data.messages || [];
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    messages.value = [];
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function downloadMessages() {
  if (messages.value.length === 0) return;
  
  let markdown = '# Mensajes de la comunidad - SnatchGame\n\n';
  markdown += `Generado el: ${new Date().toLocaleString('es-AR')}\n`;
  markdown += `Total de mensajes: ${messages.value.length}\n\n---\n\n`;
  
  // Ordenar mensajes por timestamp (más recientes primero)
  const sortedMessages = [...messages.value].sort((a, b) => b.timestamp - a.timestamp);
  
  sortedMessages.forEach((message, index) => {
    markdown += `## Mensaje #${sortedMessages.length - index}\n\n`;
    markdown += `**Fecha:** ${formatDate(message.timestamp)}\n\n`;
    markdown += `${message.content}\n\n---\n\n`;
  });
  
  // Crear y descargar el archivo
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `snatchgame-mensajes-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

onMounted(() => {
  loadMessages();
});
</script>

<style scoped>
.credits-page {
  min-height: calc(var(--app-vh, 1vh) * 100);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.card {
  width: 100%;
  max-width: 780px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  padding: 24px;
}
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.btn-back { background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.header h1 { margin: 0; font-size: 20px; color: #334155; }
.content { color: #334155; }
.list { margin: 12px 0; padding-left: 18px; }
.list li { margin: 6px 0; }
.note { margin-top: 12px; font-size: 14px; color: #475569; }

/* Messages section styles */
.messages-section {
  margin-top: 32px;
  border-top: 1px solid rgba(0,0,0,0.1);
  padding-top: 24px;
}

.messages-section h2 {
  color: #334155;
  margin-bottom: 16px;
  font-size: 18px;
}

.message-input-group {
  margin-bottom: 24px;
}

.message-input {
  width: 100%;
  padding: 12px;
  border: 2px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  background: rgba(255,255,255,0.8);
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.char-count {
  font-size: 12px;
  color: #64748b;
}

.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.messages-header h3 {
  margin: 0;
  color: #334155;
  font-size: 16px;
}

.btn-download {
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.1);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  transition: all 0.2s;
}

.btn-download:hover {
  background: rgba(255,255,255,0.8);
  transform: translateY(-1px);
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.4);
}

.message-item {
  padding: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.message-item:last-child {
  border-bottom: none;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #64748b;
}

.message-number {
  font-weight: 600;
  color: #667eea;
}

.message-content {
  color: #334155;
  line-height: 1.4;
  white-space: pre-wrap;
}

.no-messages {
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 24px;
  background: rgba(255,255,255,0.3);
  border-radius: 8px;
  border: 1px dashed rgba(0,0,0,0.1);
}

@media (max-width: 640px) {
  .card { padding: 18px; }
  .header h1 { font-size: 18px; }
  
  .messages-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .input-actions {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .btn-submit {
    width: 100%;
  }
}
</style>

