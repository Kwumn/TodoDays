<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScheduleInstance, ViewMode } from '@shared/types'
import {
  addDays,
  addMonths,
  friendlyDate,
  startOfWeek,
  todayStr
} from '@shared/date'
import { useScheduleStore } from '../stores/schedule'
import { useTagStore } from '../stores/tag'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import MonthGrid from '../components/calendar/MonthGrid.vue'
import WeekList from '../components/calendar/WeekList.vue'
import DayAgenda from '../components/calendar/DayAgenda.vue'
import AppIcon from '../components/AppIcon.vue'
import { PRIORITY_LABELS } from '@shared/types'

const scheduleStore = useScheduleStore()
const tagStore = useTagStore()
const settingsStore = useSettingsStore()
const ui = useUiStore()

/* ---- 视图状态 ---- */
const viewMode = ref<ViewMode>(settingsStore.settings.defaultView)
watch(
  () => settingsStore.loaded,
  (loaded) => {
    if (loaded) viewMode.value = settingsStore.settings.defaultView
  }
)

const cursor = ref(todayStr())
const showFilter = ref(false)

const year = computed(() => Number(cursor.value.slice(0, 4)))
const month0 = computed(() => Number(cursor.value.slice(5, 7)) - 1)

function switchView(mode: ViewMode): void {
  viewMode.value = mode
}

function goPrev(): void {
  if (viewMode.value === 'month') cursor.value = addMonths(cursor.value, -1)
  else if (viewMode.value === 'week') cursor.value = addDays(cursor.value, -7)
  else cursor.value = addDays(cursor.value, -1)
}

function goNext(): void {
  if (viewMode.value === 'month') cursor.value = addMonths(cursor.value, 1)
  else if (viewMode.value === 'week') cursor.value = addDays(cursor.value, 7)
  else cursor.value = addDays(cursor.value, 1)
}

function goToday(): void {
  cursor.value = todayStr()
}

/* ---- 当前视图的日期范围 ---- */
const range = computed(() => {
  if (viewMode.value === 'month') {
    const y = year.value
    const m = month0.value
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const gridStart = startOfWeek(first, settingsStore.settings.weekStart)
    const nextMonthFirst = addMonths(first, 1)
    const lastDay = addDays(nextMonthFirst, -1)
    const gridEnd = addDays(startOfWeek(lastDay, settingsStore.settings.weekStart), 6)
    return { start: gridStart, end: gridEnd }
  }
  if (viewMode.value === 'week') {
    const start = startOfWeek(cursor.value, settingsStore.settings.weekStart)
    return { start, end: addDays(start, 6) }
  }
  return { start: cursor.value, end: cursor.value }
})

const instances = computed<ScheduleInstance[]>(() => scheduleStore.instancesInRange(range.value))

/* ---- 标题 ---- */
const headerTitle = computed(() => {
  if (viewMode.value === 'month') return `${year.value} 年 ${month0.value + 1} 月`
  if (viewMode.value === 'week') {
    const s = range.value.start
    const e = range.value.end
    const sameMonth = s.slice(0, 7) === e.slice(0, 7)
    return `${s.slice(0, 4)} 年 ${Number(s.slice(5, 7))} 月 ${Number(s.slice(8))} 日 – ${sameMonth ? Number(e.slice(8)) : Number(e.slice(5, 7)) + ' 月 ' + Number(e.slice(8))} 日`
  }
  return friendlyDate(cursor.value)
})

/* ---- 筛选面板 ---- */
const filter = computed(() => scheduleStore.filters)

function setFilter(patch: Partial<typeof filter.value>): void {
  scheduleStore.filters = { ...scheduleStore.filters, ...patch }
}

const filterActive = computed(
  () => filter.value.tagId !== 'all' || filter.value.priority !== 'all' || filter.value.status !== 'all'
)

/* ---- 交互 ---- */
function selectDate(date: string): void {
  cursor.value = date
  viewMode.value = 'day'
}

function openInstance(inst: ScheduleInstance): void {
  ui.openScheduleDialog({ instance: inst })
}

function newSchedule(): void {
  ui.openScheduleDialog({ date: cursor.value })
}
</script>

<template>
  <div class="calendar-view">
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn btn-ghost nav-btn" @click="goPrev"><AppIcon name="chevron-left" :size="15" /></button>
        <button class="btn" @click="goToday">今天</button>
        <button class="btn btn-ghost nav-btn" @click="goNext"><AppIcon name="chevron-right" :size="15" /></button>
        <h2 class="view-title">{{ headerTitle }}</h2>
      </div>

      <div class="toolbar-right">
        <div class="segmented">
          <button :class="{ active: viewMode === 'month' }" @click="switchView('month')">月</button>
          <button :class="{ active: viewMode === 'week' }" @click="switchView('week')">周</button>
          <button :class="{ active: viewMode === 'day' }" @click="switchView('day')">日</button>
        </div>

        <div class="filter-wrap">
          <button class="btn" :class="{ 'filter-on': filterActive }" @click="showFilter = !showFilter">
            <AppIcon name="sort" :size="13" />
            筛选
          </button>
          <div v-if="showFilter" class="filter-panel card">
            <div class="filter-row">
              <span class="filter-label">标签</span>
              <select class="select" :value="filter.tagId" @change="setFilter({ tagId: ($event.target as HTMLSelectElement).value })">
                <option value="all">全部标签</option>
                <option value="none">无标签</option>
                <option v-for="tag in tagStore.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
              </select>
            </div>
            <div class="filter-row">
              <span class="filter-label">优先级</span>
              <select class="select" :value="filter.priority" @change="setFilter({ priority: ($event.target as HTMLSelectElement).value as typeof filter.priority })">
                <option value="all">全部</option>
                <option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div class="filter-row">
              <span class="filter-label">状态</span>
              <select class="select" :value="filter.status" @change="setFilter({ status: ($event.target as HTMLSelectElement).value as typeof filter.status })">
                <option value="all">全部</option>
                <option value="pending">未完成</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <button v-if="filterActive" class="btn btn-ghost filter-reset" @click="setFilter({ tagId: 'all', priority: 'all', status: 'all' })">
              重置筛选
            </button>
          </div>
        </div>

        <button class="btn btn-primary" @click="newSchedule">
          <AppIcon name="plus" :size="14" />
          新建日程
        </button>
      </div>
    </div>

    <div class="view-body">
      <MonthGrid
        v-if="viewMode === 'month'"
        :year="year"
        :month0="month0"
        :week-start="settingsStore.settings.weekStart"
        :instances="instances"
        @select-date="selectDate"
        @open-instance="openInstance"
      />

      <WeekList
        v-else-if="viewMode === 'week'"
        :start-date="range.start"
        :instances="instances"
        @open-instance="openInstance"
        @select-date="selectDate"
      />

      <template v-else>
        <DayAgenda :date="cursor" :instances="instances" @open-instance="openInstance" />
        <div v-if="instances.length === 0" class="day-empty-actions">
          <button class="btn" @click="newSchedule"><AppIcon name="plus" :size="13" /> 在 {{ friendlyDate(cursor) }} 新建日程</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  padding: 6px 8px;
}

.view-title {
  font-size: 15px;
  margin: 0 4px;
  color: var(--text-primary);
  min-width: 140px;
}

.filter-wrap {
  position: relative;
}

.filter-on {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  width: 230px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 50;
  box-shadow: var(--shadow-pop);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  width: 48px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.filter-reset {
  justify-content: center;
}

.view-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.day-empty-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
</style>
