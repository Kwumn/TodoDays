<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
</script>

<template>
  <teleport to="body">
    <transition-group name="toast" tag="div" class="toast-area">
      <div v-for="t in ui.toasts" :key="t.toastId" class="toast card">
        <div class="toast-icon">
          <AppIcon name="bell" :size="16" />
        </div>
        <div class="toast-body">
          <div class="toast-title">日程提醒</div>
          <div class="toast-content">
            <strong>{{ t.title }}</strong>
            <span class="toast-time">{{ t.startTime.slice(11) }}{{ t.minutesBefore > 0 ? `（${t.minutesBefore} 分钟后开始）` : '（现在开始）' }}</span>
          </div>
        </div>
        <button class="toast-close" @click="ui.dismissToast(t.toastId)">
          <AppIcon name="x" :size="12" />
        </button>
      </div>
    </transition-group>
  </teleport>
</template>

<style scoped>
.toast-area {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  width: 300px;
  box-shadow: var(--shadow-pop);
}

.toast-icon {
  color: var(--accent);
  margin-top: 2px;
}

.toast-title {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 2px;
}

.toast-content {
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast-time {
  color: var(--text-secondary);
  font-size: 12px;
}

.toast-close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
}

.toast-close:hover {
  color: var(--text-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
