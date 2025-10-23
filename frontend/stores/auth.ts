import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { defineStore } from 'pinia'
import type { AuthState, LoginCredentials, UserRole } from '~/types/auth'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  }),

  getters: {
    isEmployee: (state): boolean => {
      return state.user?.role === 'EMPLOYEE' || state.user?.groups.includes('employees') || false
    },

    isManager: (state): boolean => {
      return state.user?.role === 'MANAGER' || state.user?.groups.includes('managers') || false
    },

    isAdmin: (state): boolean => {
      return state.user?.role === 'ADMIN' || state.user?.groups.includes('admins') || false
    },

    hasRole: (state) => (role: string): boolean => {
      return state.user?.groups.includes(role) || false
    }
  },

  actions: {
    async login(credentials: LoginCredentials): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        const { isSignedIn } = await signIn({
          username: credentials.email,
          password: credentials.password
        })

        if (isSignedIn) {
          await this.fetchCurrentUser()
        }
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async logout(): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        await signOut()
        this.user = null
        this.isAuthenticated = false
        
        // Redirect to login page
        await navigateTo('/login')
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchCurrentUser(): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        const authUser = await getCurrentUser()
        const session = await fetchAuthSession()
        
        if (authUser && session.tokens) {
          const idToken = session.tokens.idToken
          const groups = idToken?.payload['cognito:groups'] as string[] || []
          
          this.user = {
            id: authUser.userId,
            email: authUser.signInDetails?.loginId || '',
            employeeNumber: authUser.attributes?.['custom:employee_number'] || '',
            role: authUser.attributes?.['custom:role'] as UserRole || 'EMPLOYEE',
            name: authUser.attributes?.name,
            groups
          }
          
          this.isAuthenticated = true
        }
      } catch (error: any) {
        this.user = null
        this.isAuthenticated = false
        this.error = this.getErrorMessage(error)
      } finally {
        this.isLoading = false
      }
    },

    async checkAuthState(): Promise<void> {
      try {
        await this.fetchCurrentUser()
      } catch (error) {
        // User is not authenticated, which is fine
        this.user = null
        this.isAuthenticated = false
      }
    },

    clearError(): void {
      this.error = null
    },

    getErrorMessage(error: any): string {
      if (error.name === 'NotAuthorizedException') {
        return 'メールアドレスまたはパスワードが正しくありません'
      } else if (error.name === 'UserNotConfirmedException') {
        return 'アカウントの確認が完了していません'
      } else if (error.name === 'UserNotFoundException') {
        return 'ユーザーが見つかりません'
      } else if (error.name === 'TooManyRequestsException') {
        return 'リクエストが多すぎます。しばらく待ってから再試行してください'
      } else if (error.name === 'NetworkError') {
        return 'ネットワークエラーが発生しました'
      } else {
        return error.message || '認証エラーが発生しました'
      }
    }
  }
})