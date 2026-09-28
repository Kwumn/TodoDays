import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'

/**
 * 提醒事件监听：接收主进程 reminder:fired → toast 通知 + 可选提示音
 */
export function useReminders(): void {
  const ui = useUiStore()
  const settings = useSettingsStore()
  let off: (() => void) | null = null

  /** WebAudio 合成提示音（两声清脆「叮咚」，无需音频文件） */
  function playChime(): void {
    try {
      const ctx = new AudioContext()
      const notes = [880, 1174.66] // A5 → D6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const start = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.55)
      })
    } catch {
      /* 音频不可用时静默 */
    }
  }

  onMounted(() => {
    off = window.api.onReminderFired((payload) => {
      ui.pushReminderToast(payload)
      if (settings.settings.reminderSound) playChime()
    })
  })

  onUnmounted(() => {
    off?.()
  })
}
