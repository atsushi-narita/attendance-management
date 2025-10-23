export interface User {
  id: string
  email: string
  employeeNumber: string
  role: UserRole
  name?: string
  groups: string[]
}

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  employeeNumber: string
  name: string
  role: UserRole
}