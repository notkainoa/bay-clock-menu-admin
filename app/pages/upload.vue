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
  <main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">
    <header class="flex items-center justify-between border-b border-border pb-4">
      <div class="flex items-baseline gap-2">
        <span class="text-xs uppercase tracking-[0.15em] text-text-muted">Bay Clock Studio</span>
        <span class="text-xs text-text-muted">/</span>
        <h1 class="font-display text-base text-text-primary">Menu</h1>
      </div>
      <button class="btn-ghost text-xs" type="button" @click="logout">
        <Icon name="logout" class="size-3.5" />
        Log out
      </button>
    </header>

    <div class="flex flex-1 flex-col justify-center py-12">
      <div class="mx-auto w-full max-w-2xl space-y-4">
        <div class="mb-2">
          <h2 class="font-display text-xl text-text-primary">Upload menu</h2>
          <p class="mt-1 text-sm text-text-secondary">Drop a file below or browse to select. Nothing is written until you confirm.</p>
        </div>

        <MenuDropzone
          input-id="menu-upload"
          :busy="menuAdmin.previewBusy.value"
          label="Drop menu here"
          subtitle="PDF, JPG, JPEG — max 15 MB"
          @select="handleSelect"
        />

        <p v-if="pageError || menuAdmin.uploadError.value" class="text-xs text-danger">
          {{ pageError || menuAdmin.uploadError.value }}
        </p>
      </div>
    </div>
  </main>
</template>
