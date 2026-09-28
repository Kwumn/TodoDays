import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Todo, TodoInput, TodoSortMode, TodoStats } from '@shared/types'
import { priorityWeight } from '@shared/types'

export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([])
  const loaded = ref(false)
  const sortMode = ref<TodoSortMode>('manual')
  const completedCollapsed = ref(true)
  /** 多选模式选中的 id 集合 */
  const selectedIds = ref<Set<string>>(new Set())
  const selectionMode = ref(false)

  const pending = computed<Todo[]>(() => todos.value.filter((t) => !t.completed))
  const completed = computed<Todo[]>(() => todos.value.filter((t) => t.completed))

  const stats = computed<TodoStats>(() => {
    const total = todos.value.length
    const done = todos.value.filter((t) => t.completed).length
    return {
      total,
      completed: done,
      pending: total - done,
      rate: total === 0 ? 0 : done / total
    }
  })

  /** 当前排序方式下的未完成待办 */
  const sortedPending = computed<Todo[]>(() => sortList(pending.value, sortMode.value))

  async function load(): Promise<void> {
    todos.value = await window.api.listTodos()
    loaded.value = true
  }

  function sortList(list: Todo[], mode: TodoSortMode): Todo[] {
    const copy = [...list]
    switch (mode) {
      case 'priority':
        return copy.sort(
          (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || b.createdAt - a.createdAt
        )
      case 'created':
        return copy.sort((a, b) => b.createdAt - a.createdAt)
      case 'manual':
      default:
        return copy.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
    }
  }

  async function create(input: TodoInput): Promise<void> {
    await window.api.createTodo(input)
    await load()
  }

  async function update(id: string, input: TodoInput): Promise<void> {
    await window.api.updateTodo(id, input)
    await load()
  }

  async function toggleCompleted(todo: Todo): Promise<void> {
    await window.api.batchSetTodosCompleted([todo.id], !todo.completed)
    await load()
  }

  async function remove(id: string): Promise<void> {
    await window.api.deleteTodo(id)
    await load()
  }

  async function reorder(orderedIds: string[]): Promise<void> {
    await window.api.reorderTodos(orderedIds)
    await load()
  }

  async function batchRemove(ids: string[]): Promise<void> {
    await window.api.batchDeleteTodos(ids)
    clearSelection()
    await load()
  }

  async function batchComplete(ids: string[], completed: boolean): Promise<void> {
    await window.api.batchSetTodosCompleted(ids, completed)
    clearSelection()
    await load()
  }

  async function clearCompleted(): Promise<number> {
    const n = await window.api.clearCompletedTodos()
    await load()
    return n
  }

  /* ---- 多选 ---- */
  function toggleSelected(id: string): void {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function selectAll(ids: string[]): void {
    selectedIds.value = new Set(ids)
  }

  function clearSelection(): void {
    selectedIds.value = new Set()
    selectionMode.value = false
  }

  return {
    todos,
    loaded,
    sortMode,
    completedCollapsed,
    selectedIds,
    selectionMode,
    pending,
    completed,
    stats,
    sortedPending,
    load,
    create,
    update,
    toggleCompleted,
    remove,
    reorder,
    batchRemove,
    batchComplete,
    clearCompleted,
    toggleSelected,
    selectAll,
    clearSelection
  }
})
