/**
 * 提醒服务：定时扫描即将开始的日程 → 系统通知 + 推送渲染进程
 * 已提醒记录持久化到 reminder_log 表，重启后不重复打扰。
 */
import { Notification, type BrowserWindow } from 'electron'
import type { AppSettings, ReminderPayload, Schedule } from '@shared/types'
import { expandAll } from '@shared/repeat'
import { addDays, todayStr, toTimestamp } from '@shared/date'
import { getDb } from '../db/connection'
import { listAllSchedules } from '../db/scheduleRepo'

const POLL_INTERVAL_MS = 20_000
/** 迟到补发窗口：错过提醒（如应用刚启动）最多补发 30 分钟内的 */
const LATE_WINDOW_MS = 30 * 60_000
/** 提醒日志保留时长 */
const LOG_RETENTION_MS = 7 * 24 * 3600_000

let timer: NodeJS.Timeout | null = null

export function startReminderLoop(getWindow: () => BrowserWindow | null, getSettings: () => AppSettings): void {
  if (timer) return
  const tick = (): void => void scanAndNotify(getWindow, getSettings).catch(() => undefined)
  tick()
  timer = setInterval(tick, POLL_INTERVAL_MS)
}

export function stopReminderLoop(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function isLogged(key: string): boolean {
  const row = getDb().prepare('SELECT 1 AS ok FROM reminder_log WHERE key = ?').get(key) as unknown as
    | { ok: number }
    | undefined
  return row !== undefined
}

function logReminder(key: string): void {
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO reminder_log (key, fired_at) VALUES (?, ?)').run(key, Date.now())
  db.prepare('DELETE FROM reminder_log WHERE fired_at < ?').run(Date.now() - LOG_RETENTION_MS)
}

async function scanAndNotify(getWindow: () => BrowserWindow | null, getSettings: () => AppSettings): Promise<void> {
  const settings = getSettings()
  if (!settings.reminderEnabled) return

  const now = Date.now()
  const range = { start: todayStr(), end: addDays(todayStr(), 2) }
  const schedules: Schedule[] = listAllSchedules().filter((s) => s.reminderEnabled)
  const instances = expandAll(schedules, range)

  for (const inst of instances) {
    const startMs = toTimestamp(inst.startTime)
    const fireAt = startMs - inst.reminderMinutes * 60_000
    if (now < fireAt || now - fireAt > LATE_WINDOW_MS) continue
    const key = `${inst.id}#${inst.date}`
    if (isLogged(key)) continue
    logReminder(key)

    const payload: ReminderPayload = {
      scheduleId: inst.id,
      date: inst.date,
      title: inst.title,
      startTime: inst.startTime,
      minutesBefore: inst.reminderMinutes
    }

    const when = inst.reminderMinutes > 0 ? `${inst.reminderMinutes} 分钟后开始` : '现在开始'
    const notification = new Notification({
      title: '日程提醒',
      body: `${inst.title}\n${inst.startTime.slice(11)} ${when}`,
      silent: true // 声音由渲染进程按设置播放
    })
    notification.on('click', () => {
      const win = getWindow()
      if (win) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
    })
    notification.show()

    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('reminder:fired', payload)
    }
  }
}
