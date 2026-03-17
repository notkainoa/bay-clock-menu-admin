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
      <div class="flex items-center gap-2 rounded-full border border-white/10 bg-[#45556f] p-1">
        <button
          :class="[
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition',
            mode === 'split' ? 'bg-[#6ca9ff] text-[#031124]' : 'text-white hover:bg-white/10',
          ]"
          type="button"
          @click="setMode('split')"
        >
          <Icon name="split" class="size-5" />
          <span>Split</span>
        </button>
        <button
          :class="[
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition',
            mode === 'slider' ? 'bg-[#6ca9ff] text-[#031124]' : 'text-white hover:bg-white/10',
          ]"
          type="button"
          @click="setMode('slider')"
        >
          <Icon name="slider" class="size-5" />
          <span>Slider</span>
        </button>
      </div>

      <p class="text-sm text-[#95a6c7]">{{ props.previewMeta }}</p>
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
          <h2 class="font-display text-2xl tracking-tight text-white sm:text-3xl">Slider compare</h2>
          <p class="text-sm text-[#95a6c7]">Drag the seam to compare current and new menu art.</p>
        </div>
        <a class="text-sm text-[#95a6c7] underline decoration-white/25 underline-offset-4" :href="props.liveSrc" target="_blank" rel="noreferrer">Open live</a>
      </div>

      <div class="overflow-hidden rounded-[1.75rem] border border-[#7eb6ff]/40 bg-[#0b1324]/70 p-4 sm:p-5">
        <div class="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[#040b17]">
          <img :src="props.liveSrc" alt="Current live menu" class="absolute inset-0 h-full w-full object-contain">
          <img :src="props.previewSrc" alt="New upload preview" class="absolute inset-0 h-full w-full object-contain" :style="{ clipPath }">
          <div class="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/80" :style="{ left: `${slider}%` }" />
        </div>
      </div>

      <label class="block">
        <span class="mb-2 block text-sm uppercase tracking-[0.24em] text-[#95a6c7]">Slider</span>
        <input v-model="slider" class="w-full accent-[#7eb6ff]" type="range" min="0" max="100">
      </label>
    </section>
  </div>
</template>
