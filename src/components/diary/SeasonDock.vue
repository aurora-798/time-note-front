<script setup>
import { useSeasonStore } from '@/store/season'

const seasonStore = useSeasonStore()
</script>

<template>
  <div class="season-dock">
    <div class="season-dock__label">
      <span class="season-dock__k">四季</span>
      <span class="season-dock__sub">点选切换</span>
    </div>
    <div class="season-dock__swatches">
      <button
        v-for="s in seasonStore.seasons"
        :key="s.key"
        type="button"
        class="season-swatch"
        :class="{ 'is-active': seasonStore.season === s.key }"
        :style="{ '--sw': s.swatch }"
        :title="`切换为「${s.name}・${s.sub}」背景`"
        :aria-pressed="seasonStore.season === s.key"
        @click="seasonStore.setSeason(s.key)"
      />
    </div>
  </div>
</template>

<style scoped>
.season-dock {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom, 0));
  left: max(20px, env(safe-area-inset-left, 0));
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 12px;
  border-radius: 100px;
  background: rgba(255, 252, 248, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 24px rgba(230, 126, 154, 0.1), 0 2px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: box-shadow 0.35s, transform 0.35s;
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
  gap: 9px;
}
.season-swatch {
  position: relative;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: var(--sw);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.65);
  transition: transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.season-swatch::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: border-color 0.3s, box-shadow 0.3s;
  pointer-events: none;
}
.season-swatch:hover {
  transform: scale(1.14);
}
.season-swatch.is-active {
  transform: scale(1.06);
}
.season-swatch.is-active::after {
  border-color: #e67e9a;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4px rgba(230, 126, 154, 0.55);
}
@media (max-width: 767px) {
  .season-dock {
    bottom: max(14px, env(safe-area-inset-bottom, 0));
    left: max(14px, env(safe-area-inset-left, 0));
  }
}
</style>
