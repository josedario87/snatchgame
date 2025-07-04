<template>
  <div class="offers-container">
    <h3>Ofertas Comerciales</h3>
    <div class="offers-scroll-area" ref="scrollArea">
      <div class="offers-content">
        <TradeOfferCard
          v-for="offer in offers" 
          :key="offer.id"
          :offer="offer"
          :current-player-id="currentPlayerId"
          :get-player-name="getPlayerName"
          @cancel="$emit('cancel', $event)"
          @respond="$emit('respond', $event, arguments[1])"
        />
        <div v-if="offers.length === 0" class="no-offers">
          No hay ofertas activas
        </div>
      </div>
      <div class="custom-scrollbar" v-show="showScrollbar">
        <div 
          class="scrollbar-thumb" 
          :style="{ 
            height: thumbHeight + '%', 
            top: thumbPosition + '%' 
          }"
          @mousedown="startDrag"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { TradeOffer } from '@/types'
import TradeOfferCard from './TradeOfferCard.vue'

defineProps<{
  offers: TradeOffer[]
  currentPlayerId: string
  getPlayerName: (playerId: string) => string
}>()

defineEmits<{
  cancel: [offerId: string]
  respond: [offerId: string, response: string]
}>()

const scrollArea = ref<HTMLElement>()
const showScrollbar = ref(false)
const thumbHeight = ref(100)
const thumbPosition = ref(0)
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartScrollTop = ref(0)

const updateScrollbar = () => {
  if (!scrollArea.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = scrollArea.value
  const isScrollable = scrollHeight > clientHeight
  
  showScrollbar.value = isScrollable
  
  if (isScrollable) {
    thumbHeight.value = (clientHeight / scrollHeight) * 100
    thumbPosition.value = (scrollTop / (scrollHeight - clientHeight)) * (100 - thumbHeight.value)
  }
}

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStartY.value = e.clientY
  dragStartScrollTop.value = scrollArea.value?.scrollTop || 0
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !scrollArea.value) return
  
  const deltaY = e.clientY - dragStartY.value
  const scrollAreaHeight = scrollArea.value.clientHeight
  const scrollableHeight = scrollArea.value.scrollHeight - scrollAreaHeight
  const scrollRatio = deltaY / scrollAreaHeight
  
  scrollArea.value.scrollTop = dragStartScrollTop.value + (scrollRatio * scrollableHeight)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const onScroll = () => {
  updateScrollbar()
}

onMounted(() => {
  if (scrollArea.value) {
    scrollArea.value.addEventListener('scroll', onScroll)
    updateScrollbar()
    
    // Watch for content changes
    const observer = new ResizeObserver(() => {
      nextTick(() => updateScrollbar())
    })
    observer.observe(scrollArea.value)
    
    onUnmounted(() => {
      observer.disconnect()
    })
  }
})

onUnmounted(() => {
  if (scrollArea.value) {
    scrollArea.value.removeEventListener('scroll', onScroll)
  }
  stopDrag()
})
</script>

<style scoped>
.offers-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.offers-container h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  text-align: center;
}

.offers-scroll-area {
  position: relative;
  flex: 1;
  overflow: hidden;
  padding-right: 8px;
}

.offers-content {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

/* Hide default scrollbar */
.offers-content::-webkit-scrollbar {
  display: none;
}

.offers-content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-scrollbar {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.scrollbar-thumb {
  position: absolute;
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.7);
}

.no-offers {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .offers-container {
    max-height: 300px;
  }
}

/* Desktop optimizations */
@media (min-width: 769px) {
  .offers-container {
    min-height: 400px;
  }
}
</style>