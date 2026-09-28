import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReminderPayload, ScheduleInstance } from '@shared/types'

/** 全局 UI 状态：日程弹窗、提醒 toast */
export const useUiStore = defineStore('ui', () => {
  /* ---- 日程编辑弹窗 ---- */
  const scheduleDialogOpen = ref(false)
  /** 编辑对象：null 表示新建 */
  const editingInstance = ref<ScheduleInstance | null>(null)
  /** 新建时的默认日期 'YYYY-MM-DD' */
  const dialogDefaultDate = ref('')

  function openScheduleDialog(options?: { instance?: ScheduleInstance | null; date?: string }): void {
    editingInstance.value = options?.instance ?? null
    dialogDefaultDate.value = options?.date ?? ''
    scheduleDialogOpen.value = true
  }

  function closeScheduleDialog(): void {
    scheduleDialogOpen.value = false
    editingInstance.value = null
    dialogDefaultDate.value = ''
  }

  /* ---- 提醒 toast ---- */
  interface ToastItem extends ReminderPayload {
    toastId: string
  }
  const toasts = ref<ToastItem[]>([])

  function pushReminderToast(payload: ReminderPayload): void {
    const toastId = `${payload.scheduleId}#${payload.date}#${Date.now()}`
    toasts.value = [...toasts.value.slice(-3), { ...payload, toastId }]
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.toastId !== toastId)
    }, 12_000)
  }

  function dismissToast(toastId: string): void {
    toasts.value = toasts.value.filter((t) => t.toastId !== toastId)
  }

  return {
    scheduleDialogOpen,
    editingInstance,
    dialogDefaultDate,
    openScheduleDialog,
    closeScheduleDialog,
    toasts,
    pushReminderToast,
    dismissToast
  }
})
