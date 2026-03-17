import type { SessionPayload } from '../types/menu-admin'

export default defineNuxtRouteMiddleware(async to => {
  if (to.path === '/') {
    return
  }

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const session = await $fetch<SessionPayload>('/api/session', { headers })

  if (!session.authenticated) {
    return navigateTo('/')
  }
})
