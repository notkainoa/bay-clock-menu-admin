<script setup lang="ts">
definePageMeta({
  middleware: ['authenticated'],
})

const route = useRoute()
const menuAdmin = useMenuAdmin()

const pageError = computed(() => route.query.error === 'lost-upload'
  ? 'That local file was lost after refresh. Pick it again before reviewing.'
  : '')

async function handleSelect(file: File) {
  try {
    await menuAdmin.selectFile(file)
    await navigateTo('/review')
  }
  catch (error) {
    menuAdmin.setUploadError(readApiError(error, 'Unable to prepare preview'))
  }
}

async function logout() {
  await $fetch('/api/logout', { method: 'POST' })
  menuAdmin.clearSelection()
  await navigateTo('/')
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-7 sm:px-8 sm:py-10">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-chalk">Bay Clock</p>
        <h1 class="font-display text-4xl uppercase tracking-tight text-ink sm:text-5xl">Menu Admin</h1>
      </div>
      <button class="sketch-button inline-flex items-center gap-2 chalk-text text-2xl leading-none" type="button" @click="logout">
        <Icon name="logout" class="size-5" />
        Log out
      </button>
    </div>

    <section class="sketch-card flex flex-1 flex-col justify-center p-6 sm:p-10">
      <MenuDropzone
        input-id="menu-upload"
        :busy="menuAdmin.previewBusy.value"
        label="Drop menu here"
        subtitle="pdf, jpg, jpeg"
        helper="Nothing gets written until you confirm the review."
        @select="handleSelect"
      />

      <div class="mt-5 space-y-2">
        <p class="chalk-text text-2xl leading-none text-chalk">Accepted types: PDF, JPG, JPEG.</p>
        <p v-if="pageError || menuAdmin.uploadError.value" class="chalk-text text-2xl leading-none text-rose">
          {{ pageError || menuAdmin.uploadError.value }}
        </p>
      </div>
    </section>
  </main>
</template>
