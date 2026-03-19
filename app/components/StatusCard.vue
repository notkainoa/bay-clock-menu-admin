<script setup lang="ts">
import type { DeployStatusInfo, StatusStage, WorkflowMilestone } from '../types/menu-admin'

const props = defineProps<{
  stage: StatusStage
  commit: string
  detail: string
  terminal: boolean
  milestones: WorkflowMilestone[]
  runUrl?: string | null
  deploy?: DeployStatusInfo | null
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

      <div class="mx-auto w-full max-w-[29rem] space-y-3">
        <WorkflowStepLoop :milestones="props.milestones" :terminal="props.terminal" />
        <p class="text-sm text-text-secondary">
          {{ props.detail }}
        </p>
      </div>

      <!-- Commit tracking -->
      <div class="mx-auto w-full max-w-[29rem] rounded-sm border border-border bg-surface p-3 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-text-muted">Tracking commit</p>
        <code class="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-text-primary font-mono">{{ props.commit }}</code>
        <div class="flex flex-wrap gap-3">
          <a
            v-if="props.runUrl"
            class="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
            :href="props.runUrl"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="view" class="size-3" />
            View GitHub run
          </a>
          <a
            v-if="props.deploy?.url"
            class="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
            :href="props.deploy.url"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="view" class="size-3" />
            View Vercel deployment
          </a>
        </div>
      </div>

      <!-- Actions slot -->
      <div class="mx-auto w-full max-w-[29rem]">
        <slot />
      </div>
    </div>
  </div>
</template>
