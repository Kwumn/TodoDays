<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleInstance, WeekStart } from '@shared/types'
import { generateMonthGrid, todayStr, weekdayLabels } from '@shared/date'

const props = defineProps<{
  year: number
  month0: number
  weekStart: WeekStart
  instances: ScheduleInstance[]
}>()

const emit = defineEmits<{
  selectDate: [date: string]
  openInstance: [instance: ScheduleInstance]
}>()

const grid = computed(() => generateMonthGrid(props.year, props.month0, props.weekStart))
const currentMonth = computed(() => `${props.year}-${String(props.month0 + 1).padStart(2, '0')}`)
const today = todayStr()

/** 按日期分组的日程实例 */
const byDate = computed<Map<string, ScheduleInstance[]>>(() => {
  const map = new Map<string, ScheduleInstance[]>()
  for (const inst of props.instances) {
    const list = map.get(inst.date) ?? []
    list.push(inst)
    map.set(inst.date, list)
  }
  return map
})

function instancesOf(date: string): ScheduleInstance[] {
  return byDate.value.get(date) ?? []
}
</script>

<template>
  <div class="month-grid card">
    <div class="weekday-row">
      <div v-for="label in weekdayLabels(weekStart)" :key="label" class="weekday">{{ label }}</div>
    </div>

    <div class="grid-body">
      <div
        v-for="date in grid"
        :key="date"
        class="day-cell"
        :class="{
          dim: !date.startsWith(currentMonth),
          today: date === today,
          'has-items': instancesOf(date).length > 0
        }"
        @click="emit('selectDate', date)"
      >
        <div class="day-number">
          <span class="num">{{ Number(date.slice(8)) }}</span>
        </div>
        <div class="day-items">
          <div
            v-for="inst in instancesOf(date).slice(0, 3)"
            :key="inst.id + '#' + inst.date"
            class="mini-item"
            :class="{ done: inst.completed }"
            :style="{ background: inst.color + '22', borderColor: inst.color + '55' }"
            @click.stop="emit('openInstance', inst)"
          >
            <span class="mini-time">{{ inst.startTime.slice(11, 16) }}</span>
            <span class="mini-title">{{ inst.title }}</span>
          </div>
          <div v-if="instancesOf(date).length > 3" class="more">还有 {{ instancesOf(date).length - 3 }} 项…</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-grid {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
  background: var(--bg-hover);
}

.weekday {
  padding: 7px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: right;
}

.grid-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(96px, auto);
  flex: 1;
}

.day-cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 6px;
  cursor: pointer;
  transition: background 0.12s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.day-cell:nth-child(7n) {
  border-right: none;
}

.day-cell:hover {
  background: var(--bg-hover);
}

.day-cell.dim {
  background: color-mix(in srgb, var(--bg-page) 60%, transparent);
}

.day-cell.dim .num {
  color: var(--text-muted);
}

.day-number {
  display: flex;
  justify-content: flex-end;
}

.num {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-primary);
  border-radius: 50%;
}

/* 今天标记：蓝色实心圆 */
.day-cell.today .num {
  background: var(--accent);
  color: var(--text-inverse);
  font-weight: 700;
}

.day-items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mini-item {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 2px 5px;
  border-radius: 4px;
  border-left: 3px solid;
  font-size: 11px;
  cursor: pointer;
  min-width: 0;
}

.mini-item:hover {
  filter: brightness(0.96);
}

.mini-item.done .mini-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.mini-time {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 10px;
}

.mini-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.more {
  font-size: 10.5px;
  color: var(--text-muted);
  padding-left: 4px;
}
</style>
