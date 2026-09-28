<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Priority, Todo, TodoSortMode } from '@shared/types'
import { PRIORITY_LABELS } from '@shared/types'
import { useTodoStore } from '../stores/todo'
import { useTagStore } from '../stores/tag'
import TodoItem from '../components/TodoItem.vue'
import AppIcon from '../components/AppIcon.vue'

const todoStore = useTodoStore()
const tagStore = useTagStore()

/* ---- 快速添加 ---- */
const quickTitle = ref('')
const quickPriority = ref<Priority>('none')
const quickTagId = ref('')

async function quickAdd(): Promise<void> {
  const title = quickTitle.value.trim()
  if (!title) return
  await todoStore.create({ title, description: '', priority: quickPriority.value, tagId: quickTagId.value || null })
  quickTitle.value = ''
}

/* ---- 筛选 ---- */
const statusFilter = ref<'all' | 'pending' | 'completed'>('all')
const tagFilter = ref<'all' | 'none' | string>('all')

function applyFilters(list: Todo[]): Todo[] {
  return list.filter((t) => {
    if (statusFilter.value === 'pending' && t.completed) return false
    if (statusFilter.value === 'completed' && !t.completed) return false
    if (tagFilter.value === 'none' && t.tagId !== null) return false
    if (tagFilter.value !== 'all' && tagFilter.value !== 'none' && t.tagId !== tagFilter.value) return false
    return true
  })
}

const visiblePending = computed<Todo[]>(() => applyFilters(todoStore.sortedPending))
const visibleCompleted = computed<Todo[]>(() =>
  applyFilters([...todoStore.completed].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)))
)

const sortMode = computed<TodoSortMode>({
  get: () => todoStore.sortMode,
  set: (v) => (todoStore.sortMode = v)
})

/* ---- 统计 ---- */
const stats = computed(() => todoStore.stats)
const ratePercent = computed(() => Math.round(stats.value.rate * 100))

/* ---- 拖拽排序（仅手动模式） ---- */
const dragId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(e: DragEvent, todo: Todo): void {
  dragId.value = todo.id
  e.dataTransfer?.setData('text/plain', todo.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e: DragEvent, todo: Todo): void {
  if (!dragId.value || sortMode.value !== 'manual') return
  e.preventDefault()
  dragOverId.value = todo.id
}

function onDrop(e: DragEvent, target: Todo): void {
  e.preventDefault()
  if (!dragId.value || dragId.value === target.id) {
    dragId.value = null
    dragOverId.value = null
    return
  }
  const ids = visiblePending.value.map((t) => t.id)
  const from = ids.indexOf(dragId.value)
  const to = ids.indexOf(target.id)
  if (from >= 0 && to >= 0) {
    ids.splice(from, 1)
    ids.splice(to, 0, dragId.value)
    const completedIds = todoStore.completed.map((t) => t.id)
    void todoStore.reorder([...ids, ...completedIds])
  }
  dragId.value = null
  dragOverId.value = null
}

/* ---- 多选 ---- */
const allSelectableIds = computed(() => [...visiblePending.value, ...visibleCompleted.value].map((t) => t.id))

function toggleSelectionMode(): void {
  todoStore.selectionMode = !todoStore.selectionMode
  if (!todoStore.selectionMode) todoStore.clearSelection()
}

function selectAllVisible(): void {
  if (todoStore.selectedIds.size === allSelectableIds.value.length) todoStore.selectAll([])
  else todoStore.selectAll(allSelectableIds.value)
}

const selectedCount = computed(() => todoStore.selectedIds.size)

async function batchComplete(): Promise<void> {
  await todoStore.batchComplete([...todoStore.selectedIds], true)
}

async function batchRemove(): Promise<void> {
  await todoStore.batchRemove([...todoStore.selectedIds])
}
</script>

<template>
  <div class="todo-view">
    <!-- 统计条 -->
    <div class="stats-bar card">
      <div class="stat-item">
        <span class="stat-num">{{ stats.total }}</span>
        <span class="stat-label">总数</span>
      </div>
      <div class="stat-item">
        <span class="stat-num success">{{ stats.completed }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-item">
        <span class="stat-num accent">{{ stats.pending }}</span>
        <span class="stat-label">未完成</span>
      </div>
      <div class="stat-item rate">
        <div class="rate-head">
          <span class="stat-num">{{ ratePercent }}%</span>
          <span class="stat-label">完成率</span>
        </div>
        <div class="rate-track">
          <div class="rate-fill" :style="{ width: ratePercent + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="quick-add">
        <input
          v-model="quickTitle"
          class="input"
          placeholder="添加待办，回车快速创建…"
          @keydown.enter="quickAdd"
        />
        <select v-model="quickPriority" class="select quick-select">
          <option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="quickTagId" class="select quick-select">
          <option value="">无标签</option>
          <option v-for="tag in tagStore.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
        </select>
        <button class="btn btn-primary" @click="quickAdd"><AppIcon name="plus" :size="13" /> 添加</button>
      </div>

      <div class="toolbar-row">
        <div class="segmented">
          <button :class="{ active: sortMode === 'manual' }" @click="sortMode = 'manual'">手动</button>
          <button :class="{ active: sortMode === 'priority' }" @click="sortMode = 'priority'">优先级</button>
          <button :class="{ active: sortMode === 'created' }" @click="sortMode = 'created'">创建时间</button>
        </div>

        <div class="segmented">
          <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
          <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">未完成</button>
          <button :class="{ active: statusFilter === 'completed' }" @click="statusFilter = 'completed'">已完成</button>
        </div>

        <div class="tag-filter">
          <button
            class="chip"
            :class="{ active: tagFilter === 'all' }"
            @click="tagFilter = 'all'"
          >全部</button>
          <button
            class="chip"
            :class="{ active: tagFilter === 'none' }"
            @click="tagFilter = 'none'"
          >无标签</button>
          <button
            v-for="tag in tagStore.tags"
            :key="tag.id"
            class="chip"
            :class="{ active: tagFilter === tag.id }"
            @click="tagFilter = tag.id"
          >
            <i class="dot" :style="{ background: tag.color }" /> {{ tag.name }}
          </button>
        </div>

        <button class="btn" :class="{ 'filter-on': todoStore.selectionMode }" @click="toggleSelectionMode">
          <AppIcon name="check-square" :size="13" />
          {{ todoStore.selectionMode ? '退出多选' : '多选' }}
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="todo-list">
      <div v-if="visiblePending.length === 0" class="empty-state card">
        <span>{{ statusFilter === 'completed' ? '没有已完成的待办' : '全部待办已完成，太棒了！' }}</span>
      </div>

      <TodoItem
        v-for="todo in visiblePending"
        :key="todo.id"
        :todo="todo"
        :selection-mode="todoStore.selectionMode"
        :selected="todoStore.selectedIds.has(todo.id)"
        :draggable="sortMode === 'manual' && visiblePending.length > 1"
        :class="{ 'drag-over': dragOverId === todo.id }"
        @toggle="todoStore.toggleCompleted(todo)"
        @remove="todoStore.remove(todo.id)"
        @toggle-select="todoStore.toggleSelected(todo.id)"
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drop="onDrop"
        @drag-end="dragOverId = null"
      />

      <!-- 已完成折叠区 -->
      <div v-if="visibleCompleted.length > 0" class="completed-section">
        <button class="collapse-header" @click="todoStore.completedCollapsed = !todoStore.completedCollapsed">
          <AppIcon :name="todoStore.completedCollapsed ? 'chevron-right' : 'chevron-down'" :size="13" />
          已完成（{{ visibleCompleted.length }}）
          <span class="collapse-hint">{{ todoStore.completedCollapsed ? '展开' : '折叠' }}</span>
        </button>
        <div v-if="!todoStore.completedCollapsed" class="completed-list">
          <TodoItem
            v-for="todo in visibleCompleted"
            :key="todo.id"
            :todo="todo"
            :selection-mode="todoStore.selectionMode"
            :selected="todoStore.selectedIds.has(todo.id)"
            :draggable="false"
            @toggle="todoStore.toggleCompleted(todo)"
            @remove="todoStore.remove(todo.id)"
            @toggle-select="todoStore.toggleSelected(todo.id)"
            @drag-start="() => undefined"
            @drag-over="() => undefined"
            @drop="() => undefined"
            @drag-end="() => undefined"
          />
        </div>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <transition name="fade">
      <div v-if="todoStore.selectionMode" class="batch-bar card">
        <button class="btn" @click="selectAllVisible">
          {{ todoStore.selectedIds.size === allSelectableIds.length ? '取消全选' : '全选' }}
        </button>
        <span class="batch-count">已选 {{ selectedCount }} 项</span>
        <div class="batch-actions">
          <button class="btn" :disabled="selectedCount === 0" @click="batchComplete">
            <AppIcon name="check" :size="13" /> 批量完成
          </button>
          <button class="btn btn-danger" :disabled="selectedCount === 0" @click="batchRemove">
            <AppIcon name="trash" :size="13" /> 批量删除
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.todo-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 64px;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 14px 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-item.rate {
  flex: 1;
  max-width: 320px;
  margin-left: auto;
}

.rate-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-num.success {
  color: var(--success);
}

.stat-num.accent {
  color: var(--accent);
}

.stat-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.rate-track {
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.rate-fill {
  height: 100%;
  background: var(--success);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-add {
  display: flex;
  gap: 8px;
}

.quick-add .input {
  flex: 1;
}

.quick-select {
  width: 96px;
  flex-shrink: 0;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tag-filter {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.tag-filter .chip {
  cursor: pointer;
  border: 1px solid transparent;
}

.filter-on {
  border-color: var(--accent);
  color: var(--accent);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drag-over {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.completed-section {
  margin-top: 8px;
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
  padding: 6px 4px;
  font-family: inherit;
}

.collapse-header:hover {
  color: var(--text-primary);
}

.collapse-hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 11px;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.batch-bar {
  position: fixed;
  left: calc(var(--sidebar-width) + 50%);
  transform: translateX(-50%);
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  z-index: 60;
  box-shadow: var(--shadow-pop);
}

.batch-count {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.batch-actions {
  display: flex;
  gap: 8px;
}
</style>
