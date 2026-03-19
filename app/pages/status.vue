<script setup lang="ts">
import type { RunStatusPayload } from '../types/menu-admin'

definePageMeta({
  middleware: ['authenticated'],
})

const route = useRoute()
const commit = computed(() => typeof route.query.commit === 'string' ? route.query.commit : '')

const status = ref<RunStatusPayload | null>(null)
const statusError = ref('')
let timer: ReturnType<typeof setInterval> | null = null

async function pollStatus() {
  if (!commit.value) {
    statusError.value = 'A commit SHA is required to resume tracking this upload.'
    return
  }

  try {
    status.value = await $fetch<RunStatusPayload>(`/api/run-status?commit=${encodeURIComponent(commit.value)}`)
    statusError.value = ''
    if (status.value.terminal && timer) {
      clearInterval(timer)
      timer = null
    }
  }
  catch (error) {
    statusError.value = readApiError(error, 'Unable to check workflow status')
  }
}

onMounted(async () => {
  await pollStatus()
  if (!status.value?.terminal) {
    timer = setInterval(pollStatus, 2000)
  }
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})

async function uploadAnother() {
  await navigateTo('/upload')
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">
    <header class="flex items-center justify-between border-b border-border pb-4">
      <div class="flex items-baseline gap-2">
        <span class="text-xs uppercase tracking-[0.15em] text-text-muted">Bay Clock Studio</span>
        <span class="text-xs text-text-muted">/</span>
        <h1 class="font-display text-base text-text-primary">Menu</h1>
      </div>
    </header>

    <div class="flex flex-1 items-center py-12">
      <StatusCard
        :stage="status?.stage || 'Queued'"
        :commit="commit"
        :detail="status?.detail || 'Waiting for the latest workflow status.'"
        :terminal="status?.terminal || false"
        :milestones="status?.milestones || []"
        :run-url="status?.run?.url"
        :deploy="status?.deploy"
        :error-message="statusError"
        :failure-detail="status?.stage === 'Failed' ? status?.detail : ''"
      >
        <div class="flex gap-2">
          <button class="btn text-xs" type="button" @click="uploadAnother">
            Upload another
          </button>
          <a
            v-if="status?.terminal && status?.stage === 'Done'"
            class="btn-primary text-xs"
            href="https://bayclock.org"
            target="_blank"
            rel="noreferrer"
          >
            View Bay Clock
          </a>
        </div>
      </StatusCard>
    </div>
  </main>
</template>
