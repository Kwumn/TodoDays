/**
 * IPC 统一注册：渲染进程 ↔ 主进程 的所有处理逻辑入口
 */
import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { AppSettings, DateRange } from '@shared/types'
import {
  createSchedule,
  deleteSchedule,
  deleteScheduleInstance,
  deleteScheduleSeries,
  getScheduleById,
  listAllSchedules,
  normalizeScheduleInput,
  searchSchedules,
  setScheduleCompleted,
  updateSchedule,
  updateScheduleInstance
} from '../db/scheduleRepo'
import {
  batchDeleteTodos,
  batchSetTodosCompleted,
  clearCompletedTodos,
  createTodo,
  deleteTodo,
  listTodos,
  normalizeTodoInput,
  reorderTodos,
  searchTodos,
  updateTodo
} from '../db/todoRepo'
import { createTag, deleteTag, listTags, normalizeTagInput, updateTag } from '../db/tagRepo'
import { loadSettings, saveSettings } from '../db/settingsRepo'
import { backupData, exportJson, importJson, restoreBackup } from '../db/dataService'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  /* ---- 日程 ---- */
  ipcMain.handle(IpcChannel.ScheduleListInstances, (_e, _range: DateRange) => listAllSchedules())
  ipcMain.handle(IpcChannel.ScheduleListAll, () => listAllSchedules())
  ipcMain.handle(IpcChannel.ScheduleCreate, (_e, raw: unknown) => createSchedule(normalizeScheduleInput(raw)))
  ipcMain.handle(IpcChannel.ScheduleUpdate, (_e, id: string, raw: unknown) => {
    updateSchedule(id, normalizeScheduleInput(raw))
  })
  ipcMain.handle(IpcChannel.ScheduleUpdateInstance, (_e, id: string, date: string, raw: unknown) => {
    updateScheduleInstance(id, date, normalizeScheduleInput(raw))
  })
  ipcMain.handle(IpcChannel.ScheduleDelete, (_e, id: string) => {
    deleteSchedule(id)
  })
  ipcMain.handle(IpcChannel.ScheduleDeleteInstance, (_e, id: string, date: string) => {
    deleteScheduleInstance(id, date)
  })
  ipcMain.handle(IpcChannel.ScheduleDeleteSeries, (_e, groupId: string) => {
    deleteScheduleSeries(groupId)
  })
  ipcMain.handle(IpcChannel.ScheduleSetCompleted, (_e, p: { id: string; date: string; completed: boolean }) => {
    setScheduleCompleted(p.id, p.date, p.completed)
  })

  /* ---- 待办 ---- */
  ipcMain.handle(IpcChannel.TodoList, () => listTodos())
  ipcMain.handle(IpcChannel.TodoCreate, (_e, raw: unknown) => createTodo(normalizeTodoInput(raw)))
  ipcMain.handle(IpcChannel.TodoUpdate, (_e, id: string, raw: unknown) => updateTodo(id, normalizeTodoInput(raw)))
  ipcMain.handle(IpcChannel.TodoDelete, (_e, id: string) => deleteTodo(id))
  ipcMain.handle(IpcChannel.TodoBatchDelete, (_e, ids: string[]) => batchDeleteTodos(ids))
  ipcMain.handle(IpcChannel.TodoBatchComplete, (_e, ids: string[], completed: boolean) =>
    batchSetTodosCompleted(ids, completed)
  )
  ipcMain.handle(IpcChannel.TodoReorder, (_e, orderedIds: string[]) => reorderTodos(orderedIds))
  ipcMain.handle(IpcChannel.TodoClearCompleted, () => clearCompletedTodos())

  /* ---- 标签 ---- */
  ipcMain.handle(IpcChannel.TagList, () => listTags())
  ipcMain.handle(IpcChannel.TagCreate, (_e, raw: unknown) => createTag(normalizeTagInput(raw)))
  ipcMain.handle(IpcChannel.TagUpdate, (_e, id: string, raw: unknown) => updateTag(id, normalizeTagInput(raw)))
  ipcMain.handle(IpcChannel.TagDelete, (_e, id: string) => deleteTag(id))

  /* ---- 设置 ---- */
  ipcMain.handle(IpcChannel.SettingsGet, () => loadSettings())
  ipcMain.handle(IpcChannel.SettingsSave, (_e, settings: AppSettings) => saveSettings(settings))

  /* ---- 搜索 ---- */
  ipcMain.handle(IpcChannel.Search, (_e, keyword: string) => {
    const kw = keyword.trim()
    if (!kw) return { keyword: kw, schedules: [], todos: [] }
    return { keyword: kw, schedules: searchSchedules(kw), todos: searchTodos(kw) }
  })

  /* ---- 数据管理 ---- */
  ipcMain.handle(IpcChannel.DataExport, () => exportJson(getWindow()))
  ipcMain.handle(IpcChannel.DataImport, () => importJson(getWindow()))
  ipcMain.handle(IpcChannel.DataBackup, () => backupData(getWindow()))
  ipcMain.handle(IpcChannel.DataRestore, () => restoreBackup(getWindow()))
}

/** 载入单条日程（供 preload 类型自检使用） */
export function scheduleExists(id: string): boolean {
  return getScheduleById(id) !== null
}
