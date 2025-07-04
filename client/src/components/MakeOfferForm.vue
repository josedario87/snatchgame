<template>
  <div class="make-offer-form">
    <h4>Hacer Oferta</h4>
    <div class="offer-form">
      <div v-if="!preSelectedTarget" class="target-selection">
        <label>Ofrecer a:</label>
        <select v-model="form.targetId">
          <option value="">Seleccionar jugador</option>
          <option 
            v-for="player in otherPlayers" 
            :key="player.id"
            :value="player.id"
          >
            {{ player.name }}
          </option>
        </select>
      </div>
      
      <div class="tokens-form">
        <div class="form-section">
          <label>Ofrecer:</label>
          <div class="token-inputs">
            <div class="token-input-compact">
              <span class="token-emoji">🦃</span>
              <button @click="adjustToken('offering', 'turkey', -1)" class="quantity-btn minus-btn">-</button>
              <input 
                type="number" 
                v-model.number="form.offering.turkey" 
                min="0" 
                max="999"
                class="quantity-input"
                @input="validateInput('offering', 'turkey', $event)"
              >
              <button @click="adjustToken('offering', 'turkey', 1)" class="quantity-btn plus-btn">+</button>
            </div>
            <div class="token-input-compact">
              <span class="token-emoji">☕</span>
              <button @click="adjustToken('offering', 'coffee', -1)" class="quantity-btn minus-btn">-</button>
              <input 
                type="number" 
                v-model.number="form.offering.coffee" 
                min="0" 
                max="999"
                class="quantity-input"
                @input="validateInput('offering', 'coffee', $event)"
              >
              <button @click="adjustToken('offering', 'coffee', 1)" class="quantity-btn plus-btn">+</button>
            </div>
            <div class="token-input-compact">
              <span class="token-emoji">🌽</span>
              <button @click="adjustToken('offering', 'corn', -1)" class="quantity-btn minus-btn">-</button>
              <input 
                type="number" 
                v-model.number="form.offering.corn" 
                min="0" 
                max="999"
                class="quantity-input"
                @input="validateInput('offering', 'corn', $event)"
              >
              <button @click="adjustToken('offering', 'corn', 1)" class="quantity-btn plus-btn">+</button>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <label>Por:</label>
          <div class="token-inputs">
            <div class="token-input-compact">
              <span class="token-emoji">🦃</span>
              <button @click="adjustToken('requesting', 'turkey', -1)" class="quantity-btn minus-btn">-</button>
              <input 
                type="number" 
                v-model.number="form.requesting.turkey" 
                min="0" 
                max="999"
                class="quantity-input"
                @input="validateInput('requesting', 'turkey', $event)"
              >
              <button @click="adjustToken('requesting', 'turkey', 1)" class="quantity-btn plus-btn">+</button>
            </div>
            <div class="token-input-compact">
              <span class="token-emoji">☕</span>
              <button @click="adjustToken('requesting', 'coffee', -1)" class="quantity-btn minus-btn">-</button>
              <input 
                type="number" 
                v-model.number="form.requesting.coffee" 
                min="0" 
                max="999"
                class="quantity-input"
                @input="validateInput('requesting', 'coffee', $event)"
              >
              <button @click="adjustToken('requesting', 'coffee', 1)" class="quantity-btn plus-btn">+</button>
            </div>
            <div class="token-input-compact">
              <span class="token-emoji">🌽</span>
              <button @click="adjustToken('requesting', 'corn', -1)" class="quantity-btn minus-btn">-</button>
              <input 
                type="number" 
                v-model.number="form.requesting.corn" 
                min="0" 
                max="999"
                class="quantity-input"
                @input="validateInput('requesting', 'corn', $event)"
              >
              <button @click="adjustToken('requesting', 'corn', 1)" class="quantity-btn plus-btn">+</button>
            </div>
          </div>
        </div>
      </div>
      
      <button 
        @click="submitOffer"
        class="make-offer-btn"
        :disabled="!canMakeOffer"
      >
        Hacer Oferta
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Player } from '@/types'

const props = defineProps<{
  otherPlayers: Player[]
  preSelectedTarget?: string
}>()

const emit = defineEmits<{
  makeOffer: [offerData: {
    targetId: string,
    offering: { turkey: number, coffee: number, corn: number },
    requesting: { turkey: number, coffee: number, corn: number }
  }]
}>()

const form = ref({
  targetId: props.preSelectedTarget || '',
  offering: { turkey: 0, coffee: 0, corn: 0 },
  requesting: { turkey: 0, coffee: 0, corn: 0 }
})

const canMakeOffer = computed(() => {
  if (!form.value.targetId) return false
  const hasOffering = form.value.offering.turkey > 0 || form.value.offering.coffee > 0 || form.value.offering.corn > 0
  const hasRequesting = form.value.requesting.turkey > 0 || form.value.requesting.coffee > 0 || form.value.requesting.corn > 0
  return hasOffering && hasRequesting
})

const adjustToken = (section: 'offering' | 'requesting', token: 'turkey' | 'coffee' | 'corn', delta: number) => {
  const currentValue = form.value[section][token]
  const newValue = Math.max(0, Math.min(999, currentValue + delta))
  form.value[section][token] = newValue
}

const validateInput = (section: 'offering' | 'requesting', token: 'turkey' | 'coffee' | 'corn', event: Event) => {
  const target = event.target as HTMLInputElement
  let value = parseInt(target.value) || 0
  value = Math.max(0, Math.min(999, value))
  form.value[section][token] = value
}

const submitOffer = () => {
  if (!canMakeOffer.value) return
  
  emit('makeOffer', {
    targetId: form.value.targetId,
    offering: { ...form.value.offering },
    requesting: { ...form.value.requesting }
  })
  
  // Reset form
  form.value.offering = { turkey: 0, coffee: 0, corn: 0 }
  form.value.requesting = { turkey: 0, coffee: 0, corn: 0 }
}
</script>

<style scoped>
.make-offer-form {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.make-offer-form h4 {
  margin-bottom: 0.75rem;
  text-align: center;
  font-size: 1.1rem;
}

.target-selection {
  margin-bottom: 1.5rem;
}

.target-selection label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.target-selection select {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  color: #333;
}

.tokens-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-section label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.token-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.token-input-compact {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 8px;
  gap: 0.75rem;
}

.token-emoji {
  font-size: 1.3rem;
  min-width: 32px;
  text-align: center;
}

.quantity-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.4rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.minus-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff5252);
  color: white;
}

.minus-btn:hover {
  background: linear-gradient(135deg, #ff5252, #ff1744);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 107, 107, 0.4);
}

.plus-btn {
  background: linear-gradient(135deg, #4CAF50, #43A047);
  color: white;
}

.plus-btn:hover {
  background: linear-gradient(135deg, #43A047, #388E3C);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
}

.quantity-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.quantity-input {
  width: 60px;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
}

.quantity-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.5);
}

/* Hide spinner arrows */
.quantity-input::-webkit-outer-spin-button,
.quantity-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.quantity-input[type=number] {
  -moz-appearance: textfield;
}

.make-offer-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.make-offer-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.make-offer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #666;
}

@media (max-width: 768px) {
  .tokens-form {
    grid-template-columns: 1fr;
  }
}
</style>