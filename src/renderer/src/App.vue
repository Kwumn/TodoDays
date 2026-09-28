<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'
import ReminderToasts from './components/ReminderToasts.vue'
import ScheduleDialog from './components/ScheduleDialog.vue'
import { useSettingsStore } from './stores/settings'
import { useTagStore } from './stores/tag'
import { useScheduleStore } from './stores/schedule'
import { useTodoStore } from './stores/todo'
import { useUiStore } from './stores/ui'
import { useReminders } from './composables/useReminders'

const settingsStore = useSettingsStore()
const tagStore = useTagStore()
const scheduleStore = useScheduleStore()
const todoStore = useTodoStore()
const ui = useUiStore()

useReminders()

onMounted(() => {
  void settingsStore.load()
  void tagStore.load()
  void scheduleStore.load()
  void todoStore.load()
})
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="main-area">
      <TopBar />
      <router-view v-slot="{ Component }" class="page-area">
        <component :is="Component" />
      </router-view>
    </div>
    <ScheduleDialog v-if="ui.scheduleDialogOpen" />
    <ReminderToasts />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
</style>
