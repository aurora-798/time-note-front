import { defineStore } from 'pinia'
import { ref } from 'vue'

// 读取初始主题：localStorage 优先，否则跟随系统偏好
function resolveInitialTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

// 把主题应用到 <html>：data-theme 驱动自定义变量，dark class 驱动 Element Plus
function applyTheme(theme) {
  const el = document.documentElement
  el.setAttribute('data-theme', theme)
  el.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(resolveInitialTheme())

  function setTheme(next) {
    theme.value = next === 'dark' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme(theme.value)
  }

  function toggle() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  // 首次同步（main.js 在 mount 前已调用 applyTheme，这里保证 store 与 DOM 一致）
  function init() {
    applyTheme(theme.value)
  }

  return { theme, setTheme, toggle, init }
})

// 供 main.js 在 Vue 挂载前调用，避免首屏闪白
export function bootstrapTheme() {
  applyTheme(resolveInitialTheme())
}
