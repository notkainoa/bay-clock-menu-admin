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
  <section class="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 sm:px-8">
    <div class="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#3f4c65]/30 p-8 sm:p-10">
      <div class="space-y-3">
        <p class="text-sm uppercase tracking-[0.3em] text-[#95a6c7]">Menu Admin</p>
        <h1 class="font-display text-5xl tracking-tight text-white sm:text-6xl">Sign in</h1>
        <p class="text-lg text-[#b7c4da]">Use the shared access code to upload a new lunch menu.</p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="mb-2 block text-sm uppercase tracking-[0.24em] text-[#95a6c7]">Access code</span>
          <input
            v-model="code"
            class="w-full rounded-full border border-white/10 bg-[#45556f] px-5 py-4 text-xl text-white outline-none transition focus:border-[#7eb6ff] focus:bg-[#4a5c77]"
            type="password"
            autocomplete="current-password"
            required
          >
        </label>

        <label class="flex gap-3 rounded-[1.5rem] border border-white/10 bg-[#0b1324]/55 p-4 text-[#b7c4da]">
          <input v-model="trustBrowser" class="mt-1 size-4 accent-[#7eb6ff]" type="checkbox">
          <span>
            <span class="block text-xl text-white">Trust this browser</span>
            <span class="text-base text-[#95a6c7]">Only use this on a personal device.</span>
          </span>
        </label>

        <p v-if="props.error" class="text-base text-[#f2a8ae]">{{ props.error }}</p>

        <button class="sketch-button-primary w-full text-lg tracking-[0.08em]" :disabled="props.busy" type="submit">
          {{ props.busy ? 'Checking...' : 'Continue' }}
        </button>
      </form>
    </div>
  </section>
</template>
