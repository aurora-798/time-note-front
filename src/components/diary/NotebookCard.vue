<script setup>
import { computed } from 'vue'
import { Lock, Delete } from '@element-plus/icons-vue'
import { notebookCoverUrl, formatNotebookDate } from '@/services/notebooks'

const props = defineProps({
  notebook: { type: Object, required: true },
})
const emit = defineEmits(['open', 'delete'])

const coverStyle = computed(() => ({
  backgroundImage: `url(${notebookCoverUrl(props.notebook.coverType, props.notebook.cover)})`,
}))

const createdLabel = computed(() => formatNotebookDate(props.notebook.createTime))

const tag = computed(() => {
  if (props.notebook.encrypted) return { text: '加密', cls: 'tag-encrypted' }
  return { text: '私密', cls: 'tag-private' }
})
</script>

<template>
  <article
    class="notebook"
    :class="notebook.encrypted ? 'is-encrypted' : 'is-private'"
    @click="emit('open', notebook)"
  >
    <!-- 封面 -->
    <div class="nb-cover" :style="coverStyle">
      <span class="nb-tag" :class="tag.cls">
        <el-icon v-if="notebook.encrypted"><Lock /></el-icon>{{ tag.text }}
      </span>
      <button
        class="nb-delete"
        title="删除日记本"
        @click.stop="emit('delete', notebook)"
      >
        <el-icon><Delete /></el-icon>
      </button>
    </div>

    <!-- 信息区（横线纸） -->
    <div class="nb-info">
      <h3 class="nb-title">{{ notebook.name }}</h3>
      <div class="nb-meta">
        <span v-if="createdLabel">创建于：{{ createdLabel }}</span>
        <span>{{ notebook.entryCount }} 篇日记</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.notebook {
  position: relative;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background-image: var(--notebook-cover-bg),
    linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 100% 100%, 20px 20px, 20px 20px;
  border-left: 9px solid var(--primary-color);
  transform: perspective(1300px) rotateX(1.1deg) rotateY(-1.2deg) translateZ(0);
  transform-style: preserve-3d;
  box-shadow: -14px 18px 24px rgba(123, 93, 118, 0.22),
    -6px 8px 12px rgba(146, 112, 138, 0.16), 0 3px 0 var(--notebook-inset-highlight) inset,
    0 -1px 0 rgba(188, 144, 176, 0.24) inset;
  transition: transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.28s,
    filter 0.22s;
  will-change: transform, box-shadow;
}
.notebook.is-private {
  border-left-color: #d4a012;
}
.notebook.is-encrypted {
  border-left-color: var(--danger-color);
}

/* 书脊后侧装订条 + 页堆阴影 */
.notebook::before {
  content: '';
  position: absolute;
  left: -9px;
  top: 0;
  width: 9px;
  height: 100%;
  border-radius: 4px 0 0 4px;
  background: linear-gradient(
    to bottom,
    var(--primary-color) 0,
    var(--secondary-color) 50%,
    var(--primary-color) 100%
  );
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.12) inset;
}
.notebook::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 10px;
  width: 12px;
  height: calc(100% - 20px);
  border-radius: 0 6px 6px 0;
  background: repeating-linear-gradient(
    to right,
    var(--notebook-page-edge) 0,
    var(--notebook-page-edge) 2px,
    rgba(228, 214, 190, 0.6) 2px,
    rgba(228, 214, 190, 0.6) 3px
  );
  box-shadow: 2px 3px 6px rgba(123, 93, 118, 0.16);
  transform: skewY(4deg);
  opacity: 0.95;
  z-index: -1;
  transition: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notebook:hover {
  transform: perspective(1300px) rotateX(2deg) rotateY(-2deg) translate3d(-3px, -3px, 0);
  box-shadow: -19px 24px 28px rgba(118, 85, 114, 0.3),
    -9px 12px 15px rgba(145, 108, 136, 0.2), 0 4px 0 var(--notebook-inset-highlight) inset,
    0 -1px 0 rgba(184, 142, 173, 0.3) inset;
  filter: brightness(1.01);
}
.notebook:hover::after {
  transform: skewY(4deg) translateX(2px);
  opacity: 1;
  box-shadow: 3px 4px 9px rgba(118, 85, 114, 0.2);
}
.notebook:active {
  transform: perspective(1200px) rotateX(0.4deg) rotateY(-0.4deg) scale(0.998);
}

/* —— 封面 —— */
.nb-cover {
  position: relative;
  width: 100%;
  height: 200px;
  flex: none;
  min-height: auto;
  border-radius: 8px 8px 0 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-bottom: 3px solid rgba(230, 126, 154, 0.66);
  overflow: hidden;
  filter: brightness(0.96) saturate(1.04);
  transition: filter 0.3s;
}
.notebook:hover .nb-cover {
  filter: brightness(1.03) saturate(1.05);
}
.nb-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  backdrop-filter: blur(4px);
}
.tag-private {
  background: rgba(212, 160, 18, 0.92);
}
.tag-encrypted {
  background: rgba(230, 126, 154, 0.95);
}
.nb-delete {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 99, 121, 0.9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: 0.25s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.notebook:hover .nb-delete {
  opacity: 0.92;
  transform: scale(1);
}
.nb-delete:hover {
  background: #ff4d63;
  transform: scale(1.12);
}

/* —— 信息区（横线纸纹理）—— */
.nb-info {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 20px;
  border-radius: 0 0 8px 8px;
  background: var(--notebook-info-bg),
    linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px);
  background-size: 100% 100%, 20px 20px;
  box-shadow: 0 -1px 0 var(--notebook-inset-highlight) inset;
}
.nb-title {
  margin: 0 0 10px;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-color);
  transform: rotate(-0.5deg);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.8em;
}
.nb-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--primary-color);
  transform: rotate(0.3deg);
  min-height: 0;
  overflow: hidden;
}
.nb-meta span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .notebook {
    min-height: 0;
    border-radius: 14px;
    transform: none;
    box-shadow: 0 10px 20px rgba(17, 24, 39, 0.06);
  }
  .notebook::before,
  .notebook::after {
    display: none;
  }
  .notebook:hover {
    transform: none;
    filter: none;
  }
  .nb-cover {
    height: auto;
    aspect-ratio: 1;
    border-bottom: none;
  }
  .nb-info {
    padding: 10px 11px 11px;
    background: transparent;
    box-shadow: none;
  }
  .nb-title {
    font-size: 14px;
    height: auto;
    max-height: 2.7em;
    margin-bottom: 6px;
    transform: none;
  }
  .nb-meta {
    font-size: 11px;
    transform: none;
  }
}
</style>
