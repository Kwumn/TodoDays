<script setup lang="ts">
import { computed } from 'vue'
import { useSearchStore } from '../stores/search'
import { useUiStore } from '../stores/ui'
import { useTodoStore } from '../stores/todo'
import ScheduleItem from '../components/ScheduleItem.vue'
import TodoItem from '../components/TodoItem.vue'
import AppIcon from '../components/AppIcon.vue'
import { dateOf, friendlyDate, timeOf } from '@shared/date'

const searchStore = useSearchStore()
const ui = useUiStore()
const todoStore = useTodoStore()

const hasKeyword = computed(() => searchStore.keyword.trim() !== '')
const total = computed(() => searchStore.result.schedules.length + searchStore.result.todos.length)

/** 无操作占位 handler */
const noop = (): void => undefined

async function toggleTodo(id: string): Promise<void> {
  const todo = todoStore.todos.find((t) => t.id === id)
  if (todo) await todoStore.toggleCompleted(todo)
}

function removeTodo(id: string): void {
  void todoStore.remove(id)
}
</script>

<template>
  <div class="search-view">
    <div v-if="!hasKeyword" class="empty-state card">
      <AppIcon name="search" :size="22" />
      <span>在顶部搜索框输入关键词，搜索日程与待办的标题和描述</span>
    </div>

    <template v-else>
      <div class="result-summary">
        「{{ searchStore.keyword }}」的搜索结果：
        日程 {{ searchStore.result.schedules.length }} 条 · 待办 {{ searchStore.result.todos.length }} 条
        <span v-if="searchStore.searching" class="searching">搜索中…</span>
      </div>

      <div v-if="total === 0 && !searchStore.searching" class="empty-state card">
        <AppIcon name="alert-circle" :size="20" />
        <span>没有匹配的结果，换个关键词试试</span>
      </div>

      <!-- 日程结果 -->
      <section v-if="searchStore.result.schedules.length > 0" class="section">
        <div class="section-title">
          <AppIcon name="calendar" :size="13" /> 日程（{{ searchStore.result.schedules.length }}）
        </div>
        <div class="result-rows">
          <div v-for="s in searchStore.result.schedules" :key="s.id" class="result-row">
            <div class="row-date">
              <div class="row-date-main">{{ friendlyDate(dateOf(s.startTime)) }}</div>
              <div class="row-date-sub">{{ timeOf(s.startTime) }}</div>
            </div>
            <div class="row-main">
              <ScheduleItem
                :instance="{ ...s, date: dateOf(s.startTime), isRecurring: s.repeatRule !== 'none', completed: s.completedDates.length > 0 }"
                @open="ui.openScheduleDialog({ instance: { ...s, date: dateOf(s.startTime), isRecurring: s.repeatRule !== 'none', completed: s.completedDates.length > 0 } })"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- 待办结果 -->
      <section v-if="searchStore.result.todos.length > 0" class="section">
        <div class="section-title">
          <AppIcon name="check-square" :size="13" /> 待办（{{ searchStore.result.todos.length }}）
        </div>
        <div class="section-list">
          <TodoItem
            v-for="t in searchStore.result.todos"
            :key="t.id"
            :todo="t"
            :selection-mode="false"
            :selected="false"
            :draggable="false"
            @toggle="toggleTodo(t.id)"
            @remove="removeTodo(t.id)"
            @toggle-select="noop"
            @drag-start="noop"
            @drag-over="noop"
            @drop="noop"
            @drag-end="noop"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.search-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
}

.result-summary {
  font-size: 12.5px;
  color: var(--text-secondary);
  padding: 10px 14px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}

.searching {
  color: var(--accent);
  margin-left: 8px;
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

.result-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.row-date {
  width: 92px;
  flex-shrink: 0;
  text-align: right;
  padding-top: 8px;
}

.row-date-main {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.row-date-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.row-main {
  flex: 1;
  min-width: 0;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
