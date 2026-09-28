<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleInstance } from '@shared/types'
import { addDays, friendlyDate, todayStr } from '@shared/date'
import ScheduleItem from '../ScheduleItem.vue'

const props = defineProps<{
  startDate: string
  instances: ScheduleInstance[]
}>()

const emit = defineEmits<{
  openInstance: [instance: ScheduleInstance]
  selectDate: [date: string]
}>()

const days = computed<string[]>(() => Array.from({ length: 7 }, (_, i) => addDays(props.startDate, i)))
const today = todayStr()

function instancesOf(date: string): ScheduleInstance[] {
  return props.instances.filter((i) => i.date === date)
}
</script>

<template>
  <div class="week-list">
    <div v-for="date in days" :key="date" class="week-col">
      <div class="col-header" :class="{ today: date === today }" @click="emit('selectDate', date)">
        <span class="col-date">{{ friendlyDate(date) }}</span>
        <span class="col-count">{{ instancesOf(date).length }} 项</span>
      </div>
      <div class="col-body">
        <ScheduleItem
          v-for="inst in instancesOf(date)"
          :key="inst.id + '#' + inst.date"
          :instance="inst"
          @open="emit('openInstance', inst)"
        />
        <div v-if="instancesOf(date).length === 0" class="col-empty">无日程</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-list {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  align-items: stretch;
}

.week-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.col-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  cursor: pointer;
}

.col-header:hover {
  border-color: var(--border-strong);
}

.col-header.today {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.col-header.today .col-date {
  color: var(--accent);
  font-weight: 700;
}

.col-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.col-count {
  font-size: 10.5px;
  color: var(--text-muted);
}

.col-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.col-empty {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 14px 0;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
}
</style>
