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
  <main class="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-5 py-8 sm:px-8 sm:py-10">
    <div class="mb-8 flex items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-[#95a6c7]">Bay Clock</p>
        <h1 class="font-display text-4xl tracking-tight text-white sm:text-5xl">Menu Admin</h1>
      </div>
      <button class="sketch-button inline-flex items-center gap-2 text-sm" type="button" @click="logout">
        <Icon name="logout" class="size-5" />
        Log out
      </button>
    </div>

    <section class="flex flex-1 flex-col justify-center rounded-[2rem] border border-white/10 bg-[#3f4c65]/20 p-6 sm:p-10">
      <MenuDropzone
        input-id="menu-upload"
        :busy="menuAdmin.previewBusy.value"
        label="Drop menu here"
        subtitle="PDF, JPG, JPEG"
        helper="Nothing gets written until you confirm the review."
        @select="handleSelect"
      />

      <div class="mt-5 space-y-2">
        <p class="text-sm text-[#95a6c7]">Accepted types: PDF, JPG, JPEG.</p>
        <p v-if="pageError || menuAdmin.uploadError.value" class="text-sm text-[#f2a8ae]">
          {{ pageError || menuAdmin.uploadError.value }}
        </p>
      </div>
    </section>
  </main>
</template>
