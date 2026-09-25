<script setup>
import { computed, reactive, ref } from 'vue'

import { useBatchRegistry } from '../../composables/useBatchRegistry'
import { normalizePageRange } from '../../utils/pageRange'

const { registerBatch, isCodeTaken } = useBatchRegistry()

const blankDraft = () => ({
  code: '',
  title: '',
  totalPages: '',
  pages: '',
  risk: 'medium',
  status: '补纸前',
  note: '',
})

const draft = reactive(blankDraft())
const errors = ref([])
const savedMessage = ref('')

const riskOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

const statusOptions = ['补纸前', '控湿中', '归档前']

const totalPagesNumber = computed(() => Number(draft.totalPages))
const totalPagesValid = computed(
  () => Number.isInteger(totalPagesNumber.value) && totalPagesNumber.value >= 1,
)

const normalizedPreview = computed(() => {
  if (!draft.pages.trim()) return ''
  const result = normalizePageRange(
    draft.pages,
    totalPagesValid.value ? totalPagesNumber.value : undefined,
  )
  return result.ok ? result.normalized : ''
})

function submit() {
  const problems = []
  const code = draft.code.trim()
  const title = draft.title.trim()

  if (!code) {
    problems.push('批次编号不能为空。')
  } else if (isCodeTaken(code)) {
    problems.push(`批次编号「${code}」已登记，不能覆盖已有批次。`)
  }
  if (!title) {
    problems.push('批次名称不能为空。')
  }
  if (!totalPagesValid.value) {
    problems.push('册页总数需为不小于 1 的整数。')
  }

  const rangeResult = normalizePageRange(
    draft.pages,
    totalPagesValid.value ? totalPagesNumber.value : undefined,
  )
  if (!rangeResult.ok) {
    problems.push(...rangeResult.errors.map((error) => error.message))
  }

  if (problems.length) {
    errors.value = problems
    savedMessage.value = ''
    return
  }

  const saved = registerBatch({
    code,
    title,
    totalPages: totalPagesNumber.value,
    pages: draft.pages,
    risk: draft.risk,
    status: draft.status,
    note: draft.note.trim(),
  })

  if (!saved.ok) {
    errors.value = saved.errors.map((error) => error.message)
    savedMessage.value = ''
    return
  }

  errors.value = []
  savedMessage.value = `批次 ${code} 已保存，规范化页码：${saved.batch.pagesNormalized}`
  Object.assign(draft, blankDraft())
}
</script>

<template>
  <form class="register-form" novalidate @submit.prevent="submit">
    <div class="field-grid">
      <label class="field">
        <span>批次编号</span>
        <input v-model="draft.code" type="text" placeholder="如 D-07" />
      </label>

      <label class="field">
        <span>册页总数</span>
        <input v-model="draft.totalPages" type="number" min="1" placeholder="如 36" />
      </label>

      <label class="field field--wide">
        <span>批次名称</span>
        <input v-model="draft.title" type="text" placeholder="如 民国医书抄本" />
      </label>

      <label class="field field--wide">
        <span>页码范围</span>
        <input
          v-model="draft.pages"
          type="text"
          placeholder="如 17-29；3、5、7；1-5、8、10-12"
        />
        <small class="field-hint">
          支持起止页（17-29）、页组（3、5、7）与跳号组合（1-5、8、10-12）。
        </small>
        <small v-if="normalizedPreview" class="field-preview">
          规范化预览：{{ normalizedPreview }}
        </small>
      </label>

      <label class="field">
        <span>风险等级</span>
        <select v-model="draft.risk">
          <option v-for="option in riskOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>当前阶段</span>
        <select v-model="draft.status">
          <option v-for="option in statusOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>

      <label class="field field--wide">
        <span>任务说明</span>
        <textarea
          v-model="draft.note"
          rows="2"
          placeholder="登记修复要点，保存后随批次档案一同展现"
        ></textarea>
      </label>
    </div>

    <div v-if="errors.length" class="form-errors" role="alert">
      <strong>以下 {{ errors.length }} 条不符合入库标准，修正后可重新保存：</strong>
      <ul>
        <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
      </ul>
    </div>

    <p v-if="savedMessage" class="form-success">{{ savedMessage }}</p>

    <button type="submit">保存登记</button>
  </form>
</template>

<style scoped>
.register-form {
  display: grid;
  gap: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field--wide {
  grid-column: 1 / -1;
}

.field span {
  font-size: 0.82rem;
  color: #775936;
  letter-spacing: 0.04em;
}

input,
select,
textarea {
  font: inherit;
  color: inherit;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(109, 80, 40, 0.22);
  background: rgba(255, 255, 255, 0.82);
}

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid rgba(121, 88, 47, 0.35);
  outline-offset: 1px;
}

textarea {
  resize: vertical;
}

.field-hint,
.field-preview {
  font-size: 0.78rem;
  color: #6a5439;
}

.field-preview {
  color: #366338;
}

.form-errors {
  padding: 14px 16px;
  border-radius: 14px;
  background: #efd0c9;
  color: #913d2f;
}

.form-errors ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.form-errors li + li {
  margin-top: 4px;
}

.form-success {
  margin: 0;
  padding: 12px 16px;
  border-radius: 14px;
  background: #d9ead9;
  color: #366338;
}

button {
  justify-self: start;
  font: inherit;
  padding: 10px 22px;
  border: none;
  border-radius: 999px;
  background: #795830;
  color: #fff8eb;
  cursor: pointer;
}

button:hover {
  background: #5f4525;
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
