<script setup lang="ts">
import { Check, FolderOpen, ImageUp, LoaderCircle, LogOut, PanelsTopLeft, SlidersHorizontal, TriangleAlert, Upload, View, X } from 'lucide-vue-next'

const props = defineProps<{
  name: 'upload' | 'folder' | 'logout' | 'split' | 'slider' | 'warning' | 'view' | 'spinner' | 'check' | 'close'
  class?: string
}>()

const icons = {
  upload: ImageUp,
  folder: FolderOpen,
  logout: LogOut,
  split: PanelsTopLeft,
  slider: SlidersHorizontal,
  warning: TriangleAlert,
  view: View,
  spinner: LoaderCircle,
  check: Check,
  close: X,
} as const

const icon = computed(() => icons[props.name])
</script>

<template>
  <component :is="icon" :class="props.class" />
</template>
