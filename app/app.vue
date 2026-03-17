<template>
  <div class="min-h-screen bg-void text-ink">
    <NuxtLoadingIndicator color="#3da24d" :height="3" />
    <div class="pointer-events-none fixed inset-0 opacity-80">
      <div class="absolute inset-6 rounded-[2.5rem] border border-white/75 md:inset-10" />
      <div class="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_65%)]" />
    </div>
    <NuxtPage />
  </div>
</template>
