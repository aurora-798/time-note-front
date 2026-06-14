<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  size: { type: Number, default: 18 },
  pupilSize: { type: Number, default: 7 },
  maxDistance: { type: Number, default: 5 },
  eyeColor: { type: String, default: 'white' },
  pupilColor: { type: String, default: '#2D2D2D' },
  isBlinking: { type: Boolean, default: false },
  forceLookX: { type: Number, default: undefined },
  forceLookY: { type: Number, default: undefined },
})

const mouseX = ref(0)
const mouseY = ref(0)
const eyeRef = ref(null)

function handleMouseMove(e) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(() => window.addEventListener('mousemove', handleMouseMove))
onUnmounted(() => window.removeEventListener('mousemove', handleMouseMove))

const pupilPosition = computed(() => {
  if (props.forceLookX !== undefined && props.forceLookY !== undefined) {
    return { x: props.forceLookX, y: props.forceLookY }
  }
  if (!eyeRef.value) return { x: 0, y: 0 }

  const rect = eyeRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = mouseX.value - cx
  const dy = mouseY.value - cy
  const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), props.maxDistance)
  const angle = Math.atan2(dy, dx)

  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
})
</script>

<template>
  <div
    ref="eyeRef"
    class="eyeball"
    :style="{
      width: size + 'px',
      height: isBlinking ? '2px' : size + 'px',
      backgroundColor: eyeColor,
    }"
  >
    <div
      v-if="!isBlinking"
      class="eyeball-pupil"
      :style="{
        width: pupilSize + 'px',
        height: pupilSize + 'px',
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
      }"
    />
  </div>
</template>

<style scoped>
.eyeball {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: height 0.15s;
  overflow: hidden;
}
.eyeball-pupil {
  border-radius: 50%;
  transition: transform 0.1s ease-out;
}
</style>
