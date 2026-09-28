<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleInstance } from '@shared/types'
import { PRIORITY_LABELS } from '@shared/types'
import { timeOf } from '@shared/date'
import { useTagStore } from '../stores/tag'
import { useScheduleStore } from '../stores/schedule'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ instance: ScheduleInstance; compact?: boolean }>(), {
  compact: false
})

const emit = defineEmits<{
  open: [instance: ScheduleInstance]
}>()

const tagStore = useTagStore()
const scheduleStore = useScheduleStore()

const tag = computed(() => tagStore.tagOf(props.instance.tagId))
const done = computed(() => props.instance.completed)

async function toggleDone(ev: Event): Promise<void> {
  ev.stopPropagation()
  await scheduleStore.toggleComplete(props.instance)
}
</script>

<template>
  <div
    class="schedule-item"
    :class="{ compact: props.compact, done, urgent: instance.priority === 'high' }"
    :style="{ '--item-color': instance.color }"
    @click="emit('open', instance)"
  >
    <div class="color-bar"></div>
    <input
      type="checkbox"
      class="checkbox"
      :checked="done"
      @click="toggleDone"
    />
    <div class="item-main">
      <div class="item-title" :title="instance.title">
        <span v-if="instance.priority !== 'none'" class="priority-flag" :class="'p-' + instance.priority" :title="`优先级：${PRIORITY_LABELS[instance.priority]}`"></span>
        {{ instance.title }}
      </div>
      <div v-if="!props.compact" class="item-meta">
        <span class="meta-time"><AppIcon name="clock" :size="11" /> {{ timeOf(instance.startTime) }} – {{ timeOf(instance.endTime) }}</span>
        <span v-if="instance.isRecurring" class="meta-repeat"><AppIcon name="repeat" :size="11" /> 重复</span>
        <span v-if="tag" class="chip"><i class="dot" :style="{ background: tag.color }" /> {{ tag.name }}</span>
        <span v-if="instance.reminderEnabled" class="meta-bell"><AppIcon name="bell" :size="11" /></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
  overflow: hidden;
}

.schedule-item:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
}

.schedule-item.urgent {
  background: var(--danger-soft);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}

.schedule-item.urgent:hover {
  background: color-mix(in srgb, var(--danger-soft) 80%, var(--bg-hover));
}

.color-bar {
  width: 3px;
  border-radius: 2px;
  background: var(--item-color);
  align-self: stretch;
  flex-shrink: 0;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.meta-time,
.meta-repeat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.priority-flag.p-high {
  background: var(--danger);
}

.priority-flag.p-medium {
  background: var(--warn);
}

.priority-flag.p-low {
  background: var(--accent);
}

/* 完成态：划线 + 浅绿 */
.schedule-item.done {
  background: var(--success-soft);
  border-color: color-mix(in srgb, var(--success) 25%, transparent);
}

.schedule-item.done .item-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

/* 紧凑模式（月视图格子里） */
.schedule-item.compact {
  padding: 3px 6px;
  gap: 5px;
  align-items: center;
}

.schedule-item.compact .item-title {
  font-size: 11.5px;
}

.schedule-item.compact .checkbox {
  display: none;
}
</style>
