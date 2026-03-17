<script setup lang="ts">
import type { StatusStage } from '../types/menu-admin'

const props = defineProps<{
  stage: StatusStage
  detail: string
  commit: string
  runUrl?: string | null
}>()

const stages = ['Queued', 'Processing', 'Publishing', 'Finalizing', 'Done'] as const

function classForStage(stage: string) {
  if (props.stage === 'Failed') {
    return 'border-white/10 text-[#95a6c7]'
  }

  const activeIndex = stages.indexOf(props.stage as typeof stages[number])
  const stageIndex = stages.indexOf(stage as typeof stages[number])

  if (stageIndex < activeIndex) {
    return 'border-[#7eb6ff]/30 bg-[#45556f] text-white'
  }

  if (stageIndex === activeIndex) {
    return 'border-[#7eb6ff]/50 bg-[#6ca9ff] text-[#031124]'
  }

  return 'border-white/10 text-[#95a6c7]'
}
</script>

<template>
  <section class="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-[#3f4c65]/30 p-8 sm:p-10">
    <div class="space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-[#95a6c7]">Workflow status</p>
      <h1 class="font-display text-5xl tracking-tight text-white sm:text-6xl">{{ props.stage }}</h1>
      <p class="text-base text-[#b7c4da]">{{ props.detail }}</p>
    </div>

    <div class="mt-8 grid gap-3 sm:grid-cols-5">
      <div
        v-for="item in stages"
        :key="item"
        :class="['rounded-full border px-3 py-4 text-center text-sm uppercase tracking-[0.15em]', classForStage(item)]"
      >
        {{ item }}
      </div>
      <div
        v-if="props.stage === 'Failed'"
        class="rounded-full border border-[#f2a8ae]/70 bg-[#f2a8ae]/10 px-3 py-4 text-center text-sm uppercase tracking-[0.15em] text-[#f2a8ae] sm:col-span-5"
      >
        Failed
      </div>
    </div>

    <div class="mt-8 space-y-4 rounded-[1.5rem] border border-white/10 bg-[#0b1324]/55 p-5">
      <p class="text-sm uppercase tracking-[0.24em] text-[#95a6c7]">Tracking upload commit</p>
      <code class="block overflow-hidden text-ellipsis whitespace-nowrap text-base text-white">{{ props.commit }}</code>
      <a v-if="props.runUrl" class="inline-flex items-center gap-2 text-sm text-[#95a6c7] underline decoration-white/25 underline-offset-4" :href="props.runUrl" target="_blank" rel="noreferrer">
        <Icon name="view" class="size-5" />
        View on GitHub
      </a>
    </div>

    <div class="mt-8">
      <slot />
    </div>
  </section>
</template>
