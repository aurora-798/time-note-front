<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  isRecording: { type: Boolean, default: false },
  visualizerBars: { type: Number, default: 32 },
})

const emit = defineEmits(['start', 'stop'])

const time = ref(0)
let timer = null
const barHeights = ref([])

function initBars() {
  barHeights.value = Array.from({ length: props.visualizerBars }, () =>
    Math.max(15, Math.random() * 100),
  )
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

watch(
  () => props.isRecording,
  (recording) => {
    if (recording) {
      time.value = 0
      initBars()
      emit('start')
      timer = setInterval(() => {
        time.value += 1
        barHeights.value = barHeights.value.map(() => Math.max(15, Math.random() * 100))
      }, 1000)
    } else if (timer) {
      clearInterval(timer)
      timer = null
      const duration = time.value
      time.value = 0
      emit('stop', duration)
    }
  },
)

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="voice-recorder" :class="{ 'is-active': isRecording }">
    <div class="voice-meta">
      <span class="voice-dot" />
      <span class="voice-time">{{ formatTime(time) }}</span>
    </div>
    <div class="voice-bars">
      <div
        v-for="(h, i) in barHeights"
        :key="i"
        class="voice-bar"
        :style="{
          height: `${h}%`,
          animationDelay: `${i * 0.05}s`,
          animationDuration: `${0.5 + (i % 5) * 0.1}s`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: all 0.3s ease;
  opacity: 0;
  height: 0;
  overflow: hidden;
}
.voice-recorder.is-active {
  opacity: 1;
  height: auto;
  padding: 12px 0 4px;
}
.voice-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.voice-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  animation: pulse-dot 1.2s ease-in-out infinite;
}
.voice-time {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: var(--text-secondary);
}
.voice-bars {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 16px;
}
.voice-bar {
  width: 2px;
  border-radius: 999px;
  background: rgba(230, 126, 154, 0.55);
  animation: bar-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}
@keyframes bar-pulse {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .voice-dot,
  .voice-bar {
    animation: none;
  }
}
</style>
