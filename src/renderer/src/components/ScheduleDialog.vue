<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Priority, RepeatRule, ScheduleInput } from '@shared/types'
import { PRIORITY_LABELS, REPEAT_LABELS } from '@shared/types'
import { dateOf, todayStr } from '@shared/date'
import { useUiStore } from '../stores/ui'
import { useScheduleStore } from '../stores/schedule'
import { useTagStore } from '../stores/tag'
import AppIcon from './AppIcon.vue'

const ui = useUiStore()
const scheduleStore = useScheduleStore()
const tagStore = useTagStore()

/* ---- 色板 ---- */
const COLOR_PALETTE = [
  '#3b7dd8', '#2e9e5b', '#e8a33d', '#d9453b',
  '#8e5bd6', '#2ab7ca', '#e06a9a', '#6b7f95'
] as const

const REMINDER_OPTIONS = [
  { value: 0, label: '准时提醒' },
  { value: 5, label: '提前 5 分钟' },
  { value: 10, label: '提前 10 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' }
] as const

/** 'YYYY-MM-DD HH:mm' → datetime-local 的 'YYYY-MM-DDTHH:mm' */
function toLocalInput(dt: string): string {
  return dt.replace(' ', 'T')
}

/** datetime-local → 存储格式 */
function fromLocalInput(v: string): string {
  return v.replace('T', ' ').slice(0, 16)
}

const editing = ui.editingInstance
const isEdit = editing !== null
/** 编辑重复日程的实例时，才出现「仅此条 / 整个系列」选择 */
const isRecurringInstance = editing?.isRecurring === true

function defaultStart(): string {
  if (editing) return editing.startTime
  const date = ui.dialogDefaultDate || todayStr()
  const hour = new Date().getHours()
  return `${date} ${String(hour).padStart(2, '0')}:00`
}

const form = reactive({
  title: editing?.title ?? '',
  description: editing?.description ?? '',
  startTime: toLocalInput(defaultStart()),
  endTime: toLocalInput(editing?.endTime ?? `${dateOf(defaultStart())} ${String(new Date().getHours() + 1).padStart(2, '0')}:00`),
  priority: (editing?.priority ?? 'none') as Priority,
  tagId: editing?.tagId ?? '',
  color: editing?.color ?? COLOR_PALETTE[0],
  repeatRule: (editing?.repeatRule ?? 'none') as RepeatRule,
  reminderEnabled: editing?.reminderEnabled ?? false,
  reminderMinutes: editing?.reminderMinutes ?? 10
})

const saving = ref(false)
const error = ref('')

const isRecurringBase = computed(() => form.repeatRule !== 'none')

function buildInput(): ScheduleInput | null {
  const start = fromLocalInput(form.startTime)
  let end = fromLocalInput(form.endTime)
  if (end < start) end = start
  error.value = ''
  if (!form.title.trim()) {
    error.value = '请填写日程标题'
    return null
  }
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    startTime: start,
    endTime: end,
    priority: form.priority,
    tagId: form.tagId === '' ? null : form.tagId,
    color: form.color,
    repeatRule: form.repeatRule,
    repeatUntil: null,
    reminderEnabled: form.reminderEnabled,
    reminderMinutes: form.reminderMinutes
  }
}

async function save(): Promise<void> {
  const input = buildInput()
  if (!input || saving.value || !editing) return
  saving.value = true
  try {
    if (isRecurringInstance) {
      await scheduleStore.updateInstance(editing.id, editing.date, input)
    } else {
      await scheduleStore.update(editing.id, input)
    }
    ui.closeScheduleDialog()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

async function create(): Promise<void> {
  const input = buildInput()
  if (!input || saving.value) return
  saving.value = true
  try {
    await scheduleStore.create(input)
    ui.closeScheduleDialog()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

async function removeSingle(): Promise<void> {
  if (!editing) return
  if (isRecurringInstance) await scheduleStore.removeInstance(editing.id, editing.date)
  else await scheduleStore.remove(editing.id)
  ui.closeScheduleDialog()
}

async function removeSeries(): Promise<void> {
  if (!editing) return
  await scheduleStore.removeSeries(editing.repeatGroupId)
  ui.closeScheduleDialog()
}
</script>

<template>
  <div class="dialog-mask" @click.self="ui.closeScheduleDialog()">
    <div class="dialog card">
      <header class="dialog-header">
        <h2>{{ isEdit ? '编辑日程' : '新建日程' }}</h2>
        <button class="icon-btn" @click="ui.closeScheduleDialog()"><AppIcon name="x" :size="16" /></button>
      </header>

      <div class="dialog-body">
        <div class="field">
          <label>标题 *</label>
          <input v-model="form.title" class="input" placeholder="例如：周会 / 项目评审" @keydown.enter="isEdit ? save() : create()" />
        </div>

        <div class="field">
          <label>描述</label>
          <textarea v-model="form.description" class="textarea" rows="2" placeholder="补充信息（可选）"></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label>开始时间</label>
            <input v-model="form.startTime" type="datetime-local" class="input" />
          </div>
          <div class="field">
            <label>结束时间</label>
            <input v-model="form.endTime" type="datetime-local" class="input" />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>优先级</label>
            <select v-model="form.priority" class="select">
              <option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="field">
            <label>标签</label>
            <select v-model="form.tagId" class="select">
              <option value="">无标签</option>
              <option v-for="tag in tagStore.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>颜色标签</label>
          <div class="palette">
            <button
              v-for="c in COLOR_PALETTE"
              :key="c"
              class="color-dot"
              :class="{ selected: form.color === c }"
              :style="{ background: c }"
              type="button"
              @click="form.color = c"
            ></button>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label><AppIcon name="repeat" :size="12" /> 重复规则</label>
            <select v-model="form.repeatRule" class="select">
              <option v-for="(label, key) in REPEAT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="field">
            <label><AppIcon name="bell" :size="12" /> 提醒</label>
            <div class="reminder-row">
              <label class="switch">
                <input v-model="form.reminderEnabled" type="checkbox" class="checkbox" />
                <span>{{ form.reminderEnabled ? '开' : '关' }}</span>
              </label>
              <select v-model="form.reminderMinutes" class="select" :disabled="!form.reminderEnabled">
                <option v-for="opt in REMINDER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="isRecurringBase && !isEdit" class="hint">
          <AppIcon name="alert-circle" :size="12" />
          重复日程将在 {{ REPEAT_LABELS[form.repeatRule] }} 的该时间自动出现
        </div>
        <div v-if="error" class="error-line">{{ error }}</div>
      </div>

      <footer class="dialog-footer">
        <div class="footer-left">
          <template v-if="isEdit">
            <button class="btn btn-danger" @click="removeSingle()">
              {{ isRecurringInstance ? '删除此条' : '删除日程' }}
            </button>
            <button v-if="isRecurringInstance" class="btn btn-danger" @click="removeSeries()">删除整个重复序列</button>
          </template>
        </div>
        <div class="footer-right">
          <button class="btn" @click="ui.closeScheduleDialog()">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="isEdit ? save() : create()">
            {{ isEdit ? (isRecurringInstance ? '保存到此条' : '保存') : '创建日程' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  width: 520px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-pop);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h2 {
  margin: 0;
  font-size: 15px;
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: 4px;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dialog-body {
  padding: 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.field label {
  font-size: 12px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.field-row {
  display: flex;
  gap: 12px;
}

.palette {
  display: flex;
  gap: 8px;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.1s ease;
  padding: 0;
}

.color-dot:hover {
  transform: scale(1.12);
}

.color-dot.selected {
  border-color: var(--text-primary);
}

.reminder-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 7px 10px;
  border-radius: var(--radius-sm);
}

.error-line {
  color: var(--danger);
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.footer-left,
.footer-right {
  display: flex;
  gap: 8px;
}
</style>
