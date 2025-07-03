<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>Configuración</h2>
      <button @click="$emit('close')" class="close-button">
        <span>✕</span>
      </button>
    </div>

    <div class="settings-content">
      <div class="setting-section">
        <h3>Desarrollo</h3>
        
        <div class="setting-item">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              :checked="debugLoggingEnabled" 
              @change="toggleDebugLogging"
            />
            <span class="checkmark"></span>
            <span class="label-text">Activar logs de depuración</span>
          </label>
          <p class="setting-description">
            Muestra información detallada en la consola del navegador. 
            Útil para depuración pero puede afectar el rendimiento.
          </p>
        </div>
      </div>

      <div class="setting-section">
        <h3>Información</h3>
        <div class="info-item">
          <span class="info-label">Versión:</span>
          <span class="info-value">0.0.1-alpha</span>
        </div>
        <div class="info-item">
          <span class="info-label">Entorno:</span>
          <span class="info-value">{{ environment }}</span>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <button @click="$emit('close')" class="button-primary">
        Cerrar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { logger } from '@/services/logger'

defineEmits<{
  close: []
}>()

const debugLoggingEnabled = ref(false)
const environment = import.meta.env.MODE

onMounted(() => {
  debugLoggingEnabled.value = logger.isDebugEnabled()
})

const toggleDebugLogging = (event: Event) => {
  const target = event.target as HTMLInputElement
  debugLoggingEnabled.value = target.checked
  logger.setDebugEnabled(target.checked)
}
</script>

<style scoped>
.settings-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  color: #333;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.settings-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: #e0e0e0;
}

.settings-content {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.setting-section {
  margin-bottom: 2rem;
}

.setting-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #555;
}

.setting-item {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  gap: 0.75rem;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
  margin-top: 1px;
  transition: all 0.2s;
}

.checkbox-label input[type="checkbox"]:checked + .checkmark {
  background: #667eea;
  border-color: #667eea;
}

.checkbox-label input[type="checkbox"]:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.label-text {
  font-weight: 500;
  line-height: 1.4;
}

.setting-description {
  margin: 0.5rem 0 0 2.75rem;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #555;
}

.info-value {
  color: #333;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.9rem;
}

.settings-footer {
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
  text-align: right;
}

.button-primary {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button-primary:hover {
  background: #5a6fd8;
}

/* Overlay */
.settings-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: -1;
}
</style>