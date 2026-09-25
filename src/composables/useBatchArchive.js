import { computed, ref } from 'vue'

import { restorationBatches } from '../data/restorationData'

const STORAGE_KEY = 'restoration-batch-archive:v1'

/**
 * 批次档案：种子批次（静态 restorationBatches）保持原样不动，
 * 新登记的批次保存在 localStorage，重新进入档案时原样呈现。
 */
const registeredBatches = ref(loadRegisteredBatches())

function loadRegisteredBatches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistRegisteredBatches() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(registeredBatches.value),
    )
  } catch {
    // 存储不可用时仅保留当前会话内的登记结果。
  }
}

export function useBatchArchive() {
  const batches = computed(() => [
    ...registeredBatches.value,
    ...restorationBatches,
  ])
  const registeredCount = computed(() => registeredBatches.value.length)

  function isCodeTaken(code) {
    const normalizedCode = String(code ?? '').trim().toUpperCase()
    return (
      registeredBatches.value.some(
        (item) => item.code.toUpperCase() === normalizedCode,
      ) ||
      restorationBatches.some(
        (item) => item.code.toUpperCase() === normalizedCode,
      )
    )
  }

  /**
   * 登记新批次。draft 已由表单按入库标准校验，此处原样保存原始写法。
   * @returns {{ ok: true } | { ok: false, message: string }}
   */
  function registerBatch(draft) {
    const code = String(draft.code ?? '').trim().toUpperCase()

    if (isCodeTaken(code)) {
      return {
        ok: false,
        message: `批次编号 ${code} 已存在，编号不可与档案中批次重复。`,
      }
    }

    registeredBatches.value = [
      {
        code,
        title: draft.title.trim(),
        totalPages: draft.totalPages,
        pages: draft.pagesRaw,
        normalizedPages: draft.normalizedPages,
        pageCount: draft.pageCount,
        risk: draft.risk,
        status: draft.status,
        note: draft.note.trim(),
        registeredAt: new Date().toISOString(),
      },
      ...registeredBatches.value,
    ]
    persistRegisteredBatches()

    return { ok: true }
  }

  return {
    batches,
    registeredBatches,
    registeredCount,
    registerBatch,
    isCodeTaken,
  }
}
