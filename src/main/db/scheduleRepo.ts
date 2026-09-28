/**
 * 日程仓储：数据库行 ↔ Schedule 实体映射与 CRUD
 */
import { randomUUID } from 'node:crypto'
import type { Schedule, ScheduleInput } from '@shared/types'
import { isPriority, isRepeatRule, PRIORITIES, REPEAT_RULES } from '@shared/types'
import { dateOf, nowStr } from '@shared/date'
import { getDb, parseJsonArray, withTransaction } from './connection'

interface ScheduleRow {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  priority: string
  tag_id: string | null
  color: string
  repeat_rule: string
  repeat_until: string | null
  reminder_enabled: number
  reminder_minutes: number
  exception_dates: string
  completed_dates: string
  repeat_group_id: string
  created_at: number
  updated_at: number
}

function rowToSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    priority: isPriority(row.priority) ? row.priority : 'none',
    tagId: row.tag_id,
    color: row.color,
    repeatRule: isRepeatRule(row.repeat_rule) ? row.repeat_rule : 'none',
    repeatUntil: row.repeat_until,
    reminderEnabled: row.reminder_enabled === 1,
    reminderMinutes: row.reminder_minutes,
    exceptionDates: parseJsonArray(row.exception_dates),
    completedDates: parseJsonArray(row.completed_dates),
    repeatGroupId: row.repeat_group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listAllSchedules(): Schedule[] {
  const rows = getDb().prepare('SELECT * FROM schedules ORDER BY start_time ASC').all() as unknown as ScheduleRow[]
  return rows.map(rowToSchedule)
}

export function getScheduleById(id: string): Schedule | null {
  const row = getDb().prepare('SELECT * FROM schedules WHERE id = ?').get(id) as unknown as ScheduleRow | undefined
  return row ? rowToSchedule(row) : null
}

export function createSchedule(input: ScheduleInput): Schedule {
  const db = getDb()
  const id = randomUUID()
  const groupId = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO schedules
      (id, title, description, start_time, end_time, priority, tag_id, color,
       repeat_rule, repeat_until, reminder_enabled, reminder_minutes,
       exception_dates, completed_dates, repeat_group_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?)`
  ).run(
    id,
    input.title,
    input.description,
    input.startTime,
    input.endTime,
    input.priority,
    input.tagId,
    input.color,
    input.repeatRule,
    input.repeatUntil,
    input.reminderEnabled ? 1 : 0,
    input.reminderMinutes,
    groupId,
    now,
    now
  )
  return getScheduleById(id) as Schedule
}

export function updateSchedule(id: string, input: ScheduleInput): void {
  getDb()
    .prepare(
      `UPDATE schedules SET
        title = ?, description = ?, start_time = ?, end_time = ?, priority = ?,
        tag_id = ?, color = ?, repeat_rule = ?, repeat_until = ?,
        reminder_enabled = ?, reminder_minutes = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.title,
      input.description,
      input.startTime,
      input.endTime,
      input.priority,
      input.tagId,
      input.color,
      input.repeatRule,
      input.repeatUntil,
      input.reminderEnabled ? 1 : 0,
      input.reminderMinutes,
      Date.now(),
      id
    )
}

/**
 * 重复日程「编辑单条实例」：原系列记录该日为 exception，并生成一条独立日程。
 * 非重复日程直接调用 updateSchedule 即可，不走此方法。
 */
export function updateScheduleInstance(id: string, date: string, input: ScheduleInput): void {
  withTransaction(() => {
    const original = getScheduleById(id)
    if (!original) throw new Error('日程不存在')
    if (original.repeatRule === 'none') {
      updateSchedule(id, input)
      return
    }
    // 原系列排除该日期
    const exceptions = [...new Set([...original.exceptionDates, date])]
    getDb()
      .prepare('UPDATE schedules SET exception_dates = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(exceptions), Date.now(), id)
    // 生成独立日程，时间取原实例的当日时间
    const time = dateOf(original.startTime) === date ? original.startTime.slice(11) : input.startTime.slice(11)
    const endTime = input.endTime.slice(11)
    createSchedule({
      ...input,
      startTime: `${date} ${time}`,
      endTime: `${date} ${endTime}`,
      repeatRule: 'none'
    })
  })
}

export function deleteSchedule(id: string): void {
  getDb().prepare('DELETE FROM schedules WHERE id = ?').run(id)
}

/** 删除重复系列中的单条实例（记录 exception） */
export function deleteScheduleInstance(id: string, date: string): void {
  const original = getScheduleById(id)
  if (!original) return
  const exceptions = [...new Set([...original.exceptionDates, date])]
  getDb()
    .prepare('UPDATE schedules SET exception_dates = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(exceptions), Date.now(), id)
}

export function deleteScheduleSeries(groupId: string): void {
  getDb().prepare('DELETE FROM schedules WHERE repeat_group_id = ?').run(groupId)
}

/** 设置某实例完成状态（非重复日程 date 传其开始日期） */
export function setScheduleCompleted(id: string, date: string, completed: boolean): void {
  const original = getScheduleById(id)
  if (!original) return
  const set = new Set(original.completedDates)
  if (completed) set.add(date)
  else set.delete(date)
  getDb()
    .prepare('UPDATE schedules SET completed_dates = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify([...set]), Date.now(), id)
}

/** 载入输入并做防御性归一化 */
export function normalizeScheduleInput(raw: unknown): ScheduleInput {
  const obj = (raw ?? {}) as Record<string, unknown>
  const priority = isPriority(obj.priority) ? obj.priority : 'none'
  const repeatRule = isRepeatRule(obj.repeatRule) ? obj.repeatRule : 'none'
  const start = typeof obj.startTime === 'string' ? obj.startTime : nowStr()
  return {
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : '未命名日程',
    description: typeof obj.description === 'string' ? obj.description : '',
    startTime: start,
    endTime: typeof obj.endTime === 'string' && obj.endTime >= start ? obj.endTime : start,
    priority,
    tagId: typeof obj.tagId === 'string' ? obj.tagId : null,
    color: typeof obj.color === 'string' ? obj.color : '#3b7dd8',
    repeatRule,
    repeatUntil: typeof obj.repeatUntil === 'string' ? obj.repeatUntil : null,
    reminderEnabled: obj.reminderEnabled === true,
    reminderMinutes: typeof obj.reminderMinutes === 'number' && obj.reminderMinutes >= 0 ? obj.reminderMinutes : 10
  }
}

/** 供搜索使用 */
export function searchSchedules(keyword: string): Schedule[] {
  const like = `%${keyword}%`
  const rows = getDb()
    .prepare('SELECT * FROM schedules WHERE title LIKE ? OR description LIKE ? ORDER BY start_time ASC LIMIT 100')
    .all(like, like) as unknown as ScheduleRow[]
  return rows.map(rowToSchedule)
}

/** 常量重导出，保证 repo 自洽（供未来校验扩展） */
export const SCHEDULE_CONSTRAINTS = { priorities: PRIORITIES, repeatRules: REPEAT_RULES } as const
