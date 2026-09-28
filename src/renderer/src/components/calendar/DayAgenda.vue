<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleInstance } from '@shared/types'
import { nowStr, todayStr } from '@shared/date'
import ScheduleItem from '../ScheduleItem.vue'

const props = defineProps<{
  date: string
  instances: ScheduleInstance[]
}>()

const emit = defineEmits<{
  openInstance: [instance: ScheduleInstance]
}>()

/** 状态分组：未完成（进行中/即将开始/未过期）与 已完成/已结束 */
const now = computed(() => nowStr())

const groups = computed(() => {
  const list = [...props.instances].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const isOver = (i: ScheduleInstance): boolean =>
    i.completed || i.date < todayStr() || (i.date === todayStr() && i.endTime < now.value)
  const upcoming = list.filter((i) => !isOver(i))
  const finished = list.filter((i) => isOver(i))
  return { upcoming, finished }
})

function sectionLabel(inst: ScheduleInstance): string {
  if (inst.completed) return '已完成'
  if (inst.date === todayStr() && inst.startTime <= now.value && inst.endTime >= now.value) return '进行中'
  return '即将开始'
}
</script>

<template>
  <div class="day-agenda">
    <div v-if="groups.upcoming.length === 0 && props.instances.length === 0" class="empty-state card">
      <span>这一天还没有日程</span>
      <span class="empty-sub">点击右上角「新建日程」来安排</span>
    </div>

    <template v-for="(list, idx) in [groups.upcoming, groups.finished]" :key="idx">
      <div v-if="list.length > 0" class="section">
        <div class="section-title">{{ idx === 0 ? '未完成 / 即将开始' : '已完成 / 已结束' }}</div>
        <div class="section-list">
          <div v-for="inst in list" :key="inst.id + '#' + inst.date" class="agenda-row" :class="{ past: inst.date === todayStr() && inst.endTime < now && !inst.completed }">
            <div class="time-col">
              <div class="time-main">{{ inst.startTime.slice(11, 16) }}</div>
              <div class="time-sub">{{ sectionLabel(inst) }}</div>
            </div>
            <div class="agenda-main">
              <ScheduleItem :instance="inst" @open="emit('openInstance', inst)" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.day-agenda {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title::before {
  content: '';
  width: 3px;
  height: 12px;
  background: var(--accent);
  border-radius: 2px;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agenda-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.time-col {
  width: 92px;
  flex-shrink: 0;
  text-align: right;
  padding-top: 8px;
}

.time-main {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.time-sub {
  font-size: 10.5px;
  color: var(--text-muted);
  margin-top: 1px;
}

.agenda-row.past .time-main {
  color: var(--text-muted);
}

.agenda-main {
  flex: 1;
  min-width: 0;
}
</style>
