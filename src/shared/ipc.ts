/**
 * IPC 通道契约：主进程 handler 与 preload 桥的单一事实来源。
 * 通道命名：模块:动作。
 */
import type {
  AppSettings,
  DateRange,
  ExportPayload,
  ImportResult,
  ReminderPayload,
  Schedule,
  ScheduleInput,
  SearchResult,
  Tag,
  TagInput,
  Todo,
  TodoInput
} from './types'

/** 主进程暴露给渲染进程的完整 API */
export interface TodoDaysApi {
  /* ---- 日程 ---- */
  listScheduleInstances(range: DateRange): Promise<Schedule[]>
  listAllSchedules(): Promise<Schedule[]>
  createSchedule(input: ScheduleInput): Promise<Schedule>
  updateSchedule(id: string, input: ScheduleInput): Promise<void>
  /** 重复日程：编辑单条实例（原系列排除该日 + 生成一条独立日程） */
  updateScheduleInstance(id: string, date: string, input: ScheduleInput): Promise<void>
  deleteSchedule(id: string): Promise<void>
  /** 重复日程：删除单条实例（记录 exception） */
  deleteScheduleInstance(id: string, date: string): Promise<void>
  /** 删除整个重复序列 */
  deleteScheduleSeries(groupId: string): Promise<void>
  setScheduleCompleted(payload: { id: string; date: string; completed: boolean }): Promise<void>

  /* ---- 待办 ---- */
  listTodos(): Promise<Todo[]>
  createTodo(input: TodoInput): Promise<Todo>
  updateTodo(id: string, input: TodoInput): Promise<void>
  deleteTodo(id: string): Promise<void>
  batchDeleteTodos(ids: string[]): Promise<void>
  batchSetTodosCompleted(ids: string[], completed: boolean): Promise<void>
  reorderTodos(orderedIds: string[]): Promise<void>
  clearCompletedTodos(): Promise<number>

  /* ---- 标签 ---- */
  listTags(): Promise<Tag[]>
  createTag(input: TagInput): Promise<Tag>
  updateTag(id: string, input: TagInput): Promise<void>
  deleteTag(id: string): Promise<void>

  /* ---- 设置 ---- */
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>

  /* ---- 搜索 ---- */
  search(keyword: string): Promise<SearchResult>

  /* ---- 数据管理 ---- */
  exportJson(): Promise<ExportPayload | null>
  importJson(): Promise<ImportResult | null>
  backupData(): Promise<string | null>
  restoreBackup(): Promise<boolean>

  /* ---- 事件 ---- */
  onReminderFired(cb: (payload: ReminderPayload) => void): () => void
}

/** IPC 通道名常量 */
export const IpcChannel = {
  ScheduleListInstances: 'schedule:listInstances',
  ScheduleListAll: 'schedule:listAll',
  ScheduleCreate: 'schedule:create',
  ScheduleUpdate: 'schedule:update',
  ScheduleUpdateInstance: 'schedule:updateInstance',
  ScheduleDelete: 'schedule:delete',
  ScheduleDeleteInstance: 'schedule:deleteInstance',
  ScheduleDeleteSeries: 'schedule:deleteSeries',
  ScheduleSetCompleted: 'schedule:setCompleted',

  TodoList: 'todo:list',
  TodoCreate: 'todo:create',
  TodoUpdate: 'todo:update',
  TodoDelete: 'todo:delete',
  TodoBatchDelete: 'todo:batchDelete',
  TodoBatchComplete: 'todo:batchComplete',
  TodoReorder: 'todo:reorder',
  TodoClearCompleted: 'todo:clearCompleted',

  TagList: 'tag:list',
  TagCreate: 'tag:create',
  TagUpdate: 'tag:update',
  TagDelete: 'tag:delete',

  SettingsGet: 'settings:get',
  SettingsSave: 'settings:save',

  Search: 'search:query',

  DataExport: 'data:export',
  DataImport: 'data:import',
  DataBackup: 'data:backup',
  DataRestore: 'data:restore',

  ReminderFired: 'reminder:fired'
} as const
