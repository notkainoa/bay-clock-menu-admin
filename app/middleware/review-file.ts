export default defineNuxtRouteMiddleware(() => {
  const menuAdmin = useMenuAdmin()

  if (!menuAdmin.selectedFile.value || !menuAdmin.preview.value) {
    return navigateTo('/upload?error=lost-upload')
  }
})
