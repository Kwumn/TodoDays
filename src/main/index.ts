/**
 * Electron 主进程入口
 */
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { openDatabase, closeDatabase } from './db/connection'
import { registerIpcHandlers } from './ipc/register'
import { loadSettings } from './db/settingsRepo'
import { startReminderLoop, stopReminderLoop } from './services/reminder'
import type { AppSettings } from '@shared/types'

// 统一数据目录（开发模式与打包模式一致）：%APPDATA%/todo-days
app.setPath('userData', join(app.getPath('appData'), 'todo-days'))
app.setAppUserModelId('com.todo-days.app')

// 兼容部分显卡/受限环境 GPU 进程崩溃：默认软件渲染，设置 TODO_DAYS_ENABLE_GPU=1 可恢复硬件加速
if (process.env['TODO_DAYS_ENABLE_GPU'] !== '1') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
}

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'TodoDays 日程与待办',
    backgroundColor: '#f4f6f9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

let cachedSettings: AppSettings | null = null

function getSettingsSnapshot(): AppSettings {
  try {
    cachedSettings = loadSettings()
  } catch {
    cachedSettings = cachedSettings ?? {
      theme: 'light',
      defaultView: 'month',
      weekStart: 'monday',
      reminderEnabled: true,
      reminderSound: true
    }
  }
  return cachedSettings
}

app.whenReady().then(() => {
  openDatabase()
  registerIpcHandlers(getMainWindow)
  createMainWindow()
  startReminderLoop(getMainWindow, getSettingsSnapshot)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopReminderLoop()
})

app.on('will-quit', () => {
  try {
    closeDatabase()
  } catch {
    /* 忽略关闭异常 */
  }
})
