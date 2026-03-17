<script setup lang="ts">
const props = defineProps<{
  liveSrc: string
  previewSrc: string
  previewMeta: string
}>()
</script>

<template>
  <div class="space-y-3">
    <!-- Split mode: side-by-side like Diffchecker -->
    <div class="grid gap-3 lg:grid-cols-2">
      <PreviewPanel
        title="Current menu"
        alt="Current live menu"
        :src="props.liveSrc"
        tone="red"
        :href="props.liveSrc"
      />
      <PreviewPanel
        title="New menu"
        :meta="props.previewMeta"
        alt="New upload preview"
        :src="props.previewSrc"
        tone="green"
      />
    </div>
  </div>
</template>
