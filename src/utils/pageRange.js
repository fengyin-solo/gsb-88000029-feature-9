const SEGMENT_SPLITTER = /[,，、;；]+/
const RANGE_PATTERN = /^(\d+)\s*[-~–—]\s*(\d+)$/
const SINGLE_PATTERN = /^(\d+)$/

function toHalfWidth(text) {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/－/g, '-')
}

function toPositiveInt(value) {
  const num = Number(value)
  return Number.isInteger(num) && num >= 1 ? num : null
}

function formatSegment(segment) {
  return segment.start === segment.end
    ? `${segment.start}`
    : `${segment.start}-${segment.end}`
}

// 解析并规范化页码范围写法，支持起止页（17-29）、页组（3、5、7）
// 与跳号组合（1-5、8、10-12）。返回逐条判定结果，供入库前校验。
export function normalizePageRange(input, totalPages) {
  const errors = []
  const raw = toHalfWidth(String(input ?? '').trim())
  const limit = toPositiveInt(totalPages)

  if (!raw) {
    return {
      ok: false,
      errors: [
        {
          rule: 'empty',
          segment: '',
          message: '页码范围不能为空，请按起止页、页组或跳号组合填写。',
        },
      ],
      segments: [],
      normalized: '',
    }
  }

  const parts = raw
    .split(SEGMENT_SPLITTER)
    .map((part) => part.trim())
    .filter(Boolean)

  const segments = []

  parts.forEach((part, index) => {
    const label = `第 ${index + 1} 段`
    const rangeMatch = part.match(RANGE_PATTERN)
    const singleMatch = part.match(SINGLE_PATTERN)
    let segment = null

    if (rangeMatch) {
      segment = {
        start: Number(rangeMatch[1]),
        end: Number(rangeMatch[2]),
        raw: part,
      }
    } else if (singleMatch) {
      segment = {
        start: Number(singleMatch[1]),
        end: Number(singleMatch[1]),
        raw: part,
      }
    } else {
      errors.push({
        rule: 'format',
        segment: part,
        message: `${label}「${part}」无法识别，请使用「页码」或「起页-止页」写法。`,
      })
      return
    }

    if (segment.start < 1) {
      errors.push({
        rule: 'start',
        segment: part,
        message: `${label}「${part}」页码需从第 1 页开始。`,
      })
      return
    }

    if (segment.start > segment.end) {
      errors.push({
        rule: 'reversed',
        segment: part,
        message: `${label}「${part}」起止页颠倒，止页不能早于起页。`,
      })
      return
    }

    if (limit && segment.end > limit) {
      errors.push({
        rule: 'overflow',
        segment: part,
        message: `${label}「${part}」超出册页总数（本册共 ${limit} 页）。`,
      })
      return
    }

    segments.push(segment)
  })

  const sorted = [...segments].sort((a, b) => a.start - b.start || a.end - b.end)

  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1]
    const curr = sorted[index]
    if (curr.start <= prev.end) {
      errors.push({
        rule: 'overlap',
        segment: curr.raw,
        message: `「${curr.raw}」与「${prev.raw}」区间交叉，请拆分或合并后再保存。`,
      })
    }
  }

  if (errors.length) {
    return { ok: false, errors, segments: [], normalized: '' }
  }

  const merged = []
  for (const segment of sorted) {
    const last = merged[merged.length - 1]
    if (last && segment.start <= last.end + 1) {
      last.end = Math.max(last.end, segment.end)
    } else {
      merged.push({ start: segment.start, end: segment.end })
    }
  }

  return {
    ok: true,
    errors: [],
    segments: merged,
    normalized: merged.map(formatSegment).join('、'),
  }
}
