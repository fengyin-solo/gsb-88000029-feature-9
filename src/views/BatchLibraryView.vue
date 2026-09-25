<script setup>
import PanelSection from '../components/common/PanelSection.vue'
import BatchGrid from '../components/restoration/BatchGrid.vue'
import BatchRegisterForm from '../components/restoration/BatchRegisterForm.vue'
import { useBatchRegistry } from '../composables/useBatchRegistry'

const { batches } = useBatchRegistry()
</script>

<template>
  <div class="view-stack">
    <PanelSection title="登记新批次" badge="入库登记">
      <BatchRegisterForm />
    </PanelSection>

    <PanelSection title="批次档案" badge="修复对象">
      <BatchGrid :items="batches" />
    </PanelSection>
  </div>
</template>

<style scoped>
.view-stack {
  display: grid;
  gap: 24px;
}
</style>
