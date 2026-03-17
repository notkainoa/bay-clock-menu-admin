<script setup lang="ts">
import type { SessionPayload } from '../types/menu-admin'

const authBusy = ref(false)
const authError = ref('')

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data: session } = await useFetch<SessionPayload>('/api/session', { headers })

if (session.value?.authenticated) {
  await navigateTo('/upload')
}

async function handleSubmit(payload: { code: string, trustBrowser: boolean }) {
  authBusy.value = true
  authError.value = ''

  try {
    await $fetch('/api/auth', {
      method: 'POST',
      body: payload,
    })
    await navigateTo('/upload')
  }
  catch (error) {
    authError.value = readApiError(error, 'Unable to authenticate')
  }
  finally {
    authBusy.value = false
  }
}
</script>

<template>
  <AuthForm :busy="authBusy" :error="authError" @submit="handleSubmit" />
</template>
