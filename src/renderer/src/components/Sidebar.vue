<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useTodoStore } from '../stores/todo'
import { useUiStore } from '../stores/ui'
import { todayStr, friendlyDate } from '@shared/date'

interface NavItem {
  name: string
  path: string
  title: string
  icon: string
}

const route = useRoute()
const todoStore = useTodoStore()
const ui = useUiStore()

const navItems: NavItem[] = [
  { name: 'today', path: '/', title: '今日', icon: 'sun' },
  { name: 'calendar', path: '/calendar', title: '日程日历', icon: 'calendar' },
  { name: 'todos', path: '/todos', title: '待办清单', icon: 'check-square' },
  { name: 'search', path: '/search', title: '搜索', icon: 'search' },
  { name: 'settings', path: '/settings', title: '设置', icon: 'sliders' }
]

const pendingCount = computed(() => todoStore.stats.pending)
const todayLabel = computed(() => friendlyDate(todayStr()))
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">TD</div>
      <div class="brand-text">
        <div class="brand-name">TodoDays</div>
        <div class="brand-sub">{{ todayLabel }}</div>
      </div>
    </div>

    <nav class="nav">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.name === item.name }"
      >
        <AppIcon :name="item.icon" :size="16" />
        <span>{{ item.title }}</span>
        <span v-if="item.name === 'todos' && pendingCount > 0" class="badge">{{ pendingCount }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button class="btn btn-primary quick-add" @click="ui.openScheduleDialog()">
        <AppIcon name="plus" :size="14" />
        新建日程
      </button>
      <div class="version">本地数据 · v1.0.0</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--text-inverse);
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.5px;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.brand-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  transition: background 0.12s ease, color 0.12s ease;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.badge {
  margin-left: auto;
  background: var(--accent);
  color: var(--text-inverse);
  border-radius: 999px;
  font-size: 10.5px;
  line-height: 17px;
  padding: 0 7px;
  font-weight: 600;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
}

.quick-add {
  width: 100%;
  justify-content: center;
}

.version {
  text-align: center;
  color: var(--text-muted);
  font-size: 10.5px;
  margin-top: 10px;
}
</style>
