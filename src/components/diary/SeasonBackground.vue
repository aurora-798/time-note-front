<script setup>
import { computed, ref, watch } from 'vue'
import { useSeasonStore } from '@/store/season'

const seasonStore = useSeasonStore()
const imageReady = ref(false)

const bgStyle = computed(() => ({
  backgroundImage: `url(${seasonStore.currentBackground.url})`,
}))

watch(
  () => seasonStore.currentBackground.url,
  (url) => {
    imageReady.value = false
    const img = new Image()
    img.onload = () => {
      imageReady.value = true
    }
    img.onerror = () => {
      imageReady.value = true
    }
    img.src = url
  },
  { immediate: true },
)
</script>

<template>
  <div class="season-bg" aria-hidden="true">
    <div
      class="season-bg-image"
      :class="{ 'is-loading': !imageReady }"
      :style="bgStyle"
    />
  </div>
</template>
