/**
 * SQLite 连接与建表迁移（Electron 主进程，node:sqlite 内置模块，零原生编译依赖）
 */
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

let db: DatabaseSync | null = null
let dbFilePath = ''

/** 获取已打开的数据库连接 */
export function getDb(): DatabaseSync {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

/** 数据库文件绝对路径 */
export function getDbPath(): string {
  return dbFilePath
}

/** 打开（或复用）数据库连接并执行迁移 */
export function openDatabase(customPath?: string): DatabaseSync {
  if (db) return db
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  dbFilePath = customPath ?? join(dir, 'todo-days.db')
  db = new DatabaseSync(dbFilePath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  migrate(db)
  return db
}

/** 关闭连接 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/** 在事务中执行 */
export function withTransaction<T>(fn: () => T): T {
  const database = getDb()
  database.exec('BEGIN')
  try {
    const result = fn()
    database.exec('COMMIT')
    return result
  } catch (err) {
    database.exec('ROLLBACK')
    throw err
  }
}

function migrate(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'none',
      tag_id TEXT,
      color TEXT NOT NULL DEFAULT '#3b7dd8',
      repeat_rule TEXT NOT NULL DEFAULT 'none',
      repeat_until TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_minutes INTEGER NOT NULL DEFAULT 10,
      exception_dates TEXT NOT NULL DEFAULT '[]',
      completed_dates TEXT NOT NULL DEFAULT '[]',
      repeat_group_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'none',
      tag_id TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminder_log (
      key TEXT PRIMARY KEY,
      fired_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_group ON schedules (repeat_group_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_start ON schedules (start_time);
    CREATE INDEX IF NOT EXISTS idx_todos_sort ON todos (sort_order);
  `)
}

/** 安全解析 JSON 数组字段 */
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
