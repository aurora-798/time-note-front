<script setup>
import { computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { useAssistantChat } from '@/composables/useAssistantChat'
import ChatMessageList from '@/components/assistant/ChatMessageList.vue'
import AiPromptBox from '@/components/assistant/AiPromptBox.vue'

const { messages, isLoading, listRef, sendMessage, stopGeneration } = useAssistantChat()

const isEmpty = computed(() => messages.value.length === 0)

function onSend(text, files) {
  sendMessage(text, files)
}
</script>

<template>
  <div class="assistant-page">
    <header class="assistant-header">
      <div class="header-icon">
        <Sparkles :size="22" />
      </div>
      <div class="header-text">
        <h1 class="header-title">AI 助手</h1>
        <p v-if="isEmpty" class="header-sub">
          你好，我是时光笔录 AI 助手，可以帮你整理思绪、润色日记、回答问题。
        </p>
      </div>
    </header>

    <div ref="listRef" class="messages-scroll">
      <div v-if="isEmpty" class="empty-hints">
        <div class="hint-card">
          <span class="hint-emoji">✍️</span>
          <span>帮我润色今天的日记</span>
        </div>
        <div class="hint-card">
          <span class="hint-emoji">💭</span>
          <span>聊聊最近的心情</span>
        </div>
        <div class="hint-card">
          <span class="hint-emoji">📔</span>
          <span>给这段文字起个标题</span>
        </div>
      </div>
      <ChatMessageList v-else :messages="messages" />
    </div>

    <div class="input-area">
      <AiPromptBox
        :is-loading="isLoading"
        @send="onSend"
        @stop="stopGeneration"
      />
    </div>
  </div>
</template>

<style scoped>
.assistant-page {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --input-float-bottom: 24px;
}

.assistant-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 4px 12px;
  flex-shrink: 0;
}
.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--gradient-primary);
  color: #fff;
  box-shadow: var(--shadow-pink);
  flex-shrink: 0;
}
.header-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}
.header-sub {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.messages-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 2px calc(112px + var(--input-float-bottom));
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.messages-scroll::-webkit-scrollbar {
  display: none;
}

.empty-hints {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
}
.hint-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--hint-card-bg);
  border: 1px solid var(--bubble-border-assistant);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: default;
  box-shadow: var(--bubble-shadow-assistant);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hint-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(230, 126, 154, 0.12);
}
.hint-emoji {
  font-size: 18px;
}

.input-area {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--input-float-bottom);
  padding: 0 4px;
  z-index: 2;
}

@media (max-width: 768px) {
  .assistant-page {
    --input-float-bottom: 16px;
  }
  .assistant-header {
    padding: 4px 0 10px;
  }
  .header-title {
    font-size: 19px;
  }
  .header-sub {
    font-size: 13px;
  }
}
</style>
