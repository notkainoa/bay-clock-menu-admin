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

  const kindLabel = menuAdmin.preview.value.kind === 'pdf' ? 'PDF preview' : 'JPG preview'
  return `${menuAdmin.selectedFile.value.name} · ${kindLabel}`
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
  <main class="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-7 sm:px-8 sm:py-10">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-chalk">Review</p>
        <h1 class="font-display text-4xl uppercase tracking-tight text-ink sm:text-5xl">Compare before publish</h1>
      </div>
      <button class="sketch-button inline-flex items-center gap-2 chalk-text text-2xl leading-none" type="button" @click="logout">
        <Icon name="logout" class="size-5" />
        Log out
      </button>
    </div>

    <section class="sketch-card flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <MenuDropzone
        input-id="replace-upload"
        compact
        :busy="menuAdmin.previewBusy.value || menuAdmin.confirmBusy.value"
        label="Upload different menu"
        subtitle="pdf, jpg, jpeg"
        helper="Replace the current local preview before you publish."
        @select="handleReplace"
      />

      <ReviewWorkspace
        v-if="menuAdmin.preview.value"
        :live-src="liveMenuUrl"
        :preview-src="menuAdmin.preview.value.src"
        :preview-meta="previewMeta"
        :mode="menuAdmin.reviewMode.value"
        @update:mode="menuAdmin.reviewMode.value = $event"
      />

      <div class="mt-auto space-y-4">
        <p v-if="menuAdmin.reviewError.value" class="chalk-text text-2xl leading-none text-rose">{{ menuAdmin.reviewError.value }}</p>

        <div class="flex flex-col gap-3 sm:flex-row">
          <button class="sketch-button w-full chalk-text text-2xl leading-none sm:w-auto" type="button" @click="chooseAnother">
            Choose another file
          </button>
          <button class="sketch-button-primary w-full font-display text-xl uppercase tracking-[0.16em]" :disabled="menuAdmin.confirmBusy.value" type="button" @click="handleConfirm">
            {{ menuAdmin.confirmBusy.value ? 'Publishing...' : 'Commit & Deploy' }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
