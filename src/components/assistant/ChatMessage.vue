<script setup>
import { ref } from 'vue'
import ImageViewDialog from './ImageViewDialog.vue'
import MarkdownViewer from '@/components/common/MarkdownViewer.vue'

defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const previewUrl = ref(null)
</script>

<template>
  <div class="chat-message" :class="message.role">
    <div class="bubble">
      <div v-if="message.images?.length" class="msg-images">
        <img
          v-for="(img, i) in message.images"
          :key="i"
          :src="img.url"
          :alt="img.name"
          class="msg-thumb"
          @click="previewUrl = img.url"
        />
      </div>
      <div class="msg-text">
        <MarkdownViewer
          v-if="message.role === 'assistant' && message.content && !message.streaming"
          :content="message.content"
          compact
        />
        <template v-else-if="message.role === 'assistant'">
          <span v-if="message.content" class="stream-plain">{{ message.content }}</span>
          <span v-if="message.streaming" class="stream-cursor" />
        </template>
        <template v-else>
          {{ message.content }}<span v-if="message.streaming" class="stream-cursor" />
        </template>
      </div>
    </div>
  </div>

  <ImageViewDialog :image-url="previewUrl" @close="previewUrl = null" />
</template>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 18px;
}
.chat-message.user {
  justify-content: flex-end;
}
.chat-message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 85%;
  padding: 11px 15px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.chat-message.user .bubble {
  background: var(--bubble-bg);
  color: var(--text-primary);
  border-bottom-right-radius: 4px;
  box-shadow: var(--bubble-shadow-user);
  border: 1px solid var(--bubble-border-user);
  white-space: pre-wrap;
}

.chat-message.assistant .bubble {
  background: var(--bubble-bg);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
  box-shadow: var(--bubble-shadow-assistant);
  border: 1px solid var(--bubble-border-assistant);
}

.msg-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.msg-thumb {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.msg-thumb:hover {
  transform: scale(1.04);
}

.msg-text {
  min-height: 1em;
}

.msg-text :deep(.markdown-body) {
  white-space: normal;
}

.stream-plain {
  white-space: pre-wrap;
  word-break: break-word;
}

.stream-cursor {
  display: inline-block;
  width: 6px;
  height: 15px;
  margin-left: 2px;
  background: var(--primary-color);
  border-radius: 1px;
  animation: cursor-blink 0.9s steps(2) infinite;
  vertical-align: text-bottom;
}
@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stream-cursor {
    animation: none;
    opacity: 0.6;
  }
}
</style>
