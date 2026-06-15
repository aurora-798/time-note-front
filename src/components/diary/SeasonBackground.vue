<script setup>
// 全屏四季氛围背景层 + 浮动光球
// 光球用抽象柔光球替代 laladiary 的版权照片素材
const orbs = [
  { top: '12%', left: '8%', size: 220, dur: 19, delay: 0 },
  { top: '64%', left: '78%', size: 260, dur: 23, delay: 2 },
  { top: '30%', left: '60%', size: 140, dur: 17, delay: 1 },
  { top: '78%', left: '20%', size: 180, dur: 21, delay: 3 },
]
</script>

<template>
  <div class="season-bg" aria-hidden="true">
    <span
      v-for="(o, i) in orbs"
      :key="i"
      class="season-orb"
      :style="{
        top: o.top,
        left: o.left,
        width: o.size + 'px',
        height: o.size + 'px',
        background: 'var(--season-glow)',
        animationDuration: o.dur + 's',
        animationDelay: o.delay + 's',
      }"
    />
  </div>
</template>
