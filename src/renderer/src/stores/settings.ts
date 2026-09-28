import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppSettings } from '@shared/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    theme: 'light',
    defaultView: 'month',
    weekStart: 'monday',
    reminderEnabled: true,
    reminderSound: true
  })
  const loaded = ref(false)

  function applyTheme(): void {
    document.documentElement.dataset['theme'] = settings.value.theme
  }

  async function load(): Promise<void> {
    const s = await window.api.getSettings()
    settings.value = s
    applyTheme()
    loaded.value = true
  }

  async function save(next: Partial<AppSettings>): Promise<void> {
    settings.value = { ...settings.value, ...next }
    applyTheme()
    await window.api.saveSettings(settings.value)
  }

  return { settings, loaded, load, save, applyTheme }
})
