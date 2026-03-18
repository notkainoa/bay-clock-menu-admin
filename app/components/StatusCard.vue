<script setup lang="ts">
import type { StatusStage } from '../types/menu-admin'

const props = defineProps<{
  stage: StatusStage
  commit: string
  runUrl?: string | null
  errorMessage?: string
  failureDetail?: string
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-[35rem]">
    <div class="space-y-4">
      <div
        v-if="props.errorMessage"
        class="mx-auto w-full max-w-[29rem] rounded-sm border border-danger/30 bg-danger-muted px-3 py-2 text-xs text-danger"
      >
        {{ props.errorMessage }}
      </div>

      <div
        v-else-if="props.stage === 'Failed' && props.failureDetail"
        class="mx-auto w-full max-w-[29rem] rounded-sm border border-danger/30 bg-danger-muted px-3 py-2 text-xs text-danger"
      >
        {{ props.failureDetail }}
      </div>

      <div class="mx-auto w-full max-w-[29rem]">
        <WorkflowStepLoop :stage="props.stage" />
      </div>

      <!-- Commit tracking -->
      <div class="mx-auto w-full max-w-[29rem] rounded-sm border border-border bg-surface p-3 space-y-2">
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
      <div class="mx-auto w-full max-w-[29rem]">
        <slot />
      </div>
    </div>
  </div>
</template>
