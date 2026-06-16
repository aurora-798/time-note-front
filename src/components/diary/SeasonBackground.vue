<script setup>
import { computed } from 'vue'
import { useSeasonStore } from '@/store/season'

const seasonStore = useSeasonStore()

const bgStyle = computed(() => ({
  backgroundImage: `url(${seasonStore.currentBackground.url})`,
}))
</script>

<template>
  <div class="season-bg" aria-hidden="true" :style="bgStyle" />
</template>
