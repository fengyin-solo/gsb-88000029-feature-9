<script setup>
import PanelSection from '../components/common/PanelSection.vue'
import BatchGrid from '../components/restoration/BatchGrid.vue'
import BatchRegistrationForm from '../components/restoration/BatchRegistrationForm.vue'
import { useBatchArchive } from '../composables/useBatchArchive'

const { batches, registerBatch } = useBatchArchive()
</script>

<template>
  <div class="view-stack">
    <PanelSection title="批次入库登记" badge="页码范围">
      <p class="section-hint">
        页码范围支持起止页（17-29）、页组与跳号组合（1-3,5,8-10），兼容全角标点与“至、到”写法；
        保存前按入库标准逐条校验。
      </p>
      <BatchRegistrationForm @register="registerBatch" />
    </PanelSection>

    <PanelSection title="批次档案" badge="原始写法 / 规范结果">
      <BatchGrid :items="batches" />
    </PanelSection>
  </div>
</template>

<style scoped>
.view-stack {
  display: grid;
  gap: 24px;
}

.section-hint {
  margin: 0 0 16px;
  color: #7a6546;
  font-size: 0.88rem;
}
</style>
