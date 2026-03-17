<script setup lang="ts">
import { FolderOpen, ImageUp, LogOut, PanelsTopLeft, SlidersHorizontal, TriangleAlert, Upload, View } from 'lucide-vue-next'

const props = defineProps<{
  name: 'upload' | 'folder' | 'logout' | 'split' | 'slider' | 'warning' | 'view'
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
} as const

const icon = computed(() => icons[props.name])
</script>

<template>
  <component :is="icon" :class="props.class" />
</template>
