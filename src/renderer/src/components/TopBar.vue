<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useSearchStore } from '../stores/search'
import { useUiStore } from '../stores/ui'
import { useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const searchStore = useSearchStore()
const ui = useUiStore()

const keyword = ref('')

const pageTitle = computed<string>(() => {
  const meta = route.meta as { title?: string }
  return meta.title ?? ''
})

/** 提交搜索：跳到搜索页并触发查询 */
function submitSearch(): void {
  if (!keyword.value.trim()) return
  void searchStore.search(keyword.value)
  if (route.name !== 'search') void router.push('/search')
}

function onSearchEnter(): void {
  submitSearch()
}

function onInput(): void {
  if (route.name === 'search') void searchStore.search(keyword.value)
}
</script>

<template>
  <header class="topbar">
    <h1 class="page-title">{{ pageTitle }}</h1>

    <div class="search-box">
      <AppIcon name="search" :size="14" class="search-icon" />
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="搜索日程与待办（标题 / 描述）…"
        @keydown.enter="onSearchEnter"
        @input="onInput"
      />
      <button v-if="keyword" class="clear-btn" @click="keyword = ''; searchStore.reset()">
        <AppIcon name="x" :size="12" />
      </button>
    </div>

    <button class="btn btn-primary" @click="ui.openScheduleDialog()">
      <AppIcon name="plus" :size="14" />
      新建日程
    </button>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.page-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  min-width: 72px;
}

.search-box {
  flex: 1;
  max-width: 480px;
  margin-left: auto;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 30px 7px 30px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.clear-btn {
  position: absolute;
  right: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  padding: 2px;
}

.clear-btn:hover {
  color: var(--text-primary);
}
</style>
