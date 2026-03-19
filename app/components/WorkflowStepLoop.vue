<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { WorkflowMilestone } from '../types/menu-admin'

const REPLAY_DURATION_MS = 200

const props = defineProps<{
  milestones: WorkflowMilestone[]
  terminal: boolean
}>()

const title = 'Workflow'
const hasSeenInitialPayload = ref(false)
const lastSeenMilestoneState = ref<Record<WorkflowMilestone['id'], WorkflowMilestone['status']>>({} as Record<WorkflowMilestone['id'], WorkflowMilestone['status']>)
const replayQueue = ref<WorkflowMilestone['id'][]>([])
const replayMilestoneId = ref<WorkflowMilestone['id'] | null>(null)
let replayTimer: ReturnType<typeof setTimeout> | null = null

const settledActiveMilestoneId = computed<WorkflowMilestone['id'] | null>(() => {
  const failedMilestone = props.milestones.find(milestone => milestone.status === 'failed')
  if (failedMilestone) {
    return failedMilestone.id
  }

  const inProgressMilestone = props.milestones.find(milestone => milestone.status === 'in_progress')
  if (inProgressMilestone) {
    return inProgressMilestone.id
  }

  const completedMilestones = props.milestones.filter(milestone => milestone.status === 'completed')
  return completedMilestones.at(-1)?.id || null
})

const highlightedMilestoneId = computed(() => replayMilestoneId.value || settledActiveMilestoneId.value)

watch(() => props.milestones, (milestones) => {
  const previousStates = { ...lastSeenMilestoneState.value }
  const nextStates = {} as Record<WorkflowMilestone['id'], WorkflowMilestone['status']>

  const newlyCompletedMilestones = milestones
    .filter((milestone) => {
      nextStates[milestone.id] = milestone.status
      return milestone.status === 'completed' && previousStates[milestone.id] !== 'completed'
    })
    .sort(compareMilestonesByCompletion)

  lastSeenMilestoneState.value = nextStates

  if (!hasSeenInitialPayload.value) {
    hasSeenInitialPayload.value = true
    return
  }

  if (!newlyCompletedMilestones.length) {
    return
  }

  replayQueue.value.push(...newlyCompletedMilestones.map(milestone => milestone.id))
  runReplayQueue()
}, { deep: true, immediate: true })

onBeforeUnmount(() => {
  clearReplayTimer()
})

function compareMilestonesByCompletion(a: WorkflowMilestone, b: WorkflowMilestone) {
  return milestoneTimeValue(a.completedAt) - milestoneTimeValue(b.completedAt)
}

function milestoneTimeValue(value: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function clearReplayTimer() {
  if (!replayTimer) {
    return
  }

  clearTimeout(replayTimer)
  replayTimer = null
}

function runReplayQueue() {
  if (replayTimer || !replayQueue.value.length) {
    return
  }

  replayMilestoneId.value = replayQueue.value.shift() || null
  replayTimer = setTimeout(() => {
    replayTimer = null
    replayMilestoneId.value = null
    runReplayQueue()
  }, REPLAY_DURATION_MS)
}

function isHighlighted(milestoneId: WorkflowMilestone['id']) {
  return highlightedMilestoneId.value === milestoneId
}

function lineClass(milestone: WorkflowMilestone) {
  if (milestone.status === 'failed') {
    return 'text-danger opacity-100'
  }

  if (milestone.status === 'completed') {
    return isHighlighted(milestone.id)
      ? 'text-text-primary opacity-100'
      : 'text-text-secondary opacity-90'
  }

  if (milestone.status === 'in_progress') {
    return 'text-text-primary opacity-100'
  }

  return 'text-text-muted opacity-55'
}

function iconName(milestone: WorkflowMilestone) {
  if (milestone.status === 'failed') {
    return 'close'
  }

  if (milestone.status === 'completed') {
    return 'check'
  }

  if (milestone.status === 'in_progress') {
    return 'spinner'
  }

  return null
}

function iconClass(milestone: WorkflowMilestone) {
  if (milestone.status === 'failed') {
    return 'size-4 text-danger'
  }

  if (milestone.status === 'completed') {
    return 'size-4 text-success'
  }

  return 'size-4 animate-spin text-text-secondary'
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-xs uppercase tracking-[0.15em] text-text-muted">{{ title }}</p>

    <div v-if="props.milestones.length" class="space-y-2">
      <div
        v-for="milestone in props.milestones"
        :key="milestone.id"
        :data-milestone-id="milestone.id"
        :data-milestone-status="milestone.status"
        :data-highlighted="isHighlighted(milestone.id) ? 'true' : 'false'"
        class="workflow-step flex items-start gap-3 text-sm leading-5"
        :class="lineClass(milestone)"
      >
        <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Icon
            v-if="iconName(milestone)"
            :name="iconName(milestone)!"
            :class="iconClass(milestone)"
          />
          <span v-else class="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        </span>

        <div class="min-w-0 space-y-0.5">
          <p class="font-medium">{{ milestone.label }}</p>
          <p class="text-xs text-current opacity-80">{{ milestone.detail }}</p>
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-text-muted">
      Waiting for the first workflow milestone.
    </p>
  </div>
</template>

<style scoped>
.workflow-step {
  transition:
    color 180ms ease,
    opacity 180ms ease;
}
</style>
