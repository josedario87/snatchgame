<template>
  <img 
    :src="logoSrc"
    alt="SnatchGame"
    :class="['game-logo', sizeClass]"
    :style="customSize ? { maxWidth: customSize, maxHeight: customSize } : {}"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  size?: 'small' | 'medium' | 'large' | 'custom';
  customSize?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
});

const logoSrc = '/SnatchGame.png?v=2';

const sizeClass = computed(() => `size-${props.size}`);
</script>

<style scoped>
.game-logo {
  display: inline-block;
  object-fit: contain;
  width: auto;
  height: auto;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.size-small {
  max-width: 32px;
  max-height: 32px;
}

.size-medium {
  max-width: 64px;
  max-height: 64px;
}

.size-large {
  max-width: 128px;
  max-height: 128px;
}

.size-custom {
  /* Size set via style prop */
}

/* Hover effect for interactive contexts */
.game-logo:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}
</style>