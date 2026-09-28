/**
 * 待办仓储
 */
import { randomUUID } from 'node:crypto'
import type { Todo, TodoInput } from '@shared/types'
import { isPriority } from '@shared/types'
import { getDb, withTransaction } from './connection'

interface TodoRow {
  id: string
  title: string
  description: string
  priority: string
  tag_id: string | null
  completed: number
  sort_order: number
  created_at: number
  completed_at: number | null
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: isPriority(row.priority) ? row.priority : 'none',
    tagId: row.tag_id,
    completed: row.completed === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    completedAt: row.completed_at
  }
}

export function listTodos(): Todo[] {
  const rows = getDb()
    .prepare('SELECT * FROM todos ORDER BY sort_order ASC, created_at ASC')
    .all() as unknown as TodoRow[]
  return rows.map(rowToTodo)
}

function nextSortOrder(): number {
  const row = getDb().prepare('SELECT MAX(sort_order) AS m FROM todos').get() as unknown as { m: number | null }
  return (row.m ?? -1) + 1
}

export function createTodo(input: TodoInput): Todo {
  const db = getDb()
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO todos (id, title, description, priority, tag_id, completed, sort_order, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL)`
  ).run(id, input.title, input.description, input.priority, input.tagId, nextSortOrder(), now)
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as unknown as TodoRow
  return rowToTodo(row)
}

export function updateTodo(id: string, input: TodoInput): void {
  getDb()
    .prepare('UPDATE todos SET title = ?, description = ?, priority = ?, tag_id = ? WHERE id = ?')
    .run(input.title, input.description, input.priority, input.tagId, id)
}

export function deleteTodo(id: string): void {
  getDb().prepare('DELETE FROM todos WHERE id = ?').run(id)
}

export function batchDeleteTodos(ids: string[]): void {
  withTransaction(() => {
    const stmt = getDb().prepare('DELETE FROM todos WHERE id = ?')
    for (const id of ids) stmt.run(id)
  })
}

export function batchSetTodosCompleted(ids: string[], completed: boolean): void {
  withTransaction(() => {
    const stmt = getDb().prepare('UPDATE todos SET completed = ?, completed_at = ? WHERE id = ?')
    for (const id of ids) stmt.run(completed ? 1 : 0, completed ? Date.now() : null, id)
  })
}

/** 按给定 id 顺序重写 sort_order */
export function reorderTodos(orderedIds: string[]): void {
  withTransaction(() => {
    const stmt = getDb().prepare('UPDATE todos SET sort_order = ? WHERE id = ?')
    orderedIds.forEach((id, index) => stmt.run(index, id))
  })
}

/** 清除全部已完成待办，返回清除数量 */
export function clearCompletedTodos(): number {
  const result = getDb().prepare('DELETE FROM todos WHERE completed = 1').run()
  return Number(result.changes)
}

export function normalizeTodoInput(raw: unknown): TodoInput {
  const obj = (raw ?? {}) as Record<string, unknown>
  return {
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : '未命名待办',
    description: typeof obj.description === 'string' ? obj.description : '',
    priority: isPriority(obj.priority) ? obj.priority : 'none',
    tagId: typeof obj.tagId === 'string' ? obj.tagId : null
  }
}

export function searchTodos(keyword: string): Todo[] {
  const like = `%${keyword}%`
  const rows = getDb()
    .prepare('SELECT * FROM todos WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 100')
    .all(like, like) as unknown as TodoRow[]
  return rows.map(rowToTodo)
}
