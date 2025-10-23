import type { UserRole } from './auth'

export interface Employee {
  id: number
  name: string
  employeeNumber: string
  requiredMonthlyHours: number
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface EmployeeCreateRequest {
  name: string
  employeeNumber: string
  requiredMonthlyHours: number
  role: UserRole
}

export interface EmployeeUpdateRequest {
  name?: string
  employeeNumber?: string
  requiredMonthlyHours?: number
  role?: UserRole
}

export interface EmployeesListResponse {
  employees: Employee[]
  totalCount: number
  page: number
  pageSize: number
}

export interface EmployeesFilter {
  name?: string
  employeeNumber?: string
  role?: UserRole
}

export interface EmployeesSortOptions {
  field: 'name' | 'employeeNumber' | 'role' | 'requiredMonthlyHours' | 'createdAt'
  direction: 'asc' | 'desc'
}

export interface EmployeeFormData {
  name: string
  employeeNumber: string
  requiredMonthlyHours: number
  role: UserRole
}

export interface EmployeeValidationErrors {
  name?: string
  employeeNumber?: string
  requiredMonthlyHours?: string
  role?: string
}