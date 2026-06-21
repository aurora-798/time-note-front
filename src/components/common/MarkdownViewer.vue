<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div
    class="markdown-body markdown-viewer"
    :class="{ 'markdown-viewer--compact': compact }"
    v-html="html"
  />
</template>
