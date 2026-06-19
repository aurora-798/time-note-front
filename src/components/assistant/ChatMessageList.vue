<script setup>
import ChatMessage from './ChatMessage.vue'

defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="chat-list">
    <transition-group name="msg-fade" tag="div" class="chat-list-inner">
      <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />
    </transition-group>
  </div>
</template>

<style scoped>
.chat-list {
  display: flex;
  flex-direction: column;
  padding: 8px 6px 12px;
}
.chat-list-inner {
  display: flex;
  flex-direction: column;
}

.msg-fade-enter-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.msg-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.msg-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.msg-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}


@media (prefers-reduced-motion: reduce) {
  .msg-fade-enter-active,
  .msg-fade-leave-active {
    transition: none;
  }
}
</style>
