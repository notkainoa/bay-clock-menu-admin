<script setup lang="ts">
import type { StatusStage } from '../types/menu-admin'

type DisplayStage = Exclude<StatusStage, 'Failed'>

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
const activeStepIndex = ref(props.stage === 'Done' ? lastIndexFor('Done') : firstIndexFor(lastStableStage.value))

let timer: ReturnType<typeof setInterval> | null = null

function stopLoop() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

function startLoop() {
  stopLoop()

  if (props.stage === 'Failed' || props.stage === 'Done') {
    return
  }

  timer = setInterval(() => {
    const indices = STEP_INDICES_BY_STAGE[lastStableStage.value]

    if (indices.length <= 1) {
      return
    }

    const currentPosition = Math.max(0, indices.indexOf(activeStepIndex.value))
    activeStepIndex.value = indices[(currentPosition + 1) % indices.length] ?? indices[0] ?? activeStepIndex.value
  }, 1600)
}

watch(() => props.stage, (stage) => {
  if (stage === 'Failed') {
    stopLoop()
    return
  }

  lastStableStage.value = stage

  if (stage === 'Done') {
    activeStepIndex.value = lastIndexFor('Done')
    stopLoop()
    return
  }

  const stageIndices = STEP_INDICES_BY_STAGE[stage]
  if (!stageIndices.includes(activeStepIndex.value)) {
    activeStepIndex.value = firstIndexFor(stage)
  }

  startLoop()
})

onMounted(() => {
  startLoop()
})

onBeforeUnmount(() => {
  stopLoop()
})

const activeStage = computed<DisplayStage>(() => props.stage === 'Failed' ? lastStableStage.value : props.stage)

function lineStyle(index: number) {
  const delta = index - activeStepIndex.value
  const distance = Math.abs(delta)
  const opacity = delta < 0
    ? Math.max(0.16, 0.5 - (distance * 0.09))
    : delta > 0
      ? Math.max(0.24, 0.76 - (distance * 0.08))
      : 1
  const translateX = delta < 0
    ? Math.min(10, distance * 2)
    : Math.min(14, distance * 2)
  const scale = delta === 0 ? 1 : Math.max(0.96, 1 - (distance * 0.01))

  return {
    opacity,
    transform: `translateX(${translateX}px) scale(${scale})`,
  }
}
</script>

<template>
  <div class="rounded-sm border border-border bg-surface p-3">
    <p class="text-[10px] uppercase tracking-wider text-text-muted">Workflow steps</p>

    <div class="mt-3 space-y-2">
      <div
        v-for="(step, index) in WORKFLOW_STEPS"
        :key="`${step.stage}-${index}`"
        :class="[
          'workflow-step flex items-start gap-3 rounded-sm border px-3 py-2',
          index === activeStepIndex && props.stage !== 'Done' && props.stage !== 'Failed'
            ? 'workflow-step--active border-accent/30 bg-accent-muted text-text-primary'
            : index <= activeStepIndex
              ? 'border-border-subtle bg-surface-inset text-text-secondary'
              : 'border-border-subtle bg-transparent text-text-muted',
          props.stage === 'Done' && index === activeStepIndex ? 'border-success/30 bg-success-muted text-text-primary' : '',
          props.stage === 'Failed' && index === activeStepIndex ? 'border-danger/30 bg-danger-muted text-text-primary' : '',
        ]"
        :style="lineStyle(index)"
      >
        <span
          :class="[
            'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300',
            index < activeStepIndex || props.stage === 'Done'
              ? 'bg-text-secondary'
              : index === activeStepIndex && props.stage === 'Failed'
                ? 'bg-danger'
                : index === activeStepIndex
                  ? 'workflow-step__dot workflow-step__dot--active bg-accent'
                  : 'bg-border',
          ]"
        />

        <div class="min-w-0">
          <p class="text-sm leading-5">
            {{ step.label }}
          </p>
          <p
            v-if="step.stage === activeStage && index === activeStepIndex"
            class="mt-1 text-[10px] uppercase tracking-[0.14em]"
          >
            {{ step.stage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-step {
  transition:
    opacity 320ms ease,
    transform 320ms ease,
    border-color 320ms ease,
    background-color 320ms ease,
    color 320ms ease,
    box-shadow 320ms ease;
}

.workflow-step--active {
  box-shadow: inset 0 0 0 1px rgb(108 169 255 / 0.12), 0 0 24px rgb(108 169 255 / 0.06);
}

.workflow-step__dot {
  box-shadow: 0 0 0 0 rgb(108 169 255 / 0.4);
}

.workflow-step__dot--active {
  animation: workflow-dot-pulse 1.5s ease-in-out infinite;
}

@keyframes workflow-dot-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(108 169 255 / 0.14);
  }

  50% {
    transform: scale(1.4);
    box-shadow: 0 0 0 6px rgb(108 169 255 / 0);
  }
}
</style>
