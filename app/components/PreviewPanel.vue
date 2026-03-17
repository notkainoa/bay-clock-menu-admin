<script setup lang="ts">
const props = defineProps<{
  title: string
  meta?: string
  src?: string
  alt: string
  tone: 'red' | 'green' | 'neutral'
  href?: string
}>()

const toneClass = computed(() => {
  if (props.tone === 'red') {
    return 'border-white/10'
  }

  if (props.tone === 'green') {
    return 'border-[#7eb6ff]/50'
  }

  return 'border-white/10'
})
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-4 px-1">
      <div>
        <h2 class="font-display text-2xl tracking-tight text-white sm:text-3xl">{{ props.title }}</h2>
        <p v-if="props.meta" class="text-sm text-[#95a6c7]">{{ props.meta }}</p>
      </div>
      <a v-if="props.href" class="text-sm text-[#95a6c7] underline decoration-white/25 underline-offset-4" :href="props.href" target="_blank" rel="noreferrer">Open</a>
    </div>

    <div :class="['min-h-[26rem] overflow-hidden rounded-[1.75rem] border bg-[#0b1324]/70 p-4 sm:p-5', toneClass]">
      <div class="flex min-h-[22rem] items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#040b17]">
        <img v-if="props.src" :src="props.src" :alt="props.alt" class="h-full w-full object-contain">
        <div v-else class="text-base text-[#95a6c7]">No preview yet</div>
      </div>
    </div>
  </section>
</template>
