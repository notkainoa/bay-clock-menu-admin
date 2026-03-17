<script setup lang="ts">
import type { ReviewMode } from '../types/menu-admin'

const props = defineProps<{
  liveSrc: string
  previewSrc: string
  previewMeta: string
  mode: ReviewMode
}>()

const emit = defineEmits<{
  'update:mode': [mode: ReviewMode]
}>()

const slider = ref(52)

const clipPath = computed(() => `inset(0 ${100 - slider.value}% 0 0)`)

function setMode(mode: ReviewMode) {
  emit('update:mode', mode)
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex items-center gap-3 rounded-[1.5rem] border border-white/20 bg-white/[0.03] p-2">
        <button
          :class="[
            'flex items-center gap-2 rounded-[1rem] px-4 py-2 text-xl transition',
            mode === 'split' ? 'bg-white/10 text-ink' : 'text-chalk hover:bg-white/5',
          ]"
          type="button"
          @click="setMode('split')"
        >
          <Icon name="split" class="size-5" />
          <span class="chalk-text">Split</span>
        </button>
        <button
          :class="[
            'flex items-center gap-2 rounded-[1rem] px-4 py-2 text-xl transition',
            mode === 'slider' ? 'bg-white/10 text-ink' : 'text-chalk hover:bg-white/5',
          ]"
          type="button"
          @click="setMode('slider')"
        >
          <Icon name="slider" class="size-5" />
          <span class="chalk-text">Slider</span>
        </button>
      </div>

      <p class="chalk-text text-2xl leading-none text-chalk">{{ props.previewMeta }}</p>
    </div>

    <div v-if="mode === 'split'" class="grid gap-5 xl:grid-cols-2">
      <PreviewPanel
        title="Current live menu"
        alt="Current live menu"
        :src="props.liveSrc"
        :tone="'red'"
        :href="props.liveSrc"
      />
      <PreviewPanel
        title="New upload"
        :meta="props.previewMeta"
        alt="New upload preview"
        :src="props.previewSrc"
        :tone="'green'"
      />
    </div>

    <section v-else class="space-y-4">
      <div class="flex items-center justify-between gap-4 px-1">
        <div>
          <h2 class="font-display text-2xl uppercase tracking-tight text-ink sm:text-3xl">Slider compare</h2>
          <p class="chalk-text text-xl leading-none text-chalk">Drag the seam to compare current and new menu art.</p>
        </div>
        <a class="chalk-text text-2xl leading-none text-ink/90 underline decoration-white/35 underline-offset-4" :href="props.liveSrc" target="_blank" rel="noreferrer">Open live</a>
      </div>

      <div class="sketch-dashed sketch-green overflow-hidden bg-black/35 p-4 sm:p-5">
        <div class="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-black/40">
          <img :src="props.liveSrc" alt="Current live menu" class="absolute inset-0 h-full w-full object-contain">
          <img :src="props.previewSrc" alt="New upload preview" class="absolute inset-0 h-full w-full object-contain" :style="{ clipPath }">
          <div class="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/80" :style="{ left: `${slider}%` }" />
        </div>
      </div>

      <label class="block">
        <span class="mb-2 block chalk-text text-2xl leading-none text-chalk">Slider</span>
        <input v-model="slider" class="w-full accent-moss" type="range" min="0" max="100">
      </label>
    </section>
  </div>
</template>
