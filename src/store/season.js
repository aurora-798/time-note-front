import { defineStore } from 'pinia'
import { ref } from 'vue'

export const SEASONS = [
  { key: 'spring', name: '春', sub: '桃蹊', swatch: 'linear-gradient(135deg,#ffc2d6,#e7c9ff)' },
  { key: 'summer', name: '夏', sub: '蒲絮', swatch: 'linear-gradient(135deg,#a7ead7,#bfe6ff)' },
  { key: 'autumn', name: '秋', sub: '芦汀', swatch: 'linear-gradient(135deg,#ffd79a,#f0b48a)' },
  { key: 'winter', name: '冬', sub: '寒梅', swatch: 'linear-gradient(135deg,#bfe0ff,#d9ccff)' },
]

const KEY = 'tn-season'

function resolveInitial() {
  const saved = localStorage.getItem(KEY)
  if (SEASONS.some((s) => s.key === saved)) return saved
  return 'spring'
}

function apply(season) {
  document.documentElement.setAttribute('data-season', season)
}

export const useSeasonStore = defineStore('season', () => {
  const season = ref(resolveInitial())

  function setSeason(next) {
    if (!SEASONS.some((s) => s.key === next)) return
    season.value = next
    localStorage.setItem(KEY, next)
    apply(next)
  }

  function init() {
    apply(season.value)
  }

  return { season, seasons: SEASONS, setSeason, init }
})

// main.js 在挂载前调用，避免首屏闪烁
export function bootstrapSeason() {
  apply(resolveInitial())
}
