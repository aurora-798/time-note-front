<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer-copy">时光笔录 ©{{ year }}. All rights reserved.</div>
  </footer>
</template>

<style scoped>
.app-footer {
  width: 100%;
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
  background: var(--footer-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.app-footer-copy {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0.625rem 1.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-light);
}

@media (max-width: 768px) {
  .app-footer-copy {
    padding: 0.5rem 1rem;
    font-size: 0.6875rem;
  }
}
</style>
