<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Priority, Todo } from '@shared/types'
import { PRIORITY_LABELS } from '@shared/types'
import { useTagStore } from '../stores/tag'
import { useTodoStore } from '../stores/todo'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  todo: Todo
  selectionMode: boolean
  selected: boolean
  draggable: boolean
}>()

const emit = defineEmits<{
  toggle: [todo: Todo]
  remove: [todo: Todo]
  toggleSelect: [todo: Todo]
  dragStart: [event: DragEvent, todo: Todo]
  dragOver: [event: DragEvent, todo: Todo]
  drop: [event: DragEvent, todo: Todo]
  dragEnd: []
}>()

const tagStore = useTagStore()
const todoStore = useTodoStore()

const tag = computed(() => tagStore.tagOf(props.todo.tagId))
const editing = ref(false)

const form = reactive<{ title: string; description: string; priority: Priority; tagId: string }>({
  title: '',
  description: '',
  priority: 'none',
  tagId: ''
})

function startEdit(): void {
  form.title = props.todo.title
  form.description = props.todo.description
  form.priority = props.todo.priority
  form.tagId = props.todo.tagId ?? ''
  editing.value = true
}

async function saveEdit(): Promise<void> {
  if (!form.title.trim()) {
    editing.value = false
    return
  }
  await todoStore.update(props.todo.id, {
    title: form.title.trim(),
    description: form.description.trim(),
    priority: form.priority,
    tagId: form.tagId === '' ? null : form.tagId
  })
  editing.value = false
}
</script>

<template>
  <div
    class="todo-item card"
    :class="{
      done: todo.completed,
      selected,
      urgent: !todo.completed && todo.priority === 'high',
      dragging: draggable && !selectionMode
    }"
    :draggable="draggable && !selectionMode && !editing"
    @dragstart="emit('dragStart', $event, todo)"
    @dragover="emit('dragOver', $event, todo)"
    @drop="emit('drop', $event, todo)"
    @dragend="emit('dragEnd')"
  >
    <span v-if="draggable && !selectionMode && !editing" class="drag-handle" title="拖拽排序">
      <AppIcon name="grip" :size="14" />
    </span>

    <!-- 多选框 -->
    <input
      v-if="selectionMode"
      type="checkbox"
      class="checkbox"
      :checked="selected"
      @change="emit('toggleSelect', todo)"
    />
    <!-- 完成勾选 -->
    <input
      v-else
      type="checkbox"
      class="checkbox"
      :checked="todo.completed"
      @change="emit('toggle', todo)"
    />

    <!-- 展示态 -->
    <div v-if="!editing" class="todo-main" @dblclick="startEdit">
      <div class="todo-title-row">
        <span
          v-if="todo.priority !== 'none'"
          class="priority-flag"
          :class="'p-' + todo.priority"
          :title="`优先级：${PRIORITY_LABELS[todo.priority]}`"
        ></span>
        <span class="todo-title">{{ todo.title }}</span>
        <span v-if="tag" class="chip"><i class="dot" :style="{ background: tag.color }" /> {{ tag.name }}</span>
      </div>
      <div v-if="todo.description" class="todo-desc">{{ todo.description }}</div>
    </div>

    <!-- 编辑态 -->
    <div v-else class="edit-area" @keydown.enter.exact.prevent="saveEdit" @keydown.esc="editing = false">
      <input v-model="form.title" class="input" placeholder="标题" />
      <textarea v-model="form.description" class="textarea" rows="2" placeholder="描述（可选）"></textarea>
      <div class="edit-row">
        <select v-model="form.priority" class="select edit-select">
          <option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="form.tagId" class="select edit-select">
          <option value="">无标签</option>
          <option v-for="t in tagStore.tags" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <button class="btn btn-primary" @click="saveEdit">保存</button>
        <button class="btn" @click="editing = false">取消</button>
      </div>
    </div>

    <!-- 操作 -->
    <div v-if="!editing && !selectionMode" class="todo-actions">
      <button class="action-btn" title="编辑" @click.stop="startEdit"><AppIcon name="pencil" :size="13" /></button>
      <button class="action-btn danger" title="删除" @click.stop="emit('remove', todo)"><AppIcon name="trash" :size="13" /></button>
    </div>
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 12px;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.todo-item.dragging {
  cursor: grab;
}

.todo-item.dragging:hover {
  border-color: var(--accent);
}

.todo-item.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.todo-item.urgent {
  background: var(--danger-soft);
  border-color: color-mix(in srgb, var(--danger) 28%, transparent);
}

.todo-item.done {
  background: var(--success-soft);
  border-color: color-mix(in srgb, var(--success) 22%, transparent);
}

.todo-item.done .todo-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.drag-handle {
  color: var(--text-muted);
  cursor: grab;
  padding-top: 2px;
  display: flex;
}

.todo-main {
  flex: 1;
  min-width: 0;
  cursor: default;
}

.todo-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.todo-title {
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
}

.todo-desc {
  font-size: 11.5px;
  color: var(--text-secondary);
  margin-top: 2px;
  word-break: break-all;
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

.edit-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.edit-row {
  display: flex;
  gap: 7px;
  align-items: center;
}

.edit-select {
  width: 110px;
}

.todo-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.todo-item:hover .todo-actions {
  opacity: 1;
}

.action-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn.danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
}
</style>
