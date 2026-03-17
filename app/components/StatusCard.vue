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
    return 'border-white/15 text-chalk'
  }

  const activeIndex = stages.indexOf(props.stage as typeof stages[number])
  const stageIndex = stages.indexOf(stage as typeof stages[number])

  if (stageIndex < activeIndex) {
    return 'border-moss/60 bg-moss/10 text-ink'
  }

  if (stageIndex === activeIndex) {
    return 'border-white/80 bg-white/10 text-ink'
  }

  return 'border-white/15 text-chalk'
}
</script>

<template>
  <section class="sketch-card mx-auto w-full max-w-3xl p-8 sm:p-10">
    <div class="space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-chalk">Workflow status</p>
      <h1 class="font-display text-5xl uppercase tracking-tight text-ink sm:text-6xl">{{ props.stage }}</h1>
      <p class="chalk-text text-2xl leading-none text-chalk">{{ props.detail }}</p>
    </div>

    <div class="mt-8 grid gap-3 sm:grid-cols-5">
      <div
        v-for="item in stages"
        :key="item"
        :class="['rounded-[1.5rem] border px-3 py-4 text-center text-lg uppercase tracking-[0.15em]', classForStage(item)]"
      >
        {{ item }}
      </div>
      <div
        v-if="props.stage === 'Failed'"
        class="rounded-[1.5rem] border border-rose/70 bg-rose/10 px-3 py-4 text-center text-lg uppercase tracking-[0.15em] text-rose sm:col-span-5"
      >
        Failed
      </div>
    </div>

    <div class="mt-8 space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <p class="text-sm uppercase tracking-[0.24em] text-chalk">Tracking upload commit</p>
      <code class="block overflow-hidden text-ellipsis whitespace-nowrap text-base text-ink">{{ props.commit }}</code>
      <a v-if="props.runUrl" class="chalk-text inline-flex items-center gap-2 text-2xl leading-none text-ink/90 underline decoration-white/35 underline-offset-4" :href="props.runUrl" target="_blank" rel="noreferrer">
        <Icon name="view" class="size-5" />
        View on GitHub
      </a>
    </div>

    <div class="mt-8">
      <slot />
    </div>
  </section>
</template>
