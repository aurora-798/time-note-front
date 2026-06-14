<script setup>
/**
 * 点阵波浪背景（Canvas 2D 还原 three.js dotted-surface）
 * - 在 X/Z 平面铺一张点阵，Y 方向用双正弦波驱动起伏
 * - 手写透视投影（相机在 (0,355,1220) 看向原点，FOV 60）
 * - 主题响应：亮色深点 / 暗色浅灰点，远处随「雾」淡出
 */
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/store/theme'

const { theme } = storeToRefs(useThemeStore())

const canvasRef = ref(null)

// 点阵参数（与参考组件一致）
const SEPARATION = 150
const AMOUNTX = 40
const AMOUNTY = 60
const FOV = 60
// 相机
const CAM = { x: 0, y: 355, z: 1220 }
// 雾：[近, 远]，远处点淡出
const FOG_NEAR = 2000
const FOG_FAR = 9000

let ctx = null
let rafId = 0
let width = 0
let height = 0
let dpr = 1
let count = 0

// 相机基向量（lookAt 原点，世界 up=(0,1,0)）——相机固定，预先算好
// zAxis 指向相机背后
const len = Math.hypot(CAM.y, CAM.z)
const zAxis = { x: 0, y: CAM.y / len, z: CAM.z / len }
const xAxis = { x: 1, y: 0, z: 0 }
// yAxis = zAxis × xAxis
const yAxis = {
  x: zAxis.y * 0 - zAxis.z * 0,
  y: zAxis.z * xAxis.x - zAxis.x * 0,
  z: zAxis.x * 0 - zAxis.y * xAxis.x,
}

// 当前绘制颜色（rgb，alpha 在绘制时按雾计算）
let dotRGB = '0,0,0'
let baseAlpha = 0.8
function applyThemeColor(t) {
  if (t === 'dark') {
    dotRGB = '200,200,200'
    baseAlpha = 0.85
  } else {
    dotRGB = '40,42,70'
    baseAlpha = 0.55
  }
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function render() {
  rafId = requestAnimationFrame(render)
  if (!ctx) return

  ctx.clearRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2
  // 焦距：让竖直 FOV=60
  const focal = cy / Math.tan((FOV * Math.PI) / 180 / 2)

  ctx.fillStyle = `rgb(${dotRGB})`

  for (let ix = 0; ix < AMOUNTX; ix++) {
    for (let iy = 0; iy < AMOUNTY; iy++) {
      const wx = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2
      const wy =
        Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50
      const wz = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2

      // 相对相机
      const rx = wx - CAM.x
      const ry = wy - CAM.y
      const rz = wz - CAM.z

      // 投影到相机空间
      const camX = rx * xAxis.x + ry * xAxis.y + rz * xAxis.z
      const camY = rx * yAxis.x + ry * yAxis.y + rz * yAxis.z
      const camZ = rx * zAxis.x + ry * zAxis.y + rz * zAxis.z

      // camZ<0 表示在相机前方；depth 为正深度
      const depth = -camZ
      if (depth <= 1) continue

      const sx = cx + (camX * focal) / depth
      const sy = cy - (camY * focal) / depth
      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue

      // 点大小随距离衰减（模拟 sizeAttenuation）：近处约 2-3px，远处淡小
      const r = Math.max(0.4, Math.min(4, (3.5 * focal) / depth))

      // 雾：远处淡出
      const fog =
        depth <= FOG_NEAR
          ? 0
          : Math.min(1, (depth - FOG_NEAR) / (FOG_FAR - FOG_NEAR))
      const alpha = baseAlpha * (1 - fog)
      if (alpha <= 0.01) continue

      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  count += 0.1
}

watch(theme, (t) => applyThemeColor(t))

onMounted(() => {
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  applyThemeColor(theme.value)
  resize()
  window.addEventListener('resize', resize)
  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  ctx = null
})
</script>

<template>
  <canvas ref="canvasRef" class="dotted-surface" aria-hidden="true" />
</template>

<style scoped>
.dotted-surface {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  display: block;
}
</style>
