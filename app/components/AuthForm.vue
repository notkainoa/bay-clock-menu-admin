<script setup lang="ts">
const props = defineProps<{
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [payload: { code: string, trustBrowser: boolean }]
}>()

const code = ref('')
const trustBrowser = ref(false)

function handleSubmit() {
  emit('submit', {
    code: code.value,
    trustBrowser: trustBrowser.value,
  })
}
</script>

<template>
  <section class="flex min-h-screen items-center justify-center px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6">
        <h1 class="font-display text-2xl tracking-tight text-text-primary">Menu Admin</h1>
      </div>

      <div class="rounded-sm border border-border bg-surface p-4">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <label class="block">
            <input
              v-model="code"
              class="input py-2.5 text-base"
              type="password"
              autocomplete="current-password"
              placeholder="Enter access code"
              required
            >
          </label>

          <label class="flex items-start gap-2.5 text-sm text-text-secondary">
            <input v-model="trustBrowser" class="mt-0.5 size-3.5 accent-accent" type="checkbox">
            <span>
              <span class="block text-text-primary">Trust this browser</span>
            </span>
          </label>

          <p v-if="props.error" class="text-xs text-danger">{{ props.error }}</p>

          <button class="btn-primary w-full" :disabled="props.busy" type="submit">
            {{ props.busy ? 'Checking...' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
