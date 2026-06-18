<script setup>
import { useSeasonStore } from '@/store/season'

const seasonStore = useSeasonStore()
</script>

<template>
  <div class="season-dock">
    <div class="season-dock__label">
      <span class="season-dock__k">背景</span>
      <span class="season-dock__sub">点选切换</span>
    </div>
    <div class="season-dock__swatches">
      <button
        v-for="bg in seasonStore.backgrounds"
        :key="bg.key"
        type="button"
        class="bg-thumb"
        :class="{ 'is-active': seasonStore.background === bg.key }"
        :style="{ backgroundImage: `url(${bg.url})` }"
        :title="`切换为「${bg.name}」`"
        :aria-pressed="seasonStore.background === bg.key"
        @click="seasonStore.setBackground(bg.key)"
      />
    </div>
  </div>
</template>

<style scoped>
.season-dock {
  position: relative;
  width: fit-content;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 12px;
  border-radius: 100px;
  background: rgba(255, 252, 248, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 24px rgba(230, 126, 154, 0.1), 0 2px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: box-shadow 0.35s;
}
.season-dock:hover {
  box-shadow: 0 8px 32px rgba(230, 126, 154, 0.16), 0 4px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 #fff;
}
.season-dock__label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-right: 4px;
  border-right: 1px solid rgba(230, 126, 154, 0.18);
  user-select: none;
}
.season-dock__k {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(230, 126, 154, 0.85);
  line-height: 1.2;
}
.season-dock__sub {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.32);
  letter-spacing: 0.08em;
  line-height: 1.2;
}
.season-dock__swatches {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bg-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 30px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  cursor: pointer;
  background-size: cover;
  background-position: center;
  background-color: rgba(255, 245, 248, 0.6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), border-color 0.2s,
    box-shadow 0.2s;
}
.bg-thumb::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: border-color 0.25s, box-shadow 0.25s;
  pointer-events: none;
}
.bg-thumb:hover {
  transform: scale(1.08);
}
.bg-thumb.is-active {
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 12px rgba(230, 126, 154, 0.28);
}
.bg-thumb.is-active::after {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4px rgba(230, 126, 154, 0.45);
}
@media (max-width: 767px) {
  .season-dock {
    max-width: 100%;
  }
  .bg-thumb {
    width: 38px;
    height: 26px;
  }
}
</style>
