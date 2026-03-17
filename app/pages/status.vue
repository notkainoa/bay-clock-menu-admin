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
  <main class="mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-5 py-8 sm:px-8 sm:py-10">
    <StatusCard
      :stage="status?.stage || 'Queued'"
      :detail="statusError || status?.detail || 'Waiting for GitHub Actions to pick up the upload.'"
      :commit="commit"
      :run-url="status?.run?.url"
    >
      <div class="flex flex-col gap-3 sm:flex-row">
        <button class="sketch-button w-full text-sm sm:w-auto" type="button" @click="uploadAnother">
          Upload another menu
        </button>
        <a
          v-if="status?.stage === 'Done'"
          class="sketch-button-primary w-full text-center text-sm uppercase tracking-[0.16em]"
          :href="liveMenuUrl"
          target="_blank"
          rel="noreferrer"
        >
          Open current live menu
        </a>
      </div>
    </StatusCard>
  </main>
</template>
