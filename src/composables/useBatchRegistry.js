import { computed, ref } from 'vue'

import { restorationBatches } from '../data/restorationData'
import { normalizePageRange } from '../utils/pageRange'

const STORAGE_KEY = 'solo-8800002:registered-batches'

function loadStoredBatches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 模块级单例：种子批次保持只读，新登记批次追加在末尾并写入 localStorage，
// 从档案页再次进入或刷新后仍按登记时的范围与任务说明展现。
const registeredBatches = ref(loadStoredBatches())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registeredBatches.value))
  } catch {
    // 存储不可用时仅保留本次会话内数据
  }
}

export function useBatchRegistry() {
  const batches = computed(() => [...restorationBatches, ...registeredBatches.value])

  function isCodeTaken(code) {
    return batches.value.some((batch) => batch.code === code)
  }

  function registerBatch(draft) {
    const result = normalizePageRange(draft.pages, draft.totalPages)
    if (!result.ok) {
      return { ok: false, errors: result.errors }
    }

    const batch = {
      code: draft.code,
      title: draft.title,
      pages: String(draft.pages).trim(),
      pagesNormalized: result.normalized,
      totalPages: Number(draft.totalPages),
      risk: draft.risk,
      status: draft.status,
      note: draft.note || '暂无任务说明',
    }

    registeredBatches.value = [...registeredBatches.value, batch]
    persist()
    return { ok: true, batch }
  }

  return {
    batches,
    isCodeTaken,
    registerBatch,
  }
}
