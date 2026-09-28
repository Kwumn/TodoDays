/**
 * 数据管理：JSON 导入导出、一键备份与恢复
 */
import { app, dialog, shell } from 'electron'
import { closeSync, copyFileSync, existsSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings, ExportPayload, ImportResult, Schedule, Tag, Todo } from '@shared/types'
import { isPriority, isRepeatRule } from '@shared/types'
import { closeDatabase, getDb, getDbPath, withTransaction } from './connection'
import { listAllSchedules } from './scheduleRepo'
import { listTodos } from './todoRepo'
import { listTags } from './tagRepo'
import { loadSettings, DEFAULT_SETTINGS } from './settingsRepo'

/* ---------- JSON 导出 ---------- */

export function buildExportPayload(): ExportPayload {
  return {
    version: 1,
    app: 'todo-days',
    exportedAt: new Date().toISOString(),
    schedules: listAllSchedules(),
    todos: listTodos(),
    tags: listTags(),
    settings: loadSettings()
  }
}

/** 弹出保存对话框导出 JSON，返回文件路径或 null（取消） */
export async function exportJson(win: Electron.BrowserWindow | null): Promise<string | null> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const result = await dialog.showSaveDialog(win ?? new Electron.BrowserWindow(), {
    title: '导出数据（JSON）',
    defaultPath: join(app.getPath('documents'), `todo-days-export-${stamp}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return null
  writeFileSync(result.filePath, JSON.stringify(buildExportPayload(), null, 2), 'utf-8')
  return result.filePath
}

/* ---------- JSON 导入（合并策略：按 id upsert，不删除已有数据） ---------- */

interface RawScheduleLike {
  id?: unknown
  title?: unknown
  description?: unknown
  startTime?: unknown
  endTime?: unknown
  priority?: unknown
  tagId?: unknown
  color?: unknown
  repeatRule?: unknown
  repeatUntil?: unknown
  reminderEnabled?: unknown
  reminderMinutes?: unknown
  exceptionDates?: unknown
  completedDates?: unknown
  repeatGroupId?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function coerceSchedule(raw: RawScheduleLike): Schedule | null {
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null
  if (typeof raw.startTime !== 'string' || typeof raw.endTime !== 'string') return null
  const now = Date.now()
  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : '',
    startTime: raw.startTime,
    endTime: raw.endTime,
    priority: isPriority(raw.priority) ? raw.priority : 'none',
    tagId: typeof raw.tagId === 'string' ? raw.tagId : null,
    color: typeof raw.color === 'string' ? raw.color : '#3b7dd8',
    repeatRule: isRepeatRule(raw.repeatRule) ? raw.repeatRule : 'none',
    repeatUntil: typeof raw.repeatUntil === 'string' ? raw.repeatUntil : null,
    reminderEnabled: raw.reminderEnabled === true,
    reminderMinutes: typeof raw.reminderMinutes === 'number' ? raw.reminderMinutes : 10,
    exceptionDates: asStringArray(raw.exceptionDates),
    completedDates: asStringArray(raw.completedDates),
    repeatGroupId: typeof raw.repeatGroupId === 'string' ? raw.repeatGroupId : raw.id,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now
  }
}

function coerceTodo(raw: Record<string, unknown>): Todo | null {
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null
  const now = Date.now()
  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : '',
    priority: isPriority(raw.priority) ? raw.priority : 'none',
    tagId: typeof raw.tagId === 'string' ? raw.tagId : null,
    completed: raw.completed === true,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    completedAt: typeof raw.completedAt === 'number' ? raw.completedAt : null
  }
}

function coerceTag(raw: Record<string, unknown>): Tag | null {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  return {
    id: raw.id,
    name: raw.name,
    color: typeof raw.color === 'string' ? raw.color : '#6b7f95',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
  }
}

function coerceSettings(raw: unknown): AppSettings | null {
  if (raw === null || typeof raw !== 'object') return null
  return { ...DEFAULT_SETTINGS, ...(raw as Partial<AppSettings>) }
}

/** 选择并导入 JSON 文件 */
export async function importJson(win: Electron.BrowserWindow | null): Promise<ImportResult | null> {
  const result = await dialog.showOpenDialog(win ?? new Electron.BrowserWindow(), {
    title: '导入数据（JSON）',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const content = readFileSync(result.filePaths[0], 'utf-8')
  const parsed: unknown = JSON.parse(content)
  const obj = (parsed ?? {}) as Record<string, unknown>
  if (obj.app !== 'todo-days') throw new Error('文件格式不正确：不是本应用导出的数据')

  const schedules = Array.isArray(obj.schedules)
    ? obj.schedules.map((s) => coerceSchedule((s ?? {}) as RawScheduleLike)).filter((s): s is Schedule => s !== null)
    : []
  const todos = Array.isArray(obj.todos)
    ? obj.todos.map((t) => coerceTodo((t ?? {}) as Record<string, unknown>)).filter((t): t is Todo => t !== null)
    : []
  const tags = Array.isArray(obj.tags)
    ? obj.tags.map((t) => coerceTag((t ?? {}) as Record<string, unknown>)).filter((t): t is Tag => t !== null)
    : []
  const settings = coerceSettings(obj.settings)

  withTransaction(() => {
    const db = getDb()
    const upsertSchedule = db.prepare(
      `INSERT INTO schedules
        (id, title, description, start_time, end_time, priority, tag_id, color,
         repeat_rule, repeat_until, reminder_enabled, reminder_minutes,
         exception_dates, completed_dates, repeat_group_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, description=excluded.description, start_time=excluded.start_time,
        end_time=excluded.end_time, priority=excluded.priority, tag_id=excluded.tag_id,
        color=excluded.color, repeat_rule=excluded.repeat_rule, repeat_until=excluded.repeat_until,
        reminder_enabled=excluded.reminder_enabled, reminder_minutes=excluded.reminder_minutes,
        exception_dates=excluded.exception_dates, completed_dates=excluded.completed_dates,
        repeat_group_id=excluded.repeat_group_id, updated_at=excluded.updated_at`
    )
    for (const s of schedules) {
      upsertSchedule.run(
        s.id, s.title, s.description, s.startTime, s.endTime, s.priority, s.tagId, s.color,
        s.repeatRule, s.repeatUntil, s.reminderEnabled ? 1 : 0, s.reminderMinutes,
        JSON.stringify(s.exceptionDates), JSON.stringify(s.completedDates), s.repeatGroupId,
        s.createdAt, s.updatedAt
      )
    }
    const upsertTodo = db.prepare(
      `INSERT INTO todos (id, title, description, priority, tag_id, completed, sort_order, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, description=excluded.description, priority=excluded.priority,
        tag_id=excluded.tag_id, completed=excluded.completed, sort_order=excluded.sort_order,
        completed_at=excluded.completed_at`
    )
    for (const t of todos) {
      upsertTodo.run(t.id, t.title, t.description, t.priority, t.tagId, t.completed ? 1 : 0, t.sortOrder, t.createdAt, t.completedAt)
    }
    const upsertTag = db.prepare(
      `INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color`
    )
    for (const t of tags) upsertTag.run(t.id, t.name, t.color, t.createdAt)
    if (settings) {
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run('app_settings', JSON.stringify(settings))
    }
  })

  return { schedules: schedules.length, todos: todos.length, tags: tags.length }
}

/* ---------- 备份 / 恢复（数据库文件级） ---------- */

/** 一键备份：VACUUM INTO 生成一致性快照 */
export async function backupData(win: Electron.BrowserWindow | null): Promise<string | null> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const result = await dialog.showSaveDialog(win ?? new Electron.BrowserWindow(), {
    title: '备份全部数据（SQLite 文件）',
    defaultPath: join(app.getPath('documents'), `todo-days-backup-${stamp}.db`),
    filters: [{ name: 'SQLite 数据库', extensions: ['db'] }]
  })
  if (result.canceled || !result.filePath) return null
  const target = result.filePath.endsWith('.db') ? result.filePath : `${result.filePath}.db`
  getDb().exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
  return target
}

const SQLITE_HEADER = 'SQLite format 3\x00'

/** 恢复备份：校验 → 关闭连接 → 替换文件 → 重启应用 */
export async function restoreBackup(win: Electron.BrowserWindow | null): Promise<boolean> {
  const result = await dialog.showOpenDialog(win ?? new Electron.BrowserWindow(), {
    title: '恢复备份（选择此前导出的 .db 文件）',
    filters: [{ name: 'SQLite 数据库', extensions: ['db'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return false
  const source = result.filePaths[0]

  const stat = statSync(source)
  if (stat.size < 100) throw new Error('文件太小，不是有效的数据库备份')
  const header = Buffer.alloc(16)
  const fd = openSync(source, 'r')
  try {
    readSync(fd, header, 0, 16, 0)
  } finally {
    closeSync(fd)
  }
  if (!header.toString('binary').startsWith(SQLITE_HEADER.slice(0, 15))) {
    throw new Error('所选文件不是 SQLite 数据库')
  }

  const dbPath = getDbPath()
  // 先把当前数据做安全副本，再替换
  const safetyCopy = `${dbPath}.before-restore-${Date.now()}`
  if (existsSync(dbPath)) copyFileSync(dbPath, safetyCopy)
  closeDatabase()
  copyFileSync(source, dbPath)
  await dialog.showMessageBox({
    type: 'info',
    title: '恢复完成',
    message: '备份已恢复，应用即将重启。'
  })
  app.relaunch()
  app.exit(0)
  return true
}

/** 在资源管理器中显示数据目录 */
export async function revealDataFolder(): Promise<void> {
  await shell.openPath(app.getPath('userData'))
}
