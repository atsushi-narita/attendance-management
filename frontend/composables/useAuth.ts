import type { LoginCredentials } from '~/types/auth'

export const useAuth = () => {
  const authStore = useAuthStore()

  // Reactive state
  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)
  const error = computed(() => authStore.error)

  // Role checks
  const isEmployee = computed(() => authStore.isEmployee)
  const isManager = computed(() => authStore.isManager)
  const isAdmin = computed(() => authStore.isAdmin)

  // Actions
  const login = async (credentials: LoginCredentials) => {
    await authStore.login(credentials)
  }

  const logout = async () => {
    await authStore.logout()
  }

  const checkAuthState = async () => {
    await authStore.checkAuthState()
  }

  const clearError = () => {
    authStore.clearError()
  }

  const hasRole = (role: string): boolean => {
    return authStore.hasRole(role)
  }

  // Check if user can access admin features
  const canAccessAdmin = computed(() => {
    return isAdmin.value
  })

  // Check if user can manage employees
  const canManageEmployees = computed(() => {
    return isAdmin.value || isManager.value
  })

  // Check if user can approve corrections
  const canApproveCorrections = computed(() => {
    return isAdmin.value || isManager.value
  })

  return {
    // State
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Role checks
    isEmployee: readonly(isEmployee),
    isManager: readonly(isManager),
    isAdmin: readonly(isAdmin),
    canAccessAdmin: readonly(canAccessAdmin),
    canManageEmployees: readonly(canManageEmployees),
    canApproveCorrections: readonly(canApproveCorrections),
    
    // Actions
    login,
    logout,
    checkAuthState,
    clearError,
    hasRole
  }
}