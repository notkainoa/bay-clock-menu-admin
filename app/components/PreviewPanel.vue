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
    return 'sketch-red'
  }

  if (props.tone === 'green') {
    return 'sketch-green'
  }

  return 'border-white/80'
})
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-4 px-1">
      <div>
        <h2 class="font-display text-2xl uppercase tracking-tight text-ink sm:text-3xl">{{ props.title }}</h2>
        <p v-if="props.meta" class="chalk-text text-xl leading-none text-chalk">{{ props.meta }}</p>
      </div>
      <a v-if="props.href" class="chalk-text text-2xl leading-none text-ink/90 underline decoration-white/35 underline-offset-4" :href="props.href" target="_blank" rel="noreferrer">Open</a>
    </div>

    <div :class="['sketch-dashed min-h-[26rem] overflow-hidden bg-black/35 p-4 sm:p-5', toneClass]">
      <div class="flex min-h-[22rem] items-center justify-center overflow-hidden rounded-[1.5rem] bg-black/35">
        <img v-if="props.src" :src="props.src" :alt="props.alt" class="h-full w-full object-contain">
        <div v-else class="chalk-text text-3xl leading-none text-chalk">No preview yet</div>
      </div>
    </div>
  </section>
</template>
