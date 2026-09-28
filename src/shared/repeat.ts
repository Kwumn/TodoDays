/**
 * 重复规则展开：把日程按重复规则在指定日期范围内展开为多个实例。
 * 主进程（提醒扫描）与渲染进程（日历网格）共用同一实现，保证一致。
 */
import type { DateRange, Schedule, ScheduleInstance } from './types'
import { addDays, addMonths, compareDate, dateOf } from './date'

/** 单条日程展开为指定范围内的实例列表 */
export function expandSchedule(schedule: Schedule, range: DateRange): ScheduleInstance[] {
  const startDate = dateOf(schedule.startTime)
  const instances: ScheduleInstance[] = []

  switch (schedule.repeatRule) {
    case 'none': {
      if (inRange(startDate, range) && !schedule.exceptionDates.includes(startDate)) {
        instances.push(makeInstance(schedule, startDate, false))
      }
      break
    }
    case 'daily':
      collectRecurring(schedule, range, (d) => addDays(d, 1), instances)
      break
    case 'weekly':
      collectRecurring(schedule, range, (d) => addDays(d, 7), instances)
      break
    case 'monthly':
      collectRecurring(schedule, range, (d) => addMonths(d, 1), instances)
      break
  }
  return instances
}

function collectRecurring(
  schedule: Schedule,
  range: DateRange,
  next: (d: string) => string,
  out: ScheduleInstance[]
): void {
  const startDate = dateOf(schedule.startTime)
  const hardEnd = schedule.repeatUntil ?? addDays(range.end, 1)
  let cursor = startDate
  // 重复从基准日期开始；若基准早于窗口起点，先快进到窗口起点附近
  if (compareDate(cursor, range.start) < 0) {
    const diffDays = diffInDays(startDate, range.start)
    const step = schedule.repeatRule === 'daily' ? 1 : schedule.repeatRule === 'weekly' ? 7 : 30
    const jump = Math.floor(diffDays / step)
    if (jump > 0) cursor = applyStep(startDate, schedule.repeatRule, jump)
  }
  let guard = 0
  while (compareDate(cursor, hardEnd) <= 0 && guard < 800) {
    guard++
    if (compareDate(cursor, range.end) > 0) break
    if (compareDate(cursor, range.start) >= 0 && !schedule.exceptionDates.includes(cursor)) {
      out.push(makeInstance(schedule, cursor, true))
    }
    cursor = next(cursor)
  }
}

function applyStep(dateStr: string, rule: Schedule['repeatRule'], n: number): string {
  if (rule === 'daily') return addDays(dateStr, n)
  if (rule === 'weekly') return addDays(dateStr, n * 7)
  if (rule === 'monthly') return addMonths(dateStr, n)
  return dateStr
}

function makeInstance(schedule: Schedule, date: string, isRecurring: boolean): ScheduleInstance {
  return {
    ...schedule,
    date,
    isRecurring,
    completed: schedule.completedDates.includes(date)
  }
}

function inRange(date: string, range: DateRange): boolean {
  return compareDate(date, range.start) >= 0 && compareDate(date, range.end) <= 0
}

function diffInDays(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  return Math.round((b - a) / 86400000)
}

/** 多条日程在范围内展开后按开始时间排序 */
export function expandAll(schedules: Schedule[], range: DateRange): ScheduleInstance[] {
  const out: ScheduleInstance[] = []
  for (const s of schedules) out.push(...expandSchedule(s, range))
  return out.sort((a, b) => a.startTime.localeCompare(b.startTime))
}
