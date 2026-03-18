<script setup lang="ts">
import type { StatusStage } from '../types/menu-admin'

type DisplayStage = Exclude<StatusStage, 'Failed'>
type StepTone = 'current' | 'near' | 'mid' | 'far' | 'fade'

const props = defineProps<{
  stage: StatusStage
}>()

const WORKFLOW_STEPS = [
  {
    stage: 'Queued',
    label: 'Receiving the upload commit and matching it to a workflow run.',
  },
  {
    stage: 'Queued',
    label: 'Waiting for a GitHub runner to pick up the job.',
  },
  {
    stage: 'Processing',
    label: 'Downloading the source menu from the inbox branch.',
  },
  {
    stage: 'Processing',
    label: 'Converting the upload into live menu assets.',
  },
  {
    stage: 'Processing',
    label: 'Checking the generated files before publish.',
  },
  {
    stage: 'Publishing',
    label: 'Committing processed assets to the live branch.',
  },
  {
    stage: 'Publishing',
    label: 'Refreshing the public menu files served by the site.',
  },
  {
    stage: 'Finalizing',
    label: 'Clearing the processed inbox item and wrapping up the run.',
  },
  {
    stage: 'Done',
    label: 'Menu assets published successfully and ready to view.',
  },
] as const

const STEP_INDICES_BY_STAGE = WORKFLOW_STEPS.reduce((accumulator, step, index) => {
  accumulator[step.stage].push(index)
  return accumulator
}, {
  Queued: [] as number[],
  Processing: [] as number[],
  Publishing: [] as number[],
  Finalizing: [] as number[],
  Done: [] as number[],
})

function firstIndexFor(stage: DisplayStage) {
  return STEP_INDICES_BY_STAGE[stage][0] ?? 0
}

function lastIndexFor(stage: DisplayStage) {
  const indices = STEP_INDICES_BY_STAGE[stage]
  return indices[indices.length - 1] ?? 0
}

const lastStableStage = ref<DisplayStage>(props.stage === 'Failed' ? 'Queued' : props.stage)

watch(() => props.stage, (stage) => {
  if (stage !== 'Failed') {
    lastStableStage.value = stage
  }
})

const activeStage = computed<DisplayStage>(() => props.stage === 'Failed' ? lastStableStage.value : props.stage)
const activeStepIndex = computed(() => props.stage === 'Done' ? lastIndexFor('Done') : firstIndexFor(activeStage.value))
const title = 'Workflow'

function stepTone(index: number): StepTone {
  const distance = Math.abs(index - activeStepIndex.value)

  if (distance === 0) return 'current'
  if (distance === 1) return 'near'
  if (distance === 2) return 'mid'
  if (distance === 3) return 'far'
  return 'fade'
}

function lineStyle(index: number) {
  if (props.stage === 'Failed' && index === activeStepIndex.value) {
    return {
      color: '#ef4444',
      opacity: 1,
    }
  }

  if (props.stage === 'Done' && index === activeStepIndex.value) {
    return {
      color: '#f5f5f5',
      opacity: 1,
    }
  }

  const tone = stepTone(index)

  if (tone === 'current') {
    return {
      color: '#f5f5f5',
      opacity: 1,
    }
  }

  if (tone === 'near') {
    return {
      color: '#a3a3a3',
      opacity: 0.95,
    }
  }

  if (tone === 'mid') {
    return {
      color: '#737373',
      opacity: 0.82,
    }
  }

  if (tone === 'far') {
    return {
      color: '#525252',
      opacity: 0.68,
    }
  }

  return {
    color: '#404040',
    opacity: 0.34,
  }
}

function iconName(index: number) {
  if (index !== activeStepIndex.value) {
    return null
  }

  if (props.stage === 'Failed') {
    return 'close'
  }

  if (props.stage === 'Done') {
    return 'check'
  }

  return 'spinner'
}

function iconClass() {
  if (props.stage === 'Failed') {
    return 'size-4 text-danger'
  }

  if (props.stage === 'Done') {
    return 'size-4 text-success'
  }

  return 'size-4 animate-spin text-text-secondary'
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-xs uppercase tracking-[0.15em] text-text-muted">{{ title }}</p>

    <div class="space-y-2">
      <div
        v-for="(step, index) in WORKFLOW_STEPS"
        :key="`${step.stage}-${index}`"
        class="workflow-step flex items-start gap-3 text-sm leading-5"
        :style="lineStyle(index)"
      >
        <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Icon
            v-if="iconName(index)"
            :name="iconName(index)!"
            :class="iconClass()"
          />
        </span>

        <p class="min-w-0">
          {{ step.label }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-step {
  transition:
    color 280ms ease,
    opacity 280ms ease;
}
</style>
