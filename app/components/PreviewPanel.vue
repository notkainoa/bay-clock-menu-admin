<script setup lang="ts">
const props = defineProps<{
  title: string
  meta?: string
  src?: string
  alt: string
  tone: 'red' | 'green' | 'neutral'
  href?: string
}>()

const borderClass = computed(() => {
  if (props.tone === 'green') return 'border-dashed border-green-500/80'
  if (props.tone === 'red') return 'border-dashed border-red-500/80'
  return 'border-border'
})
</script>

<template>
  <section class="flex flex-col gap-2">
    <div class="flex items-center justify-between px-0.5">
      <h2 class="text-sm font-medium text-text-primary">{{ props.title }}</h2>
      <span v-if="props.meta" class="text-xs text-text-muted">{{ props.meta }}</span>
      <a v-if="props.href" class="text-xs text-text-secondary hover:text-text-primary" :href="props.href" target="_blank" rel="noreferrer">Open</a>
    </div>

    <div :class="['flex min-h-[360px] items-center justify-center overflow-hidden rounded-sm border-2 bg-surface-inset', borderClass]">
      <img v-if="props.src" :src="props.src" :alt="props.alt" class="h-full w-full object-contain">
      <span v-else class="text-xs text-text-muted">No preview</span>
    </div>
  </section>
</template>
