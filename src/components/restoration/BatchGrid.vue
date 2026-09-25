<script setup>
import { computed } from 'vue'

import { normalizePageRanges } from '../../utils/pageRanges'
import { riskMeta } from '../../utils/restorationFormatters'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const cards = computed(() =>
  props.items.map((item) => {
    if (item.normalizedPages) {
      return {
        ...item,
        registered: true,
        displayNormalized: item.normalizedPages,
        displayPageCount: item.pageCount ?? null,
      }
    }
    const { normalized, pageCount } = normalizePageRanges(item.pages)
    return {
      ...item,
      registered: false,
      displayNormalized: normalized,
      displayPageCount: pageCount,
    }
  }),
)
</script>

<template>
  <div class="batch-grid">
    <article
      v-for="item in cards"
      :key="item.code"
      class="batch-card"
      :class="{ 'batch-card--registered': item.registered }"
    >
      <div class="batch-head">
        <small>批次 {{ item.code }}</small>
        <span class="batch-tags">
          <span v-if="item.registered" class="archive-tag">已入库</span>
          <span :class="['risk-pill', `risk-pill--${riskMeta(item.risk).tone}`]">
            {{ riskMeta(item.risk).label }}
          </span>
        </span>
      </div>
      <h4>{{ item.title }}</h4>
      <p>
        <span class="page-label">页码（原始写法）：</span>{{ item.pages }}
      </p>
      <p class="normalized-line">
        <span class="page-label">规范页码：</span>
        <strong>{{ item.displayNormalized }}</strong>
        <template v-if="item.displayPageCount !== null">
          （{{ item.displayPageCount }} 页）
        </template>
      </p>
      <p v-if="item.totalPages" class="meta-line">
        全册共 {{ item.totalPages }} 页
      </p>
      <p>阶段：{{ item.status }}</p>
      <small>{{ item.note }}</small>
    </article>
  </div>
</template>

<style scoped>
.batch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.batch-card {
  padding: 18px;
  border-radius: 20px;
  background: #f4ebda;
  border: 1px solid rgba(109, 80, 40, 0.08);
}

.batch-card--registered {
  background: #efe4cf;
  border-color: rgba(126, 96, 56, 0.32);
}

.batch-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.batch-tags {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.archive-tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(54, 99, 56, 0.14);
  color: #366338;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
}

h4,
p,
small {
  margin: 0;
}

h4 {
  font-size: 1.04rem;
  margin-top: 10px;
}

p,
small {
  color: #6a5439;
}

p + p,
p + small {
  margin-top: 6px;
}

.page-label {
  color: #8a714f;
}

.normalized-line strong {
  color: #5c4a33;
}

.meta-line {
  font-size: 0.84rem;
}

.risk-pill {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
}

.risk-pill--high {
  background: #efd0c9;
  color: #913d2f;
}

.risk-pill--medium {
  background: #f6e5b9;
  color: #8b6314;
}

.risk-pill--low {
  background: #d9ead9;
  color: #366338;
}

@media (max-width: 960px) {
  .batch-grid {
    grid-template-columns: 1fr;
  }
}
</style>
