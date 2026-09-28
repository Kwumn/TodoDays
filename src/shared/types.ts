/**
 * 全局共享类型定义 —— 日程 / 待办 / 标签 / 设置 / 搜索
 * 主进程、预加载、渲染进程共同引用，保证端到端类型一致。
 */

/* ============ 基础联合类型 ============ */

/** 优先级 */
export type Priority = 'high' | 'medium' | 'low' | 'none'

/** 重复规则：不重复 / 每天 / 每周 / 每月 */
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly'

/** 日历视图模式 */
export type ViewMode = 'month' | 'week' | 'day'

/** 主题模式 */
export type ThemeMode = 'light' | 'dark'

/** 日历起始星期 */
export type WeekStart = 'monday' | 'sunday'

/** 待办排序方式 */
export type TodoSortMode = 'manual' | 'priority' | 'created'

/** 日程完成状态筛选 */
export type StatusFilter = 'all' | 'pending' | 'completed'

/* ============ 实体类型 ============ */

/** 标签（日程与待办共用） */
export interface Tag {
  id: string
  name: string
  /** 十六进制颜色，如 #3b7dd8 */
  color: string
  createdAt: number
}

/** 标签输入 */
export interface TagInput {
  name: string
  color: string
}

/**
 * 日程（数据库实体）。
 * 时间统一使用本地时间字符串 'YYYY-MM-DD HH:mm'，字典序即时间序。
 */
export interface Schedule {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  priority: Priority
  tagId: string | null
  /** 颜色标签 */
  color: string
  repeatRule: RepeatRule
  /** 重复结束日期 'YYYY-MM-DD'，null 表示一直重复 */
  repeatUntil: string | null
  reminderEnabled: boolean
  /** 提前提醒分钟数，0 表示准时提醒 */
  reminderMinutes: number
  /** 重复系列中被删除的日期列表（exception dates） */
  exceptionDates: string[]
  /** 重复系列中已完成的日期列表 */
  completedDates: string[]
  /** 重复组 id：同一次创建的序列共享 */
  repeatGroupId: string
  createdAt: number
  updatedAt: number
}

/** 日程编辑输入 */
export interface ScheduleInput {
  title: string
  description: string
  startTime: string
  endTime: string
  priority: Priority
  tagId: string | null
  color: string
  repeatRule: RepeatRule
  /** 重复结束日期 'YYYY-MM-DD'，null 表示一直重复 */
  repeatUntil: string | null
  reminderEnabled: boolean
  reminderMinutes: number
}

/**
 * 日程实例：日程在某个具体日期的「展开结果」。
 * 非重复日程实例即其自身；重复日程按规则展开为多个实例。
 */
export interface ScheduleInstance extends Schedule {
  /** 实例归属日期 'YYYY-MM-DD' */
  date: string
  /** 是否属于重复系列 */
  isRecurring: boolean
  /** 该实例是否已完成 */
  completed: boolean
}

/** 待办（不绑定日期） */
export interface Todo {
  id: string
  title: string
  description: string
  priority: Priority
  tagId: string | null
  completed: boolean
  /** 手动排序值，越小越靠前 */
  sortOrder: number
  createdAt: number
  completedAt: number | null
}

/** 待办编辑输入 */
export interface TodoInput {
  title: string
  description: string
  priority: Priority
  tagId: string | null
}

/* ============ 查询 / 统计 ============ */

/** 日期范围（闭区间），'YYYY-MM-DD' */
export interface DateRange {
  start: string
  end: string
}

/** 日程筛选条件 */
export interface ScheduleFilters {
  tagId: string | 'all' | 'none'
  priority: Priority | 'all'
  status: StatusFilter
}

/** 全局搜索结果（按类别分组） */
export interface SearchResult {
  keyword: string
  schedules: Schedule[]
  todos: Todo[]
}

/** 待办统计 */
export interface TodoStats {
  total: number
  completed: number
  pending: number
  /** 完成率 0~1 */
  rate: number
}

/* ============ 设置 ============ */

/** 应用设置 */
export interface AppSettings {
  theme: ThemeMode
  defaultView: ViewMode
  weekStart: WeekStart
  /** 全局提醒总开关 */
  reminderEnabled: boolean
  /** 提醒提示音 */
  reminderSound: boolean
}

/* ============ 提醒 ============ */

/** 提醒触发负载（主进程 → 渲染进程） */
export interface ReminderPayload {
  scheduleId: string
  /** 实例日期 */
  date: string
  title: string
  startTime: string
  /** 提前分钟数 */
  minutesBefore: number
}

/* ============ 导入导出 ============ */

/** JSON 导出文件结构 */
export interface ExportPayload {
  version: 1
  app: 'todo-days'
  exportedAt: string
  schedules: Schedule[]
  todos: Todo[]
  tags: Tag[]
  settings: AppSettings
}

/** 导入结果统计 */
export interface ImportResult {
  schedules: number
  todos: number
  tags: number
}

/* ============ 类型守卫与常量 ============ */

export const PRIORITIES: readonly Priority[] = ['high', 'medium', 'low', 'none'] as const

export const REPEAT_RULES: readonly RepeatRule[] = ['none', 'daily', 'weekly', 'monthly'] as const

/** 优先级展示名 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
  none: '无'
}

/** 重复规则展示名 */
export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月'
}

/** 类型守卫：是否为合法优先级 */
export function isPriority(v: unknown): v is Priority {
  return typeof v === 'string' && (PRIORITIES as readonly string[]).includes(v)
}

/** 类型守卫：是否为合法重复规则 */
export function isRepeatRule(v: unknown): v is RepeatRule {
  return typeof v === 'string' && (REPEAT_RULES as readonly string[]).includes(v)
}

/** 类型守卫：是否为本地时间字符串 'YYYY-MM-DD HH:mm' */
export function isDateTimeString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)
}

/** 类型守卫：是否为日期字符串 'YYYY-MM-DD' */
export function isDateString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** 优先级权重（越大越紧急） */
export function priorityWeight(p: Priority): number {
  switch (p) {
    case 'high':
      return 3
    case 'medium':
      return 2
    case 'low':
      return 1
    case 'none':
      return 0
  }
}
