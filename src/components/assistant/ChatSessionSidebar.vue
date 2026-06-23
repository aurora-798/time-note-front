<script setup>
import { computed } from 'vue'
import { MessageSquarePlus, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  activeSessionId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['new-chat', 'select', 'delete'])

const sortedSessions = computed(() => props.sessions)

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const diff = now - date
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <aside class="session-sidebar">
    <button
      type="button"
      class="new-chat-btn"
      :disabled="disabled"
      @click="emit('new-chat')"
    >
      <MessageSquarePlus :size="16" />
      <span>新对话</span>
    </button>

    <div class="session-list">
      <p v-if="sortedSessions.length === 0" class="empty-tip">暂无历史对话</p>
      <button
        v-for="item in sortedSessions"
        :key="item.sessionId"
        type="button"
        class="session-item"
        :class="{ active: item.sessionId === activeSessionId }"
        :disabled="disabled"
        @click="emit('select', item.sessionId)"
      >
        <span class="session-title">{{ item.title || '新对话' }}</span>
        <span class="session-meta">
          <span class="session-time">{{ formatTime(item.updateTime) }}</span>
          <span
            class="delete-btn"
            role="button"
            tabindex="0"
            @click.stop="emit('delete', item.sessionId)"
            @keydown.enter.stop="emit('delete', item.sessionId)"
          >
            <Trash2 :size="14" />
          </span>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.session-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px 8px 0;
  border-right: 1px solid var(--bubble-border-assistant, rgba(0, 0, 0, 0.06));
  min-height: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--bubble-border-assistant, rgba(230, 126, 154, 0.25));
  background: var(--hint-card-bg, rgba(255, 255, 255, 0.7));
  color: var(--text-primary, #333);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.new-chat-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
}

.new-chat-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.session-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
}

.empty-tip {
  margin: 12px 4px;
  font-size: 13px;
  color: var(--text-secondary, #888);
}

.session-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.session-item:hover:not(:disabled) {
  background: var(--hint-card-bg, rgba(255, 255, 255, 0.55));
}

.session-item.active {
  background: var(--hint-card-bg, rgba(255, 255, 255, 0.85));
  border-color: var(--bubble-border-assistant, rgba(230, 126, 154, 0.3));
}

.session-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.session-title {
  font-size: 13px;
  color: var(--text-primary, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.session-time {
  font-size: 11px;
  color: var(--text-secondary, #999);
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 6px;
  color: var(--text-secondary, #999);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.session-item:hover .delete-btn,
.session-item.active .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #e57373;
  background: rgba(229, 115, 115, 0.1);
}

@media (max-width: 900px) {
  .session-sidebar {
    width: 100%;
    max-height: 140px;
    border-right: none;
    border-bottom: 1px solid var(--bubble-border-assistant, rgba(0, 0, 0, 0.06));
    padding: 0 0 8px;
  }

  .session-list {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .session-item {
    min-width: 160px;
    flex-shrink: 0;
  }
}
</style>
