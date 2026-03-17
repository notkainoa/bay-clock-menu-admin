<script setup lang="ts">
import type { RunStatusPayload } from '../types/menu-admin'

definePageMeta({
  middleware: ['authenticated'],
})

const route = useRoute()
const commit = computed(() => typeof route.query.commit === 'string' ? route.query.commit : '')
const runtimeConfig = useRuntimeConfig()

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

const liveMenuUrl = computed(() =>
  `https://raw.githubusercontent.com/${runtimeConfig.public.githubOwner}/${runtimeConfig.public.githubRepo}/${runtimeConfig.public.githubDefaultBranch}/public/menu/menu.jpg?t=${Date.now()}`,
)

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
        :detail="statusError || status?.detail || 'Waiting for GitHub Actions to pick up the upload.'"
        :commit="commit"
        :run-url="status?.run?.url"
      >
        <div class="flex gap-2">
          <button class="btn text-xs" type="button" @click="uploadAnother">
            Upload another
          </button>
          <a
            v-if="status?.stage === 'Done'"
            class="btn-primary text-xs"
            :href="liveMenuUrl"
            target="_blank"
            rel="noreferrer"
          >
            View live menu
          </a>
        </div>
      </StatusCard>
    </div>
  </main>
</template>
