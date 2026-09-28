import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import TodayView from './views/TodayView.vue'
import CalendarView from './views/CalendarView.vue'
import TodoView from './views/TodoView.vue'
import SearchView from './views/SearchView.vue'
import SettingsView from './views/SettingsView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'today', component: TodayView, meta: { title: '今日', icon: 'sun' } },
  { path: '/calendar', name: 'calendar', component: CalendarView, meta: { title: '日程日历', icon: 'calendar' } },
  { path: '/todos', name: 'todos', component: TodoView, meta: { title: '待办清单', icon: 'check-square' } },
  { path: '/search', name: 'search', component: SearchView, meta: { title: '搜索', icon: 'search' } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '设置', icon: 'settings' } }
]

export function createAppRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes
  })
}
