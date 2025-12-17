<template>
  <div class="anim-number" :class="[ animating ? (dir === 'inc' ? 'dir-inc' : 'dir-dec') : '', running ? 'run' : '', (!running && animating) ? 'prep' : '', pulse ? 'pulse' : '' ]">
    <div class="viewport" ref="viewportEl">
      <span class="measure">{{ display }}</span>
      <span v-if="animating" class="val old">{{ prev }}</span>
      <span class="val current">{{ display }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';

const props = defineProps<{ value: number; durationMs?: number; pulseOnFirst?: boolean; animateOnMount?: boolean }>();

const prev = ref<number>(props.animateOnMount ? 0 : (props.value ?? 0));
const display = ref<number>(props.animateOnMount ? 0 : (props.value ?? 0));
const animating = ref(false);
const running = ref(false);
const dir = ref<'inc' | 'dec'>('inc');
// handled via CSS classes start-inc/start-dec
const pulse = ref(false);
const viewportEl = ref<HTMLElement | null>(null);

async function animateToValue(newValue: number, oldValue: number) {
  if (newValue === oldValue) return;
  const d = (props.durationMs ?? 1500);
  dir.value = newValue > oldValue ? 'inc' : 'dec';
  // Setup animation
  display.value = newValue;
  animating.value = true;
  running.value = false;
  await nextTick();
  // Trigger run
  requestAnimationFrame(() => {
    running.value = true;
    setTimeout(() => {
      // End animation
      prev.value = newValue;
      animating.value = false;
      running.value = false;
    }, d);
  });
}

onMounted(async () => {
  if (props.pulseOnFirst) {
    pulse.value = true;
    setTimeout(() => { pulse.value = false; }, 600);
  }
  
  // Animate from 0 to initial value if animateOnMount is true
  if (props.animateOnMount && props.value !== 0) {
    await nextTick();
    await animateToValue(props.value, 0);
  } else if (!props.animateOnMount) {
    // Set initial values without animation
    prev.value = props.value ?? 0;
    display.value = props.value ?? 0;
  }
});

watch(() => props.value, async (nv) => {
  await animateToValue(nv, prev.value);
});
</script>

<style scoped>
.anim-number { display:inline-block; position: relative; height: 1.2em; overflow: hidden; vertical-align: baseline; }
.viewport { position: relative; display:inline-block; height: 1.2em; }
.measure { visibility: hidden; display:inline-block; }
.val { position: absolute; left: 0; right: 0; top: 0; transform: translateY(0); transition: transform 1.5s ease, opacity 1.5s ease; line-height: 1.2em; will-change: transform, opacity; }
.anim-number.prep .val { transition: none !important; }
.anim-number.dir-inc .current { transform: translateY(-100%); }
.anim-number.dir-dec .current { transform: translateY(100%); }
.anim-number.dir-inc .current,
.anim-number.dir-dec .current { opacity: 0.2; }
.anim-number.dir-inc.run .current,
.anim-number.dir-dec.run .current { transform: translateY(0); opacity: 1; }
.old { opacity: 1; }
.current { opacity: 1; }

/* Increase: old goes down, new comes from top */
.dir-inc.run .old { transform: translateY(100%); opacity: 0; }
.dir-inc.run .current { transform: translateY(0); }

/* Decrease: old goes up, new comes from bottom */
.dir-dec.run .old { transform: translateY(-100%); opacity: 0; }
.dir-dec.run .current { transform: translateY(0); }

/* Emphasis pulse */
.pulse { animation: pulse-pop 0.6s ease; }
@keyframes pulse-pop {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>
