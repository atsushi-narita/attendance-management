export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, canAccessAdmin } = useAuth()

  // Check authentication first
  if (process.client) {
    if (!isAuthenticated.value) {
      return navigateTo('/login')
    }

    // Check admin permissions
    if (!canAccessAdmin.value) {
      throw createError({
        statusCode: 403,
        statusMessage: 'アクセス権限がありません'
      })
    }
  }
})