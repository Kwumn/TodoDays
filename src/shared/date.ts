/**
 * 轻量日期工具：统一使用本地时间。
 * 日期字符串格式 'YYYY-MM-DD'，时间字符串 'YYYY-MM-DD HH:mm'。
 */

/** 星期标题（周一起始） */
const WEEKDAY_LABELS_MON = ['一', '二', '三', '四', '五', '六', '日'] as const
const WEEKDAY_LABELS_SUN = ['日', '一', '二', '三', '四', '五', '六'] as const

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 今天日期 'YYYY-MM-DD' */
export function todayStr(): string {
  return toDateStr(new Date())
}

/** Date → 'YYYY-MM-DD' */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Date → 'YYYY-MM-DD HH:mm' */
export function toDateTimeStr(d: Date): string {
  return `${toDateStr(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 当前时间 'YYYY-MM-DD HH:mm' */
export function nowStr(): string {
  return toDateTimeStr(new Date())
}

/** 'YYYY-MM-DD' → Date（本地零点） */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 'YYYY-MM-DD HH:mm' → Date */
export function parseDateTime(s: string): Date {
  const [datePart, timePart = '00:00'] = s.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
}

/** 日期加 n 天 */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** 日期加 n 月（目标月不存在同一天则收敛到月末） */
export function addMonths(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toDateStr(d)
}

/** 所在周的起始日期（依据 weekStart） */
export function startOfWeek(dateStr: string, weekStart: 'monday' | 'sunday'): string {
  const d = parseDate(dateStr)
  const day = d.getDay() // 0 周日
  const diff = weekStart === 'monday' ? (day === 0 ? -6 : 1 - day) : -day
  return addDays(dateStr, diff)
}

/** 月份天数 */
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

/** 月份第一天 'YYYY-MM-DD' */
export function firstDayOfMonth(year: number, month0: number): string {
  return `${year}-${pad2(month0 + 1)}-01`
}

/**
 * 生成月视图网格日期列表：包含首尾补齐的整周，保证行数为 6 或 5。
 */
export function generateMonthGrid(year: number, month0: number, weekStart: 'monday' | 'sunday'): string[] {
  const first = firstDayOfMonth(year, month0)
  const gridStart = startOfWeek(first, weekStart)
  const days = daysInMonth(year, month0)
  const rows = Math.ceil((offsetOfFirstDay(first, weekStart) + days) / 7)
  const result: string[] = []
  for (let i = 0; i < rows * 7; i++) result.push(addDays(gridStart, i))
  return result
}

function offsetOfFirstDay(first: string, weekStart: 'monday' | 'sunday'): number {
  const d = parseDate(first)
  const day = d.getDay()
  return weekStart === 'monday' ? (day === 0 ? 6 : day - 1) : day
}

/** 星期标题列表 */
export function weekdayLabels(weekStart: 'monday' | 'sunday'): readonly string[] {
  return weekStart === 'monday' ? WEEKDAY_LABELS_MON : WEEKDAY_LABELS_SUN
}

/** 日期是否在今天之前（不含今天） */
export function isPastDate(dateStr: string): boolean {
  return dateStr < todayStr()
}

/** 友好显示：今天 / 明天 / 星期几 */
export function friendlyDate(dateStr: string): string {
  if (dateStr === todayStr()) return '今天'
  if (dateStr === addDays(todayStr(), 1)) return '明天'
  if (dateStr === addDays(todayStr(), 2)) return '后天'
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${'日一二三四五六'[d.getDay()]}`
}

/** 'HH:mm' 提取 */
export function timeOf(dateTimeStr: string): string {
  return dateTimeStr.split(' ')[1] ?? '00:00'
}

/** 日期部分提取 */
export function dateOf(dateTimeStr: string): string {
  return dateTimeStr.split(' ')[0]
}

/** 毫秒时间戳 */
export function toTimestamp(dateTimeStr: string): number {
  return parseDateTime(dateTimeStr).getTime()
}

/** 比较两个日期字符串的天序 */
export function compareDate(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1
}
