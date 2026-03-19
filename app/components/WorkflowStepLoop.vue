<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { WorkflowMilestone } from '../types/menu-admin'

const REPLAY_DURATION_MS = 200
const ENTER_ANIMATION_DURATION_MS = 160
const ENTER_STAGGER_MS = 35
const ENTER_STAGGER_CAP_MS = 105

type RowVisualState = 'failed' | 'working' | 'completed' | 'pending' | 'idle'

interface TimelineRowViewModel {
  id: WorkflowMilestone['id']
  label: string
  detail: string
  status: WorkflowMilestone['status']
  isWorking: boolean
  isEntering: boolean
  visualState: RowVisualState
  iconName: 'spinner' | 'check' | 'close' | null
  iconClass: string
  rowClass: string
  enterDelayMs: number
}

const props = defineProps<{
  milestones: WorkflowMilestone[]
  terminal: boolean
  detail: string
}>()

const title = 'Workflow'
const hasSeenInitialPayload = ref(false)
const lastSeenMilestoneState = ref<Record<WorkflowMilestone['id'], WorkflowMilestone['status']>>({} as Record<WorkflowMilestone['id'], WorkflowMilestone['status']>)
const replayQueue = ref<WorkflowMilestone['id'][]>([])
const activeReplayId = ref<WorkflowMilestone['id'] | null>(null)
const seenMilestoneIds = ref(new Set<WorkflowMilestone['id']>())
const enteringMilestoneIds = ref(new Set<WorkflowMilestone['id']>())
const enterDelayByMilestoneId = ref<Partial<Record<WorkflowMilestone['id'], number>>>({})
const enterTimers = new Map<WorkflowMilestone['id'], ReturnType<typeof setTimeout>>()
let replayTimer: ReturnType<typeof setTimeout> | null = null

const fallbackWorkingMilestoneId = computed<WorkflowMilestone['id'] | null>(() => {
  const failedMilestone = props.milestones.find(milestone => milestone.status === 'failed')
  if (props.terminal && failedMilestone) {
    return failedMilestone.id
  }

  const inProgressMilestone = props.milestones.find(milestone => milestone.status === 'in_progress')
  if (inProgressMilestone) {
    return inProgressMilestone.id
  }

  const pendingMilestone = props.milestones.find(milestone => milestone.status === 'pending')
  if (pendingMilestone) {
    return pendingMilestone.id
  }

  const completedMilestones = props.milestones.filter(milestone => milestone.status === 'completed')
  return completedMilestones.at(-1)?.id || null
})

const workingMilestoneId = computed<WorkflowMilestone['id'] | null>(() => activeReplayId.value || fallbackWorkingMilestoneId.value)

const rowViewModels = computed<TimelineRowViewModel[]>(() => props.milestones.map((milestone) => {
  const isWorking = workingMilestoneId.value === milestone.id
  const isEntering = enteringMilestoneIds.value.has(milestone.id)
  const visualState = resolveVisualState(milestone, isWorking)

  return {
    id: milestone.id,
    label: milestone.label,
    detail: milestone.detail,
    status: milestone.status,
    isWorking,
    isEntering,
    visualState,
    iconName: resolveIconName(visualState),
    iconClass: resolveIconClass(visualState),
    rowClass: resolveRowClass(visualState),
    enterDelayMs: enterDelayByMilestoneId.value[milestone.id] || 0,
  }
}))

watch(() => props.milestones, (milestones) => {
  const previousStates = { ...lastSeenMilestoneState.value }
  const nextStates = {} as Record<WorkflowMilestone['id'], WorkflowMilestone['status']>
  const nextMilestoneIds = new Set(milestones.map(milestone => milestone.id))

  const newlyCompletedMilestones = milestones
    .filter((milestone) => {
      nextStates[milestone.id] = milestone.status
      return milestone.status === 'completed' && previousStates[milestone.id] !== 'completed'
    })
    .sort(compareMilestonesByCompletion)

  lastSeenMilestoneState.value = nextStates

  if (!hasSeenInitialPayload.value) {
    hasSeenInitialPayload.value = true
    seenMilestoneIds.value = nextMilestoneIds
    return
  }

  const newlyInsertedMilestones = milestones.filter(milestone => !seenMilestoneIds.value.has(milestone.id))
  if (newlyInsertedMilestones.length) {
    markEnteringMilestones(newlyInsertedMilestones.map(milestone => milestone.id))
  }

  seenMilestoneIds.value = nextMilestoneIds

  if (!newlyCompletedMilestones.length) {
    return
  }

  replayQueue.value.push(...newlyCompletedMilestones.map(milestone => milestone.id))
  startReplayIfIdle()
}, { deep: true, immediate: true })

onBeforeUnmount(() => {
  clearReplayTimer()
  clearEnterTimers()
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

function markEnteringMilestones(milestoneIds: WorkflowMilestone['id'][]) {
  const nextEnteringIds = new Set(enteringMilestoneIds.value)
  const nextDelays = { ...enterDelayByMilestoneId.value }

  for (const milestoneId of milestoneIds) {
    const existingTimer = enterTimers.get(milestoneId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      enterTimers.delete(milestoneId)
    }
  }

  milestoneIds.forEach((milestoneId, index) => {
    const delay = Math.min(index * ENTER_STAGGER_MS, ENTER_STAGGER_CAP_MS)
    nextEnteringIds.add(milestoneId)
    nextDelays[milestoneId] = delay

    const timer = setTimeout(() => {
      const updatedEnteringIds = new Set(enteringMilestoneIds.value)
      updatedEnteringIds.delete(milestoneId)
      enteringMilestoneIds.value = updatedEnteringIds

      const updatedDelays = { ...enterDelayByMilestoneId.value }
      delete updatedDelays[milestoneId]
      enterDelayByMilestoneId.value = updatedDelays

      enterTimers.delete(milestoneId)
    }, ENTER_ANIMATION_DURATION_MS + delay)

    enterTimers.set(milestoneId, timer)
  })

  enteringMilestoneIds.value = nextEnteringIds
  enterDelayByMilestoneId.value = nextDelays
}

function clearEnterTimers() {
  for (const timer of enterTimers.values()) {
    clearTimeout(timer)
  }

  enterTimers.clear()
}

function clearReplayTimer() {
  if (!replayTimer) {
    return
  }

  clearTimeout(replayTimer)
  replayTimer = null
}

function startReplayIfIdle() {
  if (replayTimer || activeReplayId.value || !replayQueue.value.length) {
    return
  }

  activeReplayId.value = replayQueue.value.shift() || null
  scheduleReplayStepFinish()
}

function scheduleReplayStepFinish() {
  if (!activeReplayId.value) {
    replayTimer = null
    return
  }

  replayTimer = setTimeout(() => {
    finishReplayStep()
  }, REPLAY_DURATION_MS)
}

function finishReplayStep() {
  replayTimer = null

  if (replayQueue.value.length) {
    activeReplayId.value = replayQueue.value.shift() || null
    scheduleReplayStepFinish()
    return
  }

  activeReplayId.value = null
}

function resolveVisualState(milestone: WorkflowMilestone, isWorking: boolean): RowVisualState {
  if (milestone.status === 'failed') {
    return 'failed'
  }

  if (!props.terminal && isWorking) {
    return 'working'
  }

  if (milestone.status === 'completed') {
    return 'completed'
  }

  if (milestone.status === 'pending') {
    return 'pending'
  }

  return 'idle'
}

function resolveIconName(visualState: RowVisualState): TimelineRowViewModel['iconName'] {
  if (visualState === 'failed') {
    return 'close'
  }

  if (visualState === 'working') {
    return 'spinner'
  }

  if (visualState === 'completed') {
    return 'check'
  }

  return null
}

function resolveIconClass(visualState: RowVisualState) {
  if (visualState === 'failed') {
    return 'size-4 text-danger'
  }

  if (visualState === 'working') {
    return 'size-4 animate-spin text-text-secondary'
  }

  if (visualState === 'completed') {
    return 'size-4 text-success'
  }

  return ''
}

function resolveRowClass(visualState: RowVisualState) {
  if (visualState === 'failed') {
    return 'text-danger opacity-100'
  }

  if (visualState === 'working') {
    return 'text-text-primary opacity-100'
  }

  if (visualState === 'completed') {
    return 'text-text-secondary opacity-90'
  }

  if (visualState === 'idle') {
    return 'text-text-secondary opacity-90'
  }

  return 'text-text-muted opacity-55'
}

function rowStyle(row: TimelineRowViewModel) {
  return {
    '--workflow-enter-delay': `${row.enterDelayMs}ms`,
  }
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-xs uppercase tracking-[0.15em] text-text-muted">{{ title }}</p>

    <div v-if="rowViewModels.length" class="space-y-2">
      <div
        v-for="row in rowViewModels"
        :key="row.id"
        :data-milestone-id="row.id"
        :data-milestone-status="row.status"
        :data-visual-state="row.visualState"
        :data-working="row.isWorking ? 'true' : 'false'"
        :data-entering="row.isEntering ? 'true' : 'false'"
        class="workflow-step flex items-start gap-3 text-sm leading-5"
        :class="[row.rowClass, row.isEntering && 'workflow-step--entering']"
        :style="rowStyle(row)"
      >
        <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Icon
            v-if="row.iconName"
            :key="`${row.id}:${row.visualState}`"
            :name="row.iconName"
            :class="row.iconClass"
          />
          <span v-else class="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        </span>

        <div class="min-w-0 space-y-0.5">
          <p class="font-medium">{{ row.label }}</p>
          <p class="text-xs text-current opacity-80">{{ row.detail }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="!props.terminal" class="space-y-2">
      <div
        class="workflow-step flex items-start gap-3 text-sm leading-5 text-text-primary opacity-100"
        data-placeholder-row="true"
        data-milestone-id="placeholder"
        data-visual-state="working"
        data-working="true"
        data-entering="false"
      >
        <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Icon key="placeholder:working" name="spinner" class="size-4 animate-spin text-text-secondary" />
        </span>

        <div class="min-w-0 space-y-0.5">
          <p class="font-medium">Waiting for workflow</p>
          <p class="text-xs text-current opacity-80">{{ props.detail }}</p>
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-text-muted">
      Workflow complete.
    </p>
  </div>
</template>

<style scoped>
.workflow-step {
  transition:
    color 180ms ease,
    opacity 180ms ease,
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.workflow-step--entering {
  animation: workflow-step-enter 160ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--workflow-enter-delay, 0ms);
}

@keyframes workflow-step-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
