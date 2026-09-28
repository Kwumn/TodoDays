import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Tag, TagInput } from '@shared/types'

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  const tagNameMap = computed<Map<string, Tag>>(() => new Map(tags.value.map((t) => [t.id, t])))

  async function load(): Promise<void> {
    tags.value = await window.api.listTags()
  }

  async function create(input: TagInput): Promise<Tag> {
    const tag = await window.api.createTag(input)
    tags.value = [...tags.value, tag].sort((a, b) => a.createdAt - b.createdAt)
    return tag
  }

  async function update(id: string, input: TagInput): Promise<void> {
    await window.api.updateTag(id, input)
    await load()
  }

  async function remove(id: string): Promise<void> {
    await window.api.deleteTag(id)
    tags.value = tags.value.filter((t) => t.id !== id)
  }

  function tagOf(id: string | null): Tag | undefined {
    if (id === null) return undefined
    return tagNameMap.value.get(id)
  }

  return { tags, tagNameMap, load, create, update, remove, tagOf }
})
