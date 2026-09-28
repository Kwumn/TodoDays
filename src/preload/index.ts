/**
 * 预加载脚本：通过 contextBridge 暴露类型安全的 API
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IpcChannel, type TodoDaysApi } from '@shared/ipc'
import type { ReminderPayload } from '@shared/types'

const api: TodoDaysApi = {
  /* ---- 日程 ---- */
  listScheduleInstances: (range) => ipcRenderer.invoke(IpcChannel.ScheduleListInstances, range),
  listAllSchedules: () => ipcRenderer.invoke(IpcChannel.ScheduleListAll),
  createSchedule: (input) => ipcRenderer.invoke(IpcChannel.ScheduleCreate, input),
  updateSchedule: (id, input) => ipcRenderer.invoke(IpcChannel.ScheduleUpdate, id, input),
  updateScheduleInstance: (id, date, input) =>
    ipcRenderer.invoke(IpcChannel.ScheduleUpdateInstance, id, date, input),
  deleteSchedule: (id) => ipcRenderer.invoke(IpcChannel.ScheduleDelete, id),
  deleteScheduleInstance: (id, date) => ipcRenderer.invoke(IpcChannel.ScheduleDeleteInstance, id, date),
  deleteScheduleSeries: (groupId) => ipcRenderer.invoke(IpcChannel.ScheduleDeleteSeries, groupId),
  setScheduleCompleted: (payload) => ipcRenderer.invoke(IpcChannel.ScheduleSetCompleted, payload),

  /* ---- 待办 ---- */
  listTodos: () => ipcRenderer.invoke(IpcChannel.TodoList),
  createTodo: (input) => ipcRenderer.invoke(IpcChannel.TodoCreate, input),
  updateTodo: (id, input) => ipcRenderer.invoke(IpcChannel.TodoUpdate, id, input),
  deleteTodo: (id) => ipcRenderer.invoke(IpcChannel.TodoDelete, id),
  batchDeleteTodos: (ids) => ipcRenderer.invoke(IpcChannel.TodoBatchDelete, ids),
  batchSetTodosCompleted: (ids, completed) => ipcRenderer.invoke(IpcChannel.TodoBatchComplete, ids, completed),
  reorderTodos: (orderedIds) => ipcRenderer.invoke(IpcChannel.TodoReorder, orderedIds),
  clearCompletedTodos: () => ipcRenderer.invoke(IpcChannel.TodoClearCompleted),

  /* ---- 标签 ---- */
  listTags: () => ipcRenderer.invoke(IpcChannel.TagList),
  createTag: (input) => ipcRenderer.invoke(IpcChannel.TagCreate, input),
  updateTag: (id, input) => ipcRenderer.invoke(IpcChannel.TagUpdate, id, input),
  deleteTag: (id) => ipcRenderer.invoke(IpcChannel.TagDelete, id),

  /* ---- 设置 ---- */
  getSettings: () => ipcRenderer.invoke(IpcChannel.SettingsGet),
  saveSettings: (settings) => ipcRenderer.invoke(IpcChannel.SettingsSave, settings),

  /* ---- 搜索 ---- */
  search: (keyword) => ipcRenderer.invoke(IpcChannel.Search, keyword),

  /* ---- 数据管理 ---- */
  exportJson: () => ipcRenderer.invoke(IpcChannel.DataExport),
  importJson: () => ipcRenderer.invoke(IpcChannel.DataImport),
  backupData: () => ipcRenderer.invoke(IpcChannel.DataBackup),
  restoreBackup: () => ipcRenderer.invoke(IpcChannel.DataRestore),

  /* ---- 事件 ---- */
  onReminderFired: (cb) => {
    const listener = (_e: IpcRendererEvent, payload: ReminderPayload): void => cb(payload)
    ipcRenderer.on(IpcChannel.ReminderFired, listener)
    return () => ipcRenderer.removeListener(IpcChannel.ReminderFired, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
