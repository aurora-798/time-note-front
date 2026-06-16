import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BG_CDN_BASE = 'http://tgldl5vcp.hn-bkt.clouddn.com/back'

export const BACKGROUNDS = [
  { key: 'back-1', name: '背景一', url: `${BG_CDN_BASE}/back-1.png` },
  { key: 'back-2', name: '背景二', url: `${BG_CDN_BASE}/back-2.png` },
  { key: 'back-3', name: '背景三', url: `${BG_CDN_BASE}/back-3.png` },
  { key: 'back-4', name: '背景四', url: `${BG_CDN_BASE}/back-4.png` },
  { key: 'back-5', name: '背景五', url: `${BG_CDN_BASE}/back-5.png` },
]

const KEY = 'tn-background'
const LEGACY_KEY = 'tn-season'

const LEGACY_MAP = {
  spring: 'back-1',
  summer: 'back-2',
  autumn: 'back-3',
  winter: 'back-4',
}

function resolveInitial() {
  const saved = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY)
  if (BACKGROUNDS.some((b) => b.key === saved)) return saved
  if (saved && LEGACY_MAP[saved]) return LEGACY_MAP[saved]
  return 'back-1'
}

function apply(key) {
  document.documentElement.setAttribute('data-background', key)
}

export const useSeasonStore = defineStore('season', () => {
  const background = ref(resolveInitial())

  const currentBackground = computed(
    () => BACKGROUNDS.find((b) => b.key === background.value) || BACKGROUNDS[0],
  )

  function setBackground(next) {
    if (!BACKGROUNDS.some((b) => b.key === next)) return
    background.value = next
    localStorage.setItem(KEY, next)
    apply(next)
  }

  function init() {
    apply(background.value)
  }

  return {
    background,
    backgrounds: BACKGROUNDS,
    currentBackground,
    setBackground,
    init,
    // 兼容旧引用
    season: background,
    seasons: BACKGROUNDS,
    setSeason: setBackground,
  }
})

export function bootstrapSeason() {
  apply(resolveInitial())
}
