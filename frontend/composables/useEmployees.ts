import type { UserRole } from '~/types/auth'
import type {
    Employee,
    EmployeeCreateRequest,
    EmployeeUpdateRequest,
    EmployeesFilter,
    EmployeesListResponse,
    EmployeesSortOptions
} from '~/types/employee'

export const useEmployees = () => {
  // State
  const employees = ref<Employee[]>([])
  const selectedEmployee = ref<Employee | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  
  // Filters and sorting
  const currentFilters = ref<EmployeesFilter>({})
  const currentSort = ref<EmployeesSortOptions>({
    field: 'name',
    direction: 'asc'
  })

  // Auth store
  const authStore = useAuthStore()

  // Computed
  const hasEmployees = computed(() => employees.value.length > 0)
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))
  const canManageEmployees = computed(() => authStore.isAdmin)

  // API methods
  const fetchEmployees = async (
    page: number = currentPage.value,
    filters: EmployeesFilter = currentFilters.value,
    sort: EmployeesSortOptions = currentSort.value
  ): Promise<void> => {
    if (!canManageEmployees.value) {
      error.value = '従業員管理の権限がありません'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.value.toString(),
        sortField: sort.field,
        sortDirection: sort.direction
      })

      // Add filters
      if (filters.name) {
        params.append('name', filters.name)
      }
      if (filters.employeeNumber) {
        params.append('employeeNumber', filters.employeeNumber)
      }
      if (filters.role) {
        params.append('role', filters.role)
      }

      const response = await $api<EmployeesListResponse>(`/api/employees?${params}`)
      
      employees.value = response.employees
      totalCount.value = response.totalCount
      currentPage.value = response.page
      currentFilters.value = filters
      currentSort.value = sort
    } catch (err: any) {
      error.value = err.message || '従業員一覧の取得に失敗しました'
      employees.value = []
      totalCount.value = 0
    } finally {
      isLoading.value = false
    }
  }

  const fetchEmployeeById = async (id: number): Promise<Employee | null> => {
    if (!canManageEmployees.value) {
      error.value = '従業員管理の権限がありません'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const employee = await $api<Employee>(`/api/employees/${id}`)
      selectedEmployee.value = employee
      return employee
    } catch (err: any) {
      error.value = err.message || '従業員情報の取得に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createEmployee = async (employeeData: EmployeeCreateRequest): Promise<Employee | null> => {
    if (!canManageEmployees.value) {
      error.value = '従業員管理の権限がありません'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const newEmployee = await $api<Employee>('/api/employees', {
        method: 'POST',
        body: employeeData
      })

      // Add to local state
      employees.value.unshift(newEmployee)
      totalCount.value += 1

      return newEmployee
    } catch (err: any) {
      error.value = err.message || '従業員の登録に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateEmployee = async (id: number, employeeData: EmployeeUpdateRequest): Promise<Employee | null> => {
    if (!canManageEmployees.value) {
      error.value = '従業員管理の権限がありません'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const updatedEmployee = await $api<Employee>(`/api/employees/${id}`, {
        method: 'PUT',
        body: employeeData
      })

      // Update local state
      const index = employees.value.findIndex(emp => emp.id === id)
      if (index !== -1) {
        employees.value[index] = updatedEmployee
      }

      if (selectedEmployee.value?.id === id) {
        selectedEmployee.value = updatedEmployee
      }

      return updatedEmployee
    } catch (err: any) {
      error.value = err.message || '従業員情報の更新に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteEmployee = async (id: number): Promise<boolean> => {
    if (!canManageEmployees.value) {
      error.value = '従業員管理の権限がありません'
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      await $api(`/api/employees/${id}`, {
        method: 'DELETE'
      })

      // Remove from local state
      employees.value = employees.value.filter(emp => emp.id !== id)
      totalCount.value -= 1

      if (selectedEmployee.value?.id === id) {
        selectedEmployee.value = null
      }

      return true
    } catch (err: any) {
      error.value = err.message || '従業員の削除に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const deleteMultipleEmployees = async (ids: number[]): Promise<boolean> => {
    if (!canManageEmployees.value) {
      error.value = '従業員管理の権限がありません'
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      await $api('/api/employees/bulk-delete', {
        method: 'POST',
        body: { ids }
      })

      // Remove from local state
      employees.value = employees.value.filter(emp => !ids.includes(emp.id))
      totalCount.value -= ids.length

      if (selectedEmployee.value && ids.includes(selectedEmployee.value.id)) {
        selectedEmployee.value = null
      }

      return true
    } catch (err: any) {
      error.value = err.message || '従業員の一括削除に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Filter and sort methods
  const applyFilters = async (filters: EmployeesFilter): Promise<void> => {
    currentPage.value = 1
    await fetchEmployees(1, filters, currentSort.value)
  }

  const sortBy = async (field: EmployeesSortOptions['field'], direction: EmployeesSortOptions['direction']): Promise<void> => {
    const sort: EmployeesSortOptions = { field, direction }
    await fetchEmployees(currentPage.value, currentFilters.value, sort)
  }

  const goToPage = async (page: number): Promise<void> => {
    if (page >= 1 && page <= totalPages.value) {
      await fetchEmployees(page, currentFilters.value, currentSort.value)
    }
  }

  // Utility methods
  const refreshEmployees = async (): Promise<void> => {
    await fetchEmployees(currentPage.value, currentFilters.value, currentSort.value)
  }

  const clearError = (): void => {
    error.value = null
  }

  const clearSelection = (): void => {
    selectedEmployee.value = null
  }

  const getRoleDisplayName = (role: UserRole): string => {
    const { t } = useI18n()
    switch (role) {
      case 'EMPLOYEE':
        return t('employee.roles.employee')
      case 'MANAGER':
        return t('employee.roles.manager')
      case 'ADMIN':
        return t('employee.roles.admin')
      default:
        return role
    }
  }

  const validateRequiredHours = (hours: number): boolean => {
    return hours >= 140 && hours <= 180
  }

  return {
    // State
    employees: readonly(employees),
    selectedEmployee: readonly(selectedEmployee),
    isLoading: readonly(isLoading),
    error: readonly(error),
    totalCount: readonly(totalCount),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    currentFilters: readonly(currentFilters),
    currentSort: readonly(currentSort),

    // Computed
    hasEmployees,
    totalPages,
    canManageEmployees,

    // Methods
    fetchEmployees,
    fetchEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deleteMultipleEmployees,
    applyFilters,
    sortBy,
    goToPage,
    refreshEmployees,
    clearError,
    clearSelection,
    getRoleDisplayName,
    validateRequiredHours
  }
}