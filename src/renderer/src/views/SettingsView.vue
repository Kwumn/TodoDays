<script setup lang="ts">
import { ref } from 'vue'
import type { ThemeMode, ViewMode, WeekStart } from '@shared/types'
import { useSettingsStore } from '../stores/settings'
import { useTagStore } from '../stores/tag'
import { useTodoStore } from '../stores/todo'
import AppIcon from '../components/AppIcon.vue'

const settingsStore = useSettingsStore()
const tagStore = useTagStore()
const todoStore = useTodoStore()

const message = ref('')
const messageType = ref<'success' | 'error'>('success')

function notify(text: string, type: 'success' | 'error' = 'success'): void {
  message.value = text
  messageType.value = type
  setTimeout(() => (message.value = ''), 4000)
}

/* ---- 标签管理 ---- */
const newTagName = ref('')
const newTagColor = ref('#3b7dd8')

async function addTag(): Promise<void> {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    await tagStore.create({ name, color: newTagColor.value })
    newTagName.value = ''
    notify(`已创建标签「${name}」`)
  } catch (e) {
    notify(e instanceof Error ? e.message : '创建标签失败', 'error')
  }
}

async function removeTag(id: string, name: string): Promise<void> {
  await tagStore.remove(id)
  notify(`已删除标签「${name}」，相关日程与待办已解除关联`)
}

/* ---- 数据管理 ---- */
async function exportJson(): Promise<void> {
  try {
    const path = await window.api.exportJson()
    if (path) notify(`已导出到：${path}`)
  } catch (e) {
    notify(e instanceof Error ? e.message : '导出失败', 'error')
  }
}

async function importJson(): Promise<void> {
  try {
    const result = await window.api.importJson()
    if (result) {
      notify(`导入完成：日程 ${result.schedules} 条、待办 ${result.todos} 条、标签 ${result.tags} 个`)
      await Promise.all([tagStore.load(), todoStore.load()])
    }
  } catch (e) {
    notify(e instanceof Error ? e.message : '导入失败', 'error')
  }
}

async function backupData(): Promise<void> {
  try {
    const path = await window.api.backupData()
    if (path) notify(`备份已保存到：${path}`)
  } catch (e) {
    notify(e instanceof Error ? e.message : '备份失败', 'error')
  }
}

async function restoreBackup(): Promise<void> {
  try {
    await window.api.restoreBackup()
  } catch (e) {
    notify(e instanceof Error ? e.message : '恢复失败', 'error')
  }
}

async function clearCompleted(): Promise<void> {
  const n = await todoStore.clearCompleted()
  notify(n > 0 ? `已清除 ${n} 条已完成待办` : '没有可清除的已完成待办')
}
</script>

<template>
  <div class="settings-view">
    <div class="msg-area">
      <div v-if="message" class="msg" :class="messageType">{{ message }}</div>
    </div>

    <!-- 外观 -->
    <section class="card setting-card">
      <h3><AppIcon name="sliders" :size="14" /> 外观</h3>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-name">主题</div>
          <div class="setting-desc">浅色为默认主题，深色主题持续优化中</div>
        </div>
        <div class="segmented">
          <button
            :class="{ active: settingsStore.settings.theme === 'light' }"
            @click="settingsStore.save({ theme: 'light' as ThemeMode })"
          >浅色</button>
          <button
            :class="{ active: settingsStore.settings.theme === 'dark' }"
            @click="settingsStore.save({ theme: 'dark' as ThemeMode })"
          >深色</button>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-name">日历默认视图</div>
          <div class="setting-desc">进入「日程日历」时展示的视图</div>
        </div>
        <div class="segmented">
          <button
            v-for="v in (['month', 'week', 'day'] as const)"
            :key="v"
            :class="{ active: settingsStore.settings.defaultView === v }"
            @click="settingsStore.save({ defaultView: v as ViewMode })"
          >{{ v === 'month' ? '月' : v === 'week' ? '周' : '日' }}</button>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-name">日历起始星期</div>
          <div class="setting-desc">月视图与周视图的第一列</div>
        </div>
        <div class="segmented">
          <button
            :class="{ active: settingsStore.settings.weekStart === 'monday' }"
            @click="settingsStore.save({ weekStart: 'monday' as WeekStart })"
          >周一</button>
          <button
            :class="{ active: settingsStore.settings.weekStart === 'sunday' }"
            @click="settingsStore.save({ weekStart: 'sunday' as WeekStart })"
          >周日</button>
        </div>
      </div>
    </section>

    <!-- 提醒 -->
    <section class="card setting-card">
      <h3><AppIcon name="bell" :size="14" /> 提醒</h3>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-name">桌面提醒</div>
          <div class="setting-desc">到时间弹出系统通知（每个日程可单独设置提前量）</div>
        </div>
        <label class="switch-line">
          <input
            type="checkbox"
            class="checkbox"
            :checked="settingsStore.settings.reminderEnabled"
            @change="settingsStore.save({ reminderEnabled: !settingsStore.settings.reminderEnabled })"
          />
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-name">提醒提示音</div>
          <div class="setting-desc">弹出提醒时播放提示音</div>
        </div>
        <label class="switch-line">
          <input
            type="checkbox"
            class="checkbox"
            :checked="settingsStore.settings.reminderSound"
            @change="settingsStore.save({ reminderSound: !settingsStore.settings.reminderSound })"
          />
        </label>
      </div>
    </section>

    <!-- 标签管理 -->
    <section class="card setting-card">
      <h3><AppIcon name="tag" :size="14" /> 标签管理</h3>
      <div class="tag-add-row">
        <input v-model="newTagName" class="input" placeholder="新标签名称，回车创建…" @keydown.enter="addTag" />
        <input v-model="newTagColor" type="color" class="color-input" />
        <button class="btn btn-primary" @click="addTag"><AppIcon name="plus" :size="13" /> 创建</button>
      </div>
      <div class="tag-list">
        <div v-for="tag in tagStore.tags" :key="tag.id" class="tag-row">
          <span class="dot" :style="{ background: tag.color }"></span>
          <span class="tag-name">{{ tag.name }}</span>
          <button class="btn btn-ghost tag-del" @click="removeTag(tag.id, tag.name)">
            <AppIcon name="trash" :size="13" />
          </button>
        </div>
        <div v-if="tagStore.tags.length === 0" class="tag-empty">还没有标签，创建一个用于分类日程与待办</div>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="card setting-card">
      <h3><AppIcon name="database" :size="14" /> 数据管理</h3>
      <div class="setting-desc data-desc">所有数据保存在本机 SQLite 数据库中，不上传云端</div>
      <div class="data-actions">
        <button class="btn" @click="exportJson"><AppIcon name="download" :size="13" /> 导出 JSON</button>
        <button class="btn" @click="importJson"><AppIcon name="upload" :size="13" /> 导入 JSON</button>
        <button class="btn" @click="backupData"><AppIcon name="database" :size="13" /> 一键备份</button>
        <button class="btn" @click="restoreBackup"><AppIcon name="folder" :size="13" /> 恢复备份</button>
      </div>
      <div class="setting-row danger-row">
        <div class="setting-info">
          <div class="setting-name">清除已完成待办</div>
          <div class="setting-desc">删除全部已完成的待办（当前 {{ todoStore.stats.completed }} 条），不可恢复</div>
        </div>
        <button class="btn btn-danger" @click="clearCompleted">清除</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 760px;
}

.msg-area {
  min-height: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.msg {
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  margin-bottom: 8px;
  border: 1px solid;
}

.msg.success {
  background: var(--success-soft);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.msg.error {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}

.setting-card {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-card h3 {
  margin: 0 0 8px;
  font-size: 13.5px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-primary);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
}

.setting-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.switch-line {
  display: flex;
  cursor: pointer;
}

.tag-add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.tag-add-row .input {
  flex: 1;
}

.color-input {
  width: 42px;
  height: 34px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  padding: 2px;
  cursor: pointer;
}

.tag-list {
  display: flex;
  flex-direction: column;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
}

.tag-row:last-child {
  border-bottom: none;
}

.tag-row .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.tag-name {
  font-size: 13px;
  color: var(--text-primary);
}

.tag-del {
  margin-left: auto;
  color: var(--text-muted);
}

.tag-del:hover {
  color: var(--danger);
}

.tag-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 10px 0;
}

.data-desc {
  margin-bottom: 10px;
}

.data-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.danger-row .btn-danger {
  flex-shrink: 0;
}
</style>
