/**
 * 标签仓储（日程与待办共用）
 */
import { randomUUID } from 'node:crypto'
import type { Tag, TagInput } from '@shared/types'
import { getDb, withTransaction } from './connection'

interface TagRow {
  id: string
  name: string
  color: string
  created_at: number
}

function rowToTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at }
}

export function listTags(): Tag[] {
  const rows = getDb().prepare('SELECT * FROM tags ORDER BY created_at ASC').all() as unknown as TagRow[]
  return rows.map(rowToTag)
}

export function createTag(input: TagInput): Tag {
  const db = getDb()
  const id = randomUUID()
  db.prepare('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    input.name,
    input.color,
    Date.now()
  )
  const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as unknown as TagRow
  return rowToTag(row)
}

export function updateTag(id: string, input: TagInput): void {
  getDb().prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(input.name, input.color, id)
}

/** 删除标签并解除日程/待办上的引用 */
export function deleteTag(id: string): void {
  withTransaction(() => {
    const db = getDb()
    db.prepare('UPDATE schedules SET tag_id = NULL WHERE tag_id = ?').run(id)
    db.prepare('UPDATE todos SET tag_id = NULL WHERE tag_id = ?').run(id)
    db.prepare('DELETE FROM tags WHERE id = ?').run(id)
  })
}

export function normalizeTagInput(raw: unknown): TagInput {
  const obj = (raw ?? {}) as Record<string, unknown>
  return {
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : '新标签',
    color: typeof obj.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(obj.color) ? obj.color : '#6b7f95'
  }
}
