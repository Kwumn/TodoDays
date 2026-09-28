import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  DateRange,
  Schedule,
  ScheduleFilters,
  ScheduleInput,
  ScheduleInstance
} from '@shared/types'
import { expandAll } from '@shared/repeat'
import { useTagStore } from './tag'

export const useScheduleStore = defineStore('schedules', () => {
  const schedules = ref<Schedule[]>([])
  const loaded = ref(false)

  const filters = ref<ScheduleFilters>({ tagId: 'all', priority: 'all', status: 'all' })

  async function load(): Promise<void> {
    schedules.value = await window.api.listAllSchedules()
    loaded.value = true
  }

  /** 展开指定范围内的日程实例（应用筛选条件） */
  const instancesInRange = computed(() => {
    return (range: DateRange): ScheduleInstance[] => {
      let filtered = schedules.value
      const f = filters.value
      if (f.priority !== 'all') filtered = filtered.filter((s) => s.priority === f.priority)
      if (f.status !== 'all') {
        filtered = filtered.filter((s) => {
          const dates = s.completedDates
          const hasCompleted = dates.length > 0
          if (s.repeatRule === 'none') {
            return f.status === 'completed' ? hasCompleted : !hasCompleted
          }
          return f.status === 'completed' ? hasCompleted : dates.length === 0
        })
      }
      if (f.tagId !== 'all') {
        filtered = filtered.filter((s) => (f.tagId === 'none' ? s.tagId === null : s.tagId === f.tagId))
      }
      return expandAll(filtered, range)
    }
  })

  async function create(input: ScheduleInput): Promise<void> {
    await window.api.createSchedule(input)
    await load()
  }

  async function update(id: string, input: ScheduleInput): Promise<void> {
    await window.api.updateSchedule(id, input)
    await load()
  }

  async function updateInstance(id: string, date: string, input: ScheduleInput): Promise<void> {
    await window.api.updateScheduleInstance(id, date, input)
    await load()
  }

  async function remove(id: string): Promise<void> {
    await window.api.deleteSchedule(id)
    await load()
  }

  async function removeInstance(id: string, date: string): Promise<void> {
    await window.api.deleteScheduleInstance(id, date)
    await load()
  }

  async function removeSeries(groupId: string): Promise<void> {
    await window.api.deleteScheduleSeries(groupId)
    await load()
  }

  async function toggleComplete(inst: ScheduleInstance): Promise<void> {
    await window.api.setScheduleCompleted({ id: inst.id, date: inst.date, completed: !inst.completed })
    await load()
  }

  return {
    schedules,
    loaded,
    filters,
    instancesInRange,
    load,
    create,
    update,
    updateInstance,
    remove,
    removeInstance,
    removeSeries,
    toggleComplete
  }
})

// 防止 tag store 未使用告警（保持模块独立性，由视图按需取用）
void useTagStore
