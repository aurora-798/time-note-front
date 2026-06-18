<script setup>
import { computed } from 'vue'

const props = defineProps({
  imageUrl: { type: String, default: null },
})

const emit = defineEmits(['close'])

const visible = computed({
  get: () => !!props.imageUrl,
  set: (v) => {
    if (!v) emit('close')
  },
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :show-close="true"
    width="90%"
    class="image-view-dialog"
    align-center
    destroy-on-close
    append-to-body
  >
    <transition name="img-zoom" appear>
      <div v-if="imageUrl" class="image-wrap">
        <img :src="imageUrl" alt="图片预览" class="preview-img" />
      </div>
    </transition>
  </el-dialog>
</template>

<style scoped>
.image-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--surface-strong);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-medium);
}
.preview-img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}
.img-zoom-enter-active,
.img-zoom-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.img-zoom-enter-from,
.img-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

<style>
.image-view-dialog .el-dialog {
  background: transparent;
  box-shadow: none;
  border: none;
}
.image-view-dialog .el-dialog__header {
  display: none;
}
.image-view-dialog .el-dialog__body {
  padding: 0;
}
</style>
