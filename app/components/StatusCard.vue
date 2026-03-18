<script setup lang="ts">
import type { StatusStage } from '../types/menu-admin'

const props = defineProps<{
  stage: StatusStage
  detail: string
  commit: string
  runUrl?: string | null
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-xl">
    <div class="space-y-4">
      <div>
        <p class="text-xs uppercase tracking-[0.15em] text-text-muted">Workflow</p>
        <h1 class="mt-1 font-display text-2xl text-text-primary">{{ props.stage }}</h1>
        <p class="mt-1 text-sm text-text-secondary">{{ props.detail }}</p>
      </div>

      <WorkflowStepLoop :stage="props.stage" />

      <!-- Failed banner -->
      <div
        v-if="props.stage === 'Failed'"
        class="rounded-sm border border-danger/30 bg-danger-muted px-3 py-2 text-xs text-danger"
      >
        Workflow failed. Check GitHub Actions for details.
      </div>

      <!-- Commit tracking -->
      <div class="rounded-sm border border-border bg-surface p-3 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-text-muted">Tracking commit</p>
        <code class="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-text-primary font-mono">{{ props.commit }}</code>
        <a
          v-if="props.runUrl"
          class="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          :href="props.runUrl"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="view" class="size-3" />
          View on GitHub
        </a>
      </div>

      <!-- Actions slot -->
      <div>
        <slot />
      </div>
    </div>
  </div>
</template>
