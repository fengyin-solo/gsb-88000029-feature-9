<script setup>
import { computed, reactive, ref } from 'vue'

import { useBatchArchive } from '../../composables/useBatchArchive'
import { resolvePageRanges } from '../../utils/pageRanges'

const emit = defineEmits({
  register: (draft) => typeof draft === 'object',
})

const { isCodeTaken } = useBatchArchive()

const RISK_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]
const STATUS_OPTIONS = ['补纸前', '控湿中', '修复中', '归档前', '已归档']

const emptyForm = () => ({
  code: '',
  title: '',
  totalPages: '',
  pagesRaw: '',
  risk: 'medium',
  status: '补纸前',
  note: '',
})

const form = reactive(emptyForm())
const fieldErrors = reactive({})
const pageErrors = ref([])
const successCode = ref('')

const totalPagesNumber = computed(() => {
  const value = Number(form.totalPages)
  return Number.isInteger(value) && value >= 1 ? value : null
})

const liveRange = computed(() => {
  if (!form.pagesRaw.trim() || !totalPagesNumber.value) {
    return null
  }
  return resolvePageRanges(form.pagesRaw, totalPagesNumber.value)
})

function validate() {
  const errors = {}

  if (!form.code.trim()) {
    errors.code = '请填写批次编号，如 D-07。'
  } else if (!/^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(form.code.trim())) {
    errors.code = '批次编号格式为“字母/数字-序号”，如 D-07。'
  } else if (isCodeTaken(form.code)) {
    errors.code = `批次编号 ${form.code.trim().toUpperCase()} 已存在，不可与档案中批次重复。`
  }

  if (!form.title.trim()) {
    errors.title = '请填写修复对象名称。'
  }

  if (form.totalPages === '' || form.totalPages === null) {
    errors.totalPages = '请填写本册总页数，页码越界判定以此为准。'
  } else if (!totalPagesNumber.value) {
    errors.totalPages = '总页数须为不小于 1 的整数。'
  }

  if (!form.note.trim()) {
    errors.note = '请填写任务说明，保存后随批次一并归档。'
  }

  let rangeResult = null
  if (totalPagesNumber.value) {
    rangeResult = resolvePageRanges(form.pagesRaw, totalPagesNumber.value)
    if (!rangeResult.ok) {
      errors.pagesRaw = '页码范围未通过入库标准。'
    }
  } else if (!form.pagesRaw.trim()) {
    errors.pagesRaw = '请登记页码范围。'
  } else {
    errors.pagesRaw = '请先将册页总数填为有效整数，再校验页码范围。'
  }

  return { errors, rangeResult }
}

function handleSubmit() {
  successCode.value = ''

  const { errors, rangeResult } = validate()

  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  Object.assign(fieldErrors, errors)
  pageErrors.value = rangeResult ? rangeResult.errors : []

  if (Object.keys(errors).length > 0 || !rangeResult || !rangeResult.ok) {
    return
  }

  const draft = {
    code: form.code,
    title: form.title,
    totalPages: totalPagesNumber.value,
    pagesRaw: form.pagesRaw.trim(),
    normalizedPages: rangeResult.normalized,
    pageCount: rangeResult.pageCount,
    risk: form.risk,
    status: form.status,
    note: form.note,
  }

  emit('register', draft)

  successCode.value = draft.code.trim().toUpperCase()
  Object.assign(form, emptyForm())
  pageErrors.value = []
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
}
</script>

<template>
  <form class="register-form" novalidate @submit.prevent="handleSubmit">
    <div class="form-grid">
      <label class="field">
        <span>批次编号</span>
        <input v-model="form.code" type="text" placeholder="如 D-07" />
        <small v-if="fieldErrors.code" class="field-error">
          {{ fieldErrors.code }}
        </small>
      </label>

      <label class="field">
        <span>修复对象</span>
        <input v-model="form.title" type="text" placeholder="如 地方志散册" />
        <small v-if="fieldErrors.title" class="field-error">
          {{ fieldErrors.title }}
        </small>
      </label>

      <label class="field">
        <span>册页总数</span>
        <input
          v-model="form.totalPages"
          type="number"
          min="1"
          step="1"
          placeholder="如 60"
        />
        <small v-if="fieldErrors.totalPages" class="field-error">
          {{ fieldErrors.totalPages }}
        </small>
      </label>

      <label class="field">
        <span>风险等级</span>
        <select v-model="form.risk">
          <option v-for="option in RISK_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>当前阶段</span>
        <select v-model="form.status">
          <option v-for="option in STATUS_OPTIONS" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>

      <label class="field field--wide">
        <span>页码范围（原始写法）</span>
        <input
          v-model="form.pagesRaw"
          type="text"
          placeholder="支持起止页与跳号组合，如 3-5,8、12 或 １－３；８"
        />
        <small v-if="fieldErrors.pagesRaw" class="field-error">
          {{ fieldErrors.pagesRaw }}
        </small>
        <small v-else-if="liveRange && liveRange.ok" class="field-hint field-hint--ok">
          规范化预览：{{ liveRange.normalized }}，共 {{ liveRange.pageCount }} 页
        </small>
        <small v-else-if="liveRange" class="field-hint">
          输入有效数字后可预览规范化结果。
        </small>
      </label>

      <label class="field field--wide">
        <span>任务说明</span>
        <textarea
          v-model="form.note"
          rows="2"
          placeholder="如 虫道贯穿书口，先固色再补纸。"
        />
        <small v-if="fieldErrors.note" class="field-error">
          {{ fieldErrors.note }}
        </small>
      </label>
    </div>

    <ul v-if="pageErrors.length" class="error-list">
      <li v-for="(error, index) in pageErrors" :key="`${error.code}-${index}`">
        <span class="error-code">
          {{
            {
              empty: '空值',
              format: '格式不符',
              'non-positive': '页码无效',
              reversed: '页序颠倒',
              'out-of-range': '超出册页总数',
              crossing: '区间交叉',
            }[error.code] ?? '未通过校验'
          }}
        </span>
        <span>{{ error.message }}</span>
      </li>
    </ul>

    <p v-if="successCode" class="save-success">
      批次 {{ successCode }} 已按入库标准登记并归档，修正后可继续登记下一批次。
    </p>

    <div class="form-actions">
      <button class="submit-button" type="submit">校验并登记</button>
      <span class="form-rule">
        颠倒页序、区间交叉或超出册页总数时不予保存，可在原输入上修正后重试。
      </span>
    </div>
  </form>
</template>

<style scoped>
.register-form {
  display: grid;
  gap: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 0.86rem;
  color: #6a5439;
}

.field--wide {
  grid-column: 1 / -1;
}

input,
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(109, 80, 40, 0.22);
  background: rgba(255, 253, 248, 0.95);
  color: #4a3823;
  font: inherit;
  box-sizing: border-box;
}

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid rgba(139, 99, 20, 0.32);
  outline-offset: 1px;
}

textarea {
  resize: vertical;
}

.field-error {
  color: #913d2f;
}

.field-hint {
  color: #7a6546;
}

.field-hint--ok {
  color: #366338;
}

.error-list {
  margin: 0;
  padding: 12px 14px 12px 30px;
  border-radius: 14px;
  background: #f7e3de;
  border: 1px solid rgba(145, 61, 47, 0.25);
  color: #7c3527;
  font-size: 0.86rem;
  display: grid;
  gap: 8px;
}

.error-code {
  display: inline-flex;
  margin-right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(145, 61, 47, 0.14);
  font-size: 0.74rem;
  white-space: nowrap;
}

.save-success {
  margin: 0;
  color: #366338;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.submit-button {
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: #7e6038;
  color: #fbf4e8;
  font: inherit;
  cursor: pointer;
}

.submit-button:hover {
  background: #6c502d;
}

.form-rule {
  font-size: 0.8rem;
  color: #8a714f;
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
