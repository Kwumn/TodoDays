import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchResult } from '@shared/types'

const EMPTY: SearchResult = { keyword: '', schedules: [], todos: [] }

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const result = ref<SearchResult>(EMPTY)
  const searching = ref(false)

  async function search(kw: string): Promise<void> {
    const trimmed = kw.trim()
    keyword.value = trimmed
    if (!trimmed) {
      result.value = EMPTY
      return
    }
    searching.value = true
    try {
      result.value = await window.api.search(trimmed)
    } finally {
      searching.value = false
    }
  }

  function reset(): void {
    keyword.value = ''
    result.value = EMPTY
  }

  return { keyword, result, searching, search, reset }
})
