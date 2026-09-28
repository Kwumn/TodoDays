/**
 * 设置仓储：单键 JSON 存储
 */
import type { AppSettings, ThemeMode, ViewMode, WeekStart } from '@shared/types'
import { getDb } from './connection'

const SETTINGS_KEY = 'app_settings'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultView: 'month',
  weekStart: 'monday',
  reminderEnabled: true,
  reminderSound: true
}

const THEMES: readonly ThemeMode[] = ['light', 'dark']
const VIEWS: readonly ViewMode[] = ['month', 'week', 'day']
const WEEK_STARTS: readonly WeekStart[] = ['monday', 'sunday']

export function loadSettings(): AppSettings {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(SETTINGS_KEY) as unknown as
    | { value: string }
    | undefined
  if (!row) return { ...DEFAULT_SETTINGS }
  try {
    const parsed: unknown = JSON.parse(row.value)
    const obj = (parsed ?? {}) as Record<string, unknown>
    return {
      theme: THEMES.includes(obj.theme as ThemeMode) ? (obj.theme as ThemeMode) : DEFAULT_SETTINGS.theme,
      defaultView: VIEWS.includes(obj.defaultView as ViewMode)
        ? (obj.defaultView as ViewMode)
        : DEFAULT_SETTINGS.defaultView,
      weekStart: WEEK_STARTS.includes(obj.weekStart as WeekStart)
        ? (obj.weekStart as WeekStart)
        : DEFAULT_SETTINGS.weekStart,
      reminderEnabled: obj.reminderEnabled === true,
      reminderSound: obj.reminderSound === true
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(SETTINGS_KEY, JSON.stringify(settings))
}
