/**
 * 页码范围登记工具：解析、入库校验与规范化。
 *
 * 支持的原始写法：
 * - 单页：5
 * - 起止页：17-29
 * - 页组 / 跳号组合：1-3,5,8-10
 * 分隔符兼容半角逗号、全角逗号、顿号、分号与空白；
 * 连字符兼容 - – — ~ ～ 以及“至 / 到”。
 */

const SEGMENT_SPLITTERS = /[,，、;；]+/
const SEGMENT_PATTERN = /^(\d+)(?:-(\d+))?$/

/** 统一全角数字、连字符与空白，得到便于切分的文本。 */
function preprocess(raw) {
  return String(raw ?? '')
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[–—－~～]|至|到/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ',')
    .trim()
}

function tokenize(raw) {
  const text = preprocess(raw)
  if (!text) {
    return []
  }
  return text
    .split(SEGMENT_SPLITTERS)
    .map((token) => token.trim())
    .filter(Boolean)
}

function formatSpan(start, end) {
  return start === end ? String(start) : `${start}-${end}`
}

/**
 * 严格按入库标准解析页码范围。
 * @param {string} raw 原始写法
 * @param {number} [totalPages] 本册总页数，传入时校验越界
 * @returns {{ ok: boolean, errors: Array<{code:string, token?:string, message:string}>,
 *   segments: Array<{token:string, start:number, end:number}>,
 *   normalized: string, pageCount: number }}
 */
export function resolvePageRanges(raw, totalPages) {
  const tokens = tokenize(raw)

  if (tokens.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: 'empty',
          message:
            '页码范围不能为空。可登记单页（如 5）、起止页（如 17-29）或页组跳号（如 1-3,5,8-10）。',
        },
      ],
      segments: [],
      normalized: '',
      pageCount: 0,
    }
  }

  const errors = []
  const segments = []

  tokens.forEach((token) => {
    const match = token.match(SEGMENT_PATTERN)
    if (!match) {
      errors.push({
        code: 'format',
        token,
        message: `「${token}」不是合规的页码写法：单页写作“5”，起止页写作“17-29”，多组之间用逗号分隔。`,
      })
      return
    }

    const start = Number(match[1])
    const end = match[2] === undefined ? start : Number(match[2])

    if (start < 1) {
      errors.push({
        code: 'non-positive',
        token,
        message: `「${token}」含无效页码，页码须从第 1 页起编。`,
      })
      return
    }

    if (end < start) {
      errors.push({
        code: 'reversed',
        token,
        message: `「${token}」起止页颠倒（${start} 在 ${end} 之后），违反页序从小到大的入库标准，请改为 ${end}-${start}。`,
      })
      return
    }

    if (
      Number.isFinite(totalPages) &&
      totalPages >= 1 &&
      (start > totalPages || end > totalPages)
    ) {
      errors.push({
        code: 'out-of-range',
        token,
        message: `「${token}」超出本册总页数 ${totalPages}，最大可登记页码为 ${totalPages}，请核对后重新登记。`,
      })
    }

    segments.push({ token, start, end })
  })

  // 区间交叉 / 重复登记：结构合法的段两两比对，逐条列出冲突。
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const first = segments[i]
      const second = segments[j]
      const overlapStart = Math.max(first.start, second.start)
      const overlapEnd = Math.min(first.end, second.end)

      if (overlapStart <= overlapEnd) {
        const overlapText = formatSpan(overlapStart, overlapEnd)
        const message =
          first.token === second.token
            ? `「${first.token}」重复登记，第 ${overlapText} 页在同一批次中出现多次。`
            : `「${first.token}」与「${second.token}」区间交叉，第 ${overlapText} 页被重复登记，请拆清页组后再保存。`
        errors.push({
          code: 'crossing',
          token: `${first.token}|${second.token}`,
          message,
        })
      }
    }
  }

  const ordered = [...segments].sort((a, b) => a.start - b.start || a.end - b.end)
  const normalized = ordered
    .map(({ start, end }) => formatSpan(start, end))
    .join(',')
  const pageCount = ordered.reduce(
    (sum, { start, end }) => sum + (end - start + 1),
    0,
  )

  return {
    ok: errors.length === 0,
    errors,
    segments,
    normalized,
    pageCount,
  }
}

/**
 * 宽松规范化，用于既有单段页码的展示；不做越界判断。
 * 返回原始字符串无法解析时的兜底结果。
 */
export function normalizePageRanges(raw) {
  const result = resolvePageRanges(raw)
  if (result.ok) {
    return { normalized: result.normalized, pageCount: result.pageCount }
  }
  return { normalized: String(raw ?? ''), pageCount: null }
}
