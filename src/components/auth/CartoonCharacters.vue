<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import EyeBall from './EyeBall.vue'
import Pupil from './Pupil.vue'

const props = defineProps({
  isTyping: { type: Boolean, default: false },
  password: { type: String, default: '' },
  showPassword: { type: Boolean, default: false },
})

const mouseX = ref(0)
const mouseY = ref(0)

const purpleRef = ref(null)
const blackRef = ref(null)
const yellowRef = ref(null)
const orangeRef = ref(null)

const isPurpleBlinking = ref(false)
const isBlackBlinking = ref(false)
const isLookingAtEachOther = ref(false)
const isPurplePeeking = ref(false)

function calculatePosition(refEl) {
  if (!refEl) return { faceX: 0, faceY: 0, bodySkew: 0 }
  const rect = refEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 3
  const dx = mouseX.value - cx
  const dy = mouseY.value - cy

  return {
    faceX: Math.max(-15, Math.min(15, dx / 20)),
    faceY: Math.max(-10, Math.min(10, dy / 30)),
    bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
  }
}

const positions = reactive({
  purple: { faceX: 0, faceY: 0, bodySkew: 0 },
  black: { faceX: 0, faceY: 0, bodySkew: 0 },
  yellow: { faceX: 0, faceY: 0, bodySkew: 0 },
  orange: { faceX: 0, faceY: 0, bodySkew: 0 },
})

function updatePositions() {
  positions.purple = calculatePosition(purpleRef.value)
  positions.black = calculatePosition(blackRef.value)
  positions.yellow = calculatePosition(yellowRef.value)
  positions.orange = calculatePosition(orangeRef.value)
}

// Mouse tracking with RAF
let rafId = null
function onMouseMoveUpdate(e) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      updatePositions()
      rafId = null
    })
  }
}

onMounted(() => window.addEventListener('mousemove', onMouseMoveUpdate))
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMoveUpdate)
  cancelAnimationFrame(rafId)
})

// Purple blinking
let purpleBlinkTimer = null
function schedulePurpleBlink() {
  const delay = Math.random() * 4000 + 3000
  purpleBlinkTimer = setTimeout(() => {
    isPurpleBlinking.value = true
    setTimeout(() => {
      isPurpleBlinking.value = false
      schedulePurpleBlink()
    }, 150)
  }, delay)
}
onMounted(() => schedulePurpleBlink())
onUnmounted(() => clearTimeout(purpleBlinkTimer))

// Black blinking
let blackBlinkTimer = null
function scheduleBlackBlink() {
  const delay = Math.random() * 4000 + 3000
  blackBlinkTimer = setTimeout(() => {
    isBlackBlinking.value = true
    setTimeout(() => {
      isBlackBlinking.value = false
      scheduleBlackBlink()
    }, 150)
  }, delay)
}
onMounted(() => scheduleBlackBlink())
onUnmounted(() => clearTimeout(blackBlinkTimer))

// Looking at each other when typing
let lookTimer = null
watch(() => props.isTyping, (val) => {
  if (val) {
    isLookingAtEachOther.value = true
    lookTimer = setTimeout(() => {
      isLookingAtEachOther.value = false
    }, 800)
  } else {
    isLookingAtEachOther.value = false
    clearTimeout(lookTimer)
  }
})

// Purple peeking when password visible
let peekTimer = null
function schedulePeek() {
  const delay = Math.random() * 3000 + 2000
  peekTimer = setTimeout(() => {
    isPurplePeeking.value = true
    setTimeout(() => {
      isPurplePeeking.value = false
      if (props.password.length > 0 && props.showPassword) {
        schedulePeek()
      }
    }, 800)
  }, delay)
}
watch([() => props.password, () => props.showPassword], ([pwd, show]) => {
  if (pwd.length > 0 && show) {
    schedulePeek()
  } else {
    isPurplePeeking.value = false
    clearTimeout(peekTimer)
  }
})
onUnmounted(() => clearTimeout(peekTimer))

// Computed transforms
const showPwd = computed(() => props.password.length > 0 && props.showPassword)
const typingOrHidden = computed(() => props.isTyping || (props.password.length > 0 && !props.showPassword))

const buildPurpleTransform = computed(() => {
  const p = positions.purple
  if (showPwd.value) return 'skewX(0deg)'
  if (typingOrHidden.value) return `skewX(${(p.bodySkew || 0) - 12}deg) translateX(40px)`
  return `skewX(${p.bodySkew || 0}deg)`
})

const buildBlackTransform = computed(() => {
  const p = positions.black
  if (showPwd.value) return 'skewX(0deg)'
  if (isLookingAtEachOther.value) return `skewX(${(p.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
  if (typingOrHidden.value) return `skewX(${(p.bodySkew || 0) * 1.5}deg)`
  return `skewX(${p.bodySkew || 0}deg)`
})

const buildOrangeTransform = computed(() => {
  if (showPwd.value) return 'skewX(0deg)'
  return `skewX(${positions.orange.bodySkew || 0}deg)`
})

const buildYellowTransform = computed(() => {
  if (showPwd.value) return 'skewX(0deg)'
  return `skewX(${positions.yellow.bodySkew || 0}deg)`
})

// Look direction helpers
const purpleLookX = computed(() => {
  if (showPwd.value) return isPurplePeeking.value ? 4 : -4
  if (isLookingAtEachOther.value) return 3
  return undefined
})
const purpleLookY = computed(() => {
  if (showPwd.value) return isPurplePeeking.value ? 5 : -4
  if (isLookingAtEachOther.value) return 4
  return undefined
})
const blackLookX = computed(() => {
  if (showPwd.value) return -4
  if (isLookingAtEachOther.value) return 0
  return undefined
})
const blackLookY = computed(() => {
  if (showPwd.value) return -4
  if (isLookingAtEachOther.value) return -4
  return undefined
})
</script>

<template>
  <div class="characters-container">
    <!-- Purple tall rectangle - Back layer -->
    <div
      ref="purpleRef"
      class="char char-purple"
      :class="{
        'char-purple--stretch': isTyping || (password.length > 0 && !showPassword),
        'char-purple--straight': password.length > 0 && showPassword,
      }"
      :style="{ transform: buildPurpleTransform }"
    >
      <div
        class="char-eyes char-eyes--purple"
        :class="{
          'char-eyes--look-right': isLookingAtEachOther,
          'char-eyes--peek': password.length > 0 && showPassword,
        }"
      >
        <EyeBall :size="18" :pupilSize="7" :maxDistance="5" eyeColor="white" pupilColor="#2D2D2D" :isBlinking="isPurpleBlinking" :forceLookX="purpleLookX" :forceLookY="purpleLookY" />
        <EyeBall :size="18" :pupilSize="7" :maxDistance="5" eyeColor="white" pupilColor="#2D2D2D" :isBlinking="isPurpleBlinking" :forceLookX="purpleLookX" :forceLookY="purpleLookY" />
      </div>
    </div>

    <!-- Black tall rectangle - Middle layer -->
    <div
      ref="blackRef"
      class="char char-black"
      :class="{
        'char-black--straight': password.length > 0 && showPassword,
      }"
      :style="{ transform: buildBlackTransform }"
    >
      <div
        class="char-eyes char-eyes--black"
        :class="{
          'char-eyes--look-left': isLookingAtEachOther,
          'char-eyes--peek': password.length > 0 && showPassword,
        }"
      >
        <EyeBall :size="16" :pupilSize="6" :maxDistance="4" eyeColor="white" pupilColor="#2D2D2D" :isBlinking="isBlackBlinking" :forceLookX="blackLookX" :forceLookY="blackLookY" />
        <EyeBall :size="16" :pupilSize="6" :maxDistance="4" eyeColor="white" pupilColor="#2D2D2D" :isBlinking="isBlackBlinking" :forceLookX="blackLookX" :forceLookY="blackLookY" />
      </div>
    </div>

    <!-- Orange semi-circle - Front left -->
    <div
      ref="orangeRef"
      class="char char-orange"
      :class="{ 'char-orange--straight': password.length > 0 && showPassword }"
      :style="{ transform: buildOrangeTransform }"
    >
      <div
        class="char-eyes char-eyes--orange"
        :class="{ 'char-eyes--peek': password.length > 0 && showPassword }"
      >
        <Pupil :size="12" :maxDistance="5" pupilColor="#2D2D2D" :forceLookX="password.length > 0 && showPassword ? -5 : undefined" :forceLookY="password.length > 0 && showPassword ? -4 : undefined" />
        <Pupil :size="12" :maxDistance="5" pupilColor="#2D2D2D" :forceLookX="password.length > 0 && showPassword ? -5 : undefined" :forceLookY="password.length > 0 && showPassword ? -4 : undefined" />
      </div>
    </div>

    <!-- Yellow semi-circle - Front right -->
    <div
      ref="yellowRef"
      class="char char-yellow"
      :class="{ 'char-yellow--straight': password.length > 0 && showPassword }"
      :style="{ transform: buildYellowTransform }"
    >
      <div
        class="char-eyes char-eyes--yellow"
        :class="{ 'char-eyes--peek': password.length > 0 && showPassword }"
      >
        <Pupil :size="12" :maxDistance="5" pupilColor="#2D2D2D" :forceLookX="password.length > 0 && showPassword ? -5 : undefined" :forceLookY="password.length > 0 && showPassword ? -4 : undefined" />
        <Pupil :size="12" :maxDistance="5" pupilColor="#2D2D2D" :forceLookX="password.length > 0 && showPassword ? -5 : undefined" :forceLookY="password.length > 0 && showPassword ? -4 : undefined" />
      </div>
      <div
        class="char-mouth"
        :class="{ 'char-mouth--peek': password.length > 0 && showPassword }"
      />
    </div>
  </div>
</template>

<style scoped>
.characters-container {
  position: relative;
  width: 550px;
  height: 400px;
  flex-shrink: 0;
  overflow: hidden;
}

.char {
  position: absolute;
  bottom: 0;
  transition: all 0.7s ease-in-out;
  transform-origin: bottom center;
}

/* Purple */
.char-purple {
  left: 70px;
  width: 180px;
  height: 340px;
  background-color: #6C3FF5;
  border-radius: 10px 10px 0 0;
  z-index: 1;
}
.char-purple--stretch {
  height: 390px;
}
.char-purple--straight {
  transform: skewX(0deg) !important;
}

/* Black */
.char-black {
  left: 240px;
  width: 120px;
  height: 310px;
  background-color: #2D2D2D;
  border-radius: 8px 8px 0 0;
  z-index: 2;
}
.char-black--straight {
  transform: skewX(0deg) !important;
}

/* Orange */
.char-orange {
  left: 0px;
  width: 240px;
  height: 200px;
  background-color: #FF9B6B;
  border-radius: 120px 120px 0 0;
  z-index: 3;
}
.char-orange--straight {
  transform: skewX(0deg) !important;
}

/* Yellow */
.char-yellow {
  left: 310px;
  width: 140px;
  height: 230px;
  background-color: #E8D754;
  border-radius: 70px 70px 0 0;
  z-index: 4;
}
.char-yellow--straight {
  transform: skewX(0deg) !important;
}

/* Eyes positioning */
.char-eyes {
  position: absolute;
  display: flex;
  transition: all 0.7s ease-in-out;
}

.char-eyes--purple {
  gap: 32px;
  left: 45px;
  top: 40px;
}
.char-eyes--look-right {
  left: 55px;
  top: 65px;
}
.char-eyes--peek.char-eyes--purple {
  left: 20px;
  top: 35px;
}

.char-eyes--black {
  gap: 24px;
  left: 26px;
  top: 32px;
}
.char-eyes--look-left {
  left: 32px;
  top: 12px;
}
.char-eyes--peek.char-eyes--black {
  left: 10px;
  top: 28px;
}

.char-eyes--orange {
  gap: 32px;
  left: 82px;
  top: 90px;
  transition: all 0.2s ease-out;
}
.char-eyes--peek.char-eyes--orange {
  left: 50px;
  top: 85px;
}

.char-eyes--yellow {
  gap: 24px;
  left: 52px;
  top: 40px;
  transition: all 0.2s ease-out;
}
.char-eyes--peek.char-eyes--yellow {
  left: 20px;
  top: 35px;
}

/* Mouth */
.char-mouth {
  position: absolute;
  width: 80px;
  height: 4px;
  background-color: #2D2D2D;
  border-radius: 2px;
  left: 40px;
  top: 88px;
  transition: all 0.2s ease-out;
}
.char-mouth--peek {
  left: 10px;
  top: 88px;
}
</style>
