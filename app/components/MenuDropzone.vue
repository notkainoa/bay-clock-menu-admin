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
      'block cursor-pointer rounded-sm border border-dashed transition',
      props.compact ? 'px-3 py-3' : 'px-4 py-10',
      dragging
        ? 'border-accent bg-accent/5'
        : 'border-border hover:border-text-muted hover:bg-surface-raised',
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

    <div :class="props.compact ? 'flex items-center justify-between gap-3' : 'flex flex-col items-center gap-3 text-center'">
      <div class="flex items-center gap-3">
        <Icon name="upload" class="size-6 shrink-0 text-text-secondary" />
        <div>
          <div :class="props.compact ? 'text-sm text-text-primary' : 'text-base text-text-primary'">{{ props.label }}</div>
          <div :class="props.compact ? 'text-xs text-text-muted' : 'mt-0.5 text-xs text-text-muted'">{{ props.subtitle }}</div>
        </div>
      </div>

      <span :class="props.compact ? 'btn text-xs' : 'btn text-sm'">
        <Icon name="folder" class="size-3.5" />
        {{ props.busy ? 'Working...' : 'Browse' }}
      </span>
    </div>
  </label>
</template>
