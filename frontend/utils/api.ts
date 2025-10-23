import type { FetchOptions } from 'ofetch'

export class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor() {
    const config = useRuntimeConfig()
    this.baseURL = config.public.apiGatewayUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error('User not authenticated')
    }

    // In a real implementation, this would get the JWT token from AWS Cognito
    // For now, we'll use a placeholder
    return {
      'Authorization': `Bearer ${authStore.user.id}`,
      'X-Employee-Id': authStore.user.employeeNumber
    }
  }

  private async request<T>(
    endpoint: string, 
    options: FetchOptions = {}
  ): Promise<T> {
    const authHeaders = await this.getAuthHeaders()
    
    const requestOptions: FetchOptions = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...authHeaders,
        ...options.headers
      }
    }

    try {
      const response = await $fetch<T>(`${this.baseURL}${endpoint}`, requestOptions)
      return response
    } catch (error: any) {
      // Transform fetch errors into a consistent format
      if (error.response) {
        throw {
          statusCode: error.response.status,
          data: error.response._data,
          message: error.response._data?.message || error.message
        }
      }
      throw error
    }
  }

  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined 
    })
  }

  async put<T>(endpoint: string, body?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined 
    })
  }

  async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create a singleton instance
let apiClient: ApiClient | null = null

export const useApiClient = (): ApiClient => {
  if (!apiClient) {
    apiClient = new ApiClient()
  }
  return apiClient
}