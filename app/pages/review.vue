<script setup lang="ts">
definePageMeta({
  middleware: ['authenticated', 'review-file'],
})

const menuAdmin = useMenuAdmin()
const runtimeConfig = useRuntimeConfig()

const liveMenuUrl = computed(() =>
  `https://raw.githubusercontent.com/${runtimeConfig.public.githubOwner}/${runtimeConfig.public.githubRepo}/${runtimeConfig.public.githubDefaultBranch}/public/menu/menu.jpg?t=${menuAdmin.reviewNonce.value}`,
)

const previewMeta = computed(() => {
  if (!menuAdmin.preview.value || !menuAdmin.selectedFile.value) {
    return ''
  }

  return menuAdmin.selectedFile.value.name
})

async function handleReplace(file: File) {
  try {
    await menuAdmin.selectFile(file)
  }
  catch (error) {
    menuAdmin.setReviewError(readApiError(error, 'Unable to update preview'))
  }
}

async function handleConfirm() {
  if (!menuAdmin.selectedFile.value || menuAdmin.confirmBusy.value) {
    return
  }

  menuAdmin.confirmBusy.value = true
  menuAdmin.setReviewError('')

  try {
    const formData = new FormData()
    formData.set('file', menuAdmin.selectedFile.value, menuAdmin.selectedFile.value.name)

    const result = await $fetch<{
      uploadCommitSha: string
    }>('/api/confirm-upload', {
      method: 'POST',
      body: formData,
    })

    menuAdmin.clearSelection()
    menuAdmin.confirmBusy.value = false
    await navigateTo(`/status?commit=${encodeURIComponent(result.uploadCommitSha)}`)
  }
  catch (error) {
    menuAdmin.setReviewError(readApiError(error, 'Upload failed'))
    menuAdmin.confirmBusy.value = false
  }
}

async function chooseAnother() {
  await navigateTo('/upload')
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

    <div class="mt-4 space-y-4">
      <MenuDropzone
        input-id="replace-upload"
        compact
        :busy="menuAdmin.previewBusy.value || menuAdmin.confirmBusy.value"
        label="Use different menu file"
        subtitle="pdf, jpg, jpeg"
        @select="handleReplace"
      />

      <ReviewWorkspace
        v-if="menuAdmin.preview.value"
        :live-src="liveMenuUrl"
        :preview-src="menuAdmin.preview.value.src"
        :preview-meta="previewMeta"
      />

    </div>

    <!-- Spacer so content scrolls clear of the fixed action bar -->
    <div class="h-20" />

    <div class="fixed inset-x-0 bottom-0 z-50">
      <div class="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-4">
        <p v-if="menuAdmin.reviewError.value" class="text-xs text-danger">{{ menuAdmin.reviewError.value }}</p>

        <div class="flex gap-2">
          <button class="btn text-xs" type="button" @click="chooseAnother">
            Cancel
          </button>
          <button class="btn-primary text-xs" :disabled="menuAdmin.confirmBusy.value" type="button" @click="handleConfirm">
            {{ menuAdmin.confirmBusy.value ? 'Publishing...' : 'Confirm change' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
