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
      'block cursor-pointer rounded-[2rem] border-4 border-dashed border-white/80 bg-white/[0.02] transition',
      props.compact ? 'px-5 py-4' : 'px-6 py-12 sm:px-10 sm:py-16',
      dragging ? 'border-moss bg-moss/10' : 'hover:bg-white/[0.05]',
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
        <Icon name="upload" class="size-8 text-ink" />
        <div>
          <div class="font-display text-2xl uppercase tracking-tight text-ink sm:text-3xl">{{ props.label }}</div>
          <div class="chalk-text text-2xl leading-none text-chalk">{{ props.subtitle }}</div>
        </div>
      </div>

      <div :class="props.compact ? 'flex items-center gap-3' : 'flex flex-col items-center gap-3'">
        <span class="sketch-button inline-flex items-center gap-2 chalk-text text-2xl leading-none">
          <Icon name="folder" class="size-5" />
          {{ props.busy ? 'Working...' : 'or browse' }}
        </span>
        <span class="chalk-text text-xl leading-none text-chalk">{{ props.helper }}</span>
      </div>
    </div>
  </label>
</template>
