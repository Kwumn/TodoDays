<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleInstance } from '@shared/types'
import { friendlyDate, nowStr, todayStr } from '@shared/date'
import { useScheduleStore } from '../stores/schedule'
import { useTodoStore } from '../stores/todo'
import { useUiStore } from '../stores/ui'
import ScheduleItem from '../components/ScheduleItem.vue'
import TodoItem from '../components/TodoItem.vue'
import AppIcon from '../components/AppIcon.vue'

const scheduleStore = useScheduleStore()
const todoStore = useTodoStore()
const ui = useUiStore()

const today = todayStr()
const now = nowStr()

const todayInstances = computed<ScheduleInstance[]>(() =>
  scheduleStore.instancesInRange({ start: today, end: today })
)

/** 区分：未完成（含进行中/即将开始/全天未完成）与已完成 */
const isOver = (i: ScheduleInstance): boolean => i.completed || i.endTime < now
const pendingSchedules = computed(() => todayInstances.value.filter((i) => !isOver(i)))
const finishedSchedules = computed(() => todayInstances.value.filter((i) => isOver(i)))
const finishedCollapsed = computed({
  get: () => todoStore.completedCollapsed,
  set: (v) => (todoStore.completedCollapsed = v)
})

const pendingTodos = computed(() => todoStore.sortedPending)
const completedTodos = computed(() => todoStore.completed)

/** 即将开始：进行中或 2 小时内开始 */
const upcoming = computed(() =>
  pendingSchedules.value.filter((i) => i.startTime <= now || toMinutes(i.startTime) - toMinutes(now) <= 120)
)
const later = computed(() => pendingSchedules.value.filter((i) => !upcoming.value.includes(i)))

function toMinutes(dt: string): number {
  const [h, m] = dt.slice(11).split(':').map(Number)
  const days = Math.round((new Date(dt.slice(0, 10)).getTime() - new Date(today).getTime()) / 86400000)
  return days * 1440 + (h ?? 0) * 60 + (m ?? 0)
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
</script>

<template>
  <div class="today-view">
    <div class="today-hero">
      <div>
        <h2 class="hero-title">{{ greeting }}，老板</h2>
        <div class="hero-sub">
          {{ friendlyDate(today) }} ·
          今日日程 {{ todayInstances.length }} 项 ·
          待办 {{ todoStore.stats.pending }} 项未完成
        </div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="ui.openScheduleDialog({ date: today })">
          <AppIcon name="plus" :size="14" /> 新建日程
        </button>
      </div>
    </div>

    <!-- 即将开始 -->
    <section v-if="upcoming.length > 0" class="section">
      <div class="section-title urgent-title">
        <AppIcon name="clock" :size="13" />
        进行中 / 即将开始（{{ upcoming.length }}）
      </div>
      <div class="section-list">
        <ScheduleItem v-for="inst in upcoming" :key="inst.id + '#' + inst.date" :instance="inst" @open="ui.openScheduleDialog({ instance: inst })" />
      </div>
    </section>

    <!-- 今日其余日程 -->
    <section class="section">
      <div class="section-title">今日日程 · 未完成（{{ later.length }}）</div>
      <div class="section-list">
        <ScheduleItem
          v-for="inst in later"
          :key="inst.id + '#' + inst.date"
          :instance="inst"
          @open="ui.openScheduleDialog({ instance: inst })"
        />
        <div v-if="later.length === 0 && upcoming.length === 0" class="empty-state card">
          <span>今天没有未完成的日程</span>
        </div>
      </div>
    </section>

    <!-- 当前待办 -->
    <section class="section">
      <div class="section-title">当前待办（{{ pendingTodos.length }}）</div>
      <div class="section-list">
        <TodoItem
          v-for="todo in pendingTodos.slice(0, 8)"
          :key="todo.id"
          :todo="todo"
          :selection-mode="false"
          :selected="false"
          :draggable="false"
          @toggle="todoStore.toggleCompleted(todo)"
          @remove="todoStore.remove(todo.id)"
          @toggle-select="() => undefined"
          @drag-start="() => undefined"
          @drag-over="() => undefined"
          @drop="() => undefined"
          @drag-end="() => undefined"
        />
        <div v-if="pendingTodos.length === 0" class="empty-state card">
          <span>暂无待办，去「待办清单」添加吧</span>
        </div>
      </div>
    </section>

    <!-- 已完成折叠 -->
    <section v-if="finishedSchedules.length > 0 || completedTodos.length > 0" class="section">
      <button class="collapse-header" @click="finishedCollapsed = !finishedCollapsed">
        <AppIcon :name="finishedCollapsed ? 'chevron-right' : 'chevron-down'" :size="13" />
        今日已完成（日程 {{ finishedSchedules.length }} · 待办 {{ completedTodos.length }}）
      </button>
      <div v-if="!finishedCollapsed" class="section-list finished">
        <ScheduleItem
          v-for="inst in finishedSchedules"
          :key="'f' + inst.id + inst.date"
          :instance="inst"
          @open="ui.openScheduleDialog({ instance: inst })"
        />
        <TodoItem
          v-for="todo in completedTodos"
          :key="'t' + todo.id"
          :todo="todo"
          :selection-mode="false"
          :selected="false"
          :draggable="false"
          @toggle="todoStore.toggleCompleted(todo)"
          @remove="todoStore.remove(todo.id)"
          @toggle-select="() => undefined"
          @drag-start="() => undefined"
          @drag-over="() => undefined"
          @drop="() => undefined"
          @drag-end="() => undefined"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.today-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 860px;
}

.today-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 75%, #6ea0e8) 100%);
  border-radius: var(--radius-lg);
  color: var(--text-inverse);
  box-shadow: var(--shadow-card);
}

.hero-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.hero-sub {
  font-size: 12.5px;
  opacity: 0.92;
  margin-top: 4px;
}

.hero-actions .btn-primary {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.hero-actions .btn-primary:hover {
  background: rgba(255, 255, 255, 0.28);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.urgent-title {
  color: var(--danger);
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-list.finished {
  opacity: 0.85;
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px;
  font-family: inherit;
  align-self: flex-start;
}

.collapse-header:hover {
  color: var(--text-primary);
}
</style>
