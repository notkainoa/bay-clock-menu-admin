<script setup lang="ts">
const props = withDefaults(defineProps<{
  inputId: string
  compact?: boolean
  busy?: boolean
  label: string
  subtitle: string
  helper?: string
}>(), {
  compact: false,
  busy: false,
  helper: 'pdf, jpg, jpeg',
})

const emit = defineEmits<{
  select: [file: File]
}>()

const dragging = ref(false)

function emitFile(file: File | null) {
  if (!file || props.busy) {
    return
  }

  emit('select', file)
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emitFile(target.files?.[0] || null)
  target.value = ''
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  emitFile(event.dataTransfer?.files?.[0] || null)
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.key === 'Enter' || event.key === ' ') && !props.busy) {
    event.preventDefault()
    document.getElementById(props.inputId)?.click()
  }
}
</script>

<template>
  <label
    :for="props.inputId"
    :class="[
      'block cursor-pointer rounded-[2rem] border-2 border-dashed border-[#7f8daa] bg-[#0b1324]/55 transition',
      props.compact ? 'px-5 py-4' : 'px-6 py-12 sm:px-10 sm:py-16',
      dragging ? 'border-[#7eb6ff] bg-[#10203d]' : 'hover:border-[#9eabc4] hover:bg-[#0f182d]',
    ]"
    role="button"
    tabindex="0"
    @dragenter.prevent="dragging = true"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop="handleDrop"
    @keydown="handleKeydown"
  >
    <input :id="props.inputId" class="sr-only" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" @change="handleInput">

    <div :class="props.compact ? 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between' : 'flex flex-col items-center gap-4 text-center'">
      <div class="flex items-center gap-4">
        <Icon name="upload" class="size-8 text-[#dfe8f8]" />
        <div>
          <div class="font-display text-2xl tracking-tight text-white sm:text-3xl">{{ props.label }}</div>
          <div class="text-base text-[#95a6c7]">{{ props.subtitle }}</div>
        </div>
      </div>

      <div :class="props.compact ? 'flex items-center gap-3' : 'flex flex-col items-center gap-3'">
        <span class="sketch-button inline-flex items-center gap-2 text-base">
          <Icon name="folder" class="size-5" />
          {{ props.busy ? 'Working...' : 'Browse files' }}
        </span>
        <span class="text-sm text-[#95a6c7]">{{ props.helper }}</span>
      </div>
    </div>
  </label>
</template>
