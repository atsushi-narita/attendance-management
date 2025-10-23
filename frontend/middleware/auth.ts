export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, checkAuthState } = useAuth()

  // Check authentication state on client side
  if (process.client) {
    // If not authenticated, redirect to login
    if (!isAuthenticated.value) {
      return navigateTo('/login')
    }
  }
})