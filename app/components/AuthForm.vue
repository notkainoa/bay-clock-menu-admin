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
    <div class="sketch-card mx-auto w-full max-w-xl p-8 sm:p-10">
      <div class="space-y-4">
        <p class="text-sm uppercase tracking-[0.3em] text-chalk">Private Access</p>
        <h1 class="font-display text-5xl uppercase tracking-tight text-ink sm:text-6xl">Menu Admin</h1>
        <p class="chalk-text text-2xl leading-none text-chalk">Sign in with the shared code before you upload a new menu.</p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="mb-2 block text-sm uppercase tracking-[0.24em] text-chalk">Access code</span>
          <input
            v-model="code"
            class="w-full rounded-[1.5rem] border border-white/70 bg-white/5 px-5 py-4 text-xl text-ink outline-none transition focus:border-moss focus:bg-white/10"
            type="password"
            autocomplete="current-password"
            required
          >
        </label>

        <label class="flex gap-3 rounded-[1.5rem] border border-white/15 bg-white/[0.03] p-4 text-chalk">
          <input v-model="trustBrowser" class="mt-1 size-4 accent-moss" type="checkbox">
          <span>
            <span class="block font-display text-xl uppercase tracking-tight text-ink">Trust this browser</span>
            <span class="chalk-text text-xl leading-none">Only use this on a personal device.</span>
          </span>
        </label>

        <p v-if="props.error" class="chalk-text text-2xl leading-none text-rose">{{ props.error }}</p>

        <button class="sketch-button-primary w-full font-display text-xl uppercase tracking-[0.14em]" :disabled="props.busy" type="submit">
          {{ props.busy ? 'Checking...' : 'Continue' }}
        </button>
      </form>
    </div>
  </section>
</template>
