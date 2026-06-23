<script setup>
import { computed } from 'vue'
import { useAssistantChat } from '@/composables/useAssistantChat'
import ChatMessageList from '@/components/assistant/ChatMessageList.vue'
import ChatSessionSidebar from '@/components/assistant/ChatSessionSidebar.vue'
import AiPromptBox from '@/components/assistant/AiPromptBox.vue'

const {
  messages,
  sessions,
  sessionId,
  isLoading,
  listRef,
  sendMessage,
  stopGeneration,
  startNewChat,
  switchSession,
  removeSession,
} = useAssistantChat()

const isEmpty = computed(() => messages.value.length === 0)

function onSend(text, files) {
  sendMessage(text, files)
}
</script>

<template>
  <div class="assistant-layout">
    <ChatSessionSidebar
      :sessions="sessions"
      :active-session-id="sessionId"
      :disabled="isLoading"
      @new-chat="startNewChat"
      @select="switchSession"
      @delete="removeSession"
    />

    <div class="assistant-page">
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
  </div>
</template>

<style scoped>
.assistant-layout {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.assistant-page {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --input-float-bottom: 24px;
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

@media (max-width: 900px) {
  .assistant-layout {
    flex-direction: column;
    max-width: 720px;
  }
}

@media (max-width: 768px) {
  .assistant-page {
    --input-float-bottom: 16px;
  }
}
</style>
