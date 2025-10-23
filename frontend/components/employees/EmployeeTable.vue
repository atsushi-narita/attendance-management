<template>
  <div class="employee-table">
    <!-- Table Header with Filters -->
    <div class="table-header">
      <div class="table-title">
        <h2 class="title2">{{ $t('employee.employeeList') }}</h2>
        <p class="subhead">{{ totalEmployeesText }}</p>
      </div>
      
      <div class="table-filters">
        <div class="filter-group">
          <Input
            v-model="filterName"
            :label="$t('employee.name')"
            :placeholder="$t('employee.searchByName')"
            size="small"
          />
          <Input
            v-model="filterEmployeeNumber"
            :label="$t('employee.employeeNumber')"
            :placeholder="$t('employee.searchByNumber')"
            size="small"
          />
          <div class="role-filter">
            <label class="filter-label">{{ $t('employee.role') }}</label>
            <select v-model="filterRole" class="role-select">
              <option value="">{{ $t('common.all') }}</option>
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ getRoleDisplayName(role) }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="filter-actions">
          <Button
            variant="secondary"
            size="small"
            @click="resetFilters"
          >
            {{ $t('common.reset') }}
          </Button>
          <Button
            variant="primary"
            size="small"
            @click="applyFilters"
          >
            {{ $t('common.filter') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedEmployees.length > 0" class="bulk-actions">
      <div class="selection-info">
        <span class="body">
          {{ $t('employee.selectedCount', { count: selectedEmployees.length }) }}
        </span>
      </div>
      
      <div class="bulk-buttons">
        <Button
          variant="secondary"
          size="small"
          @click="clearSelection"
        >
          {{ $t('common.clearSelection') }}
        </Button>
        <Button
          variant="destructive"
          size="small"
          @click="handleBulkDelete"
          :disabled="isLoading"
        >
          <Icon name="trash" size="16" />
          {{ $t('common.delete') }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="body">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="body text-error">{{ error }}</p>
      <Button variant="secondary" @click="fetchEmployees">
        {{ $t('common.retry') }}
      </Button>
    </div>

    <!-- Empty State -->
    <div v-else-if="employees.length === 0" class="empty-state">
      <Icon name="person.3" size="48" />
      <p class="headline">{{ $t('employee.noEmployees') }}</p>
      <p class="subhead">{{ $t('employee.noEmployeesMessage') }}</p>
    </div>

    <!-- Employees Table -->
    <div v-else class="table-container">
      <table class="employees-table">
        <thead>
          <tr>
            <th class="checkbox-column">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isPartiallySelected"
                @change="toggleSelectAll"
                class="checkbox"
              />
            </th>
            <th @click="sortBy('name')" class="sortable">
              <div class="header-content">
                {{ $t('employee.name') }}
                <Icon 
                  v-if="sortField === 'name'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('employeeNumber')" class="sortable">
              <div class="header-content">
                {{ $t('employee.employeeNumber') }}
                <Icon 
                  v-if="sortField === 'employeeNumber'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('role')" class="sortable">
              <div class="header-content">
                {{ $t('employee.role') }}
                <Icon 
                  v-if="sortField === 'role'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('requiredMonthlyHours')" class="sortable">
              <div class="header-content">
                {{ $t('employee.requiredMonthlyHours') }}
                <Icon 
                  v-if="sortField === 'requiredMonthlyHours'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('createdAt')" class="sortable">
              <div class="header-content">
                {{ $t('employee.createdAt') }}
                <Icon 
                  v-if="sortField === 'createdAt'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th>{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="employee in employees" :key="employee.id" class="employee-row">
            <td class="checkbox-column">
              <input
                type="checkbox"
                :checked="selectedEmployees.includes(employee.id)"
                @change="toggleEmployeeSelection(employee.id)"
                class="checkbox"
              />
            </td>
            <td class="name-cell">
              <div class="employee-info">
                <span class="body">{{ employee.name }}</span>
              </div>
            </td>
            <td class="number-cell">
              <span class="body">{{ employee.employeeNumber }}</span>
            </td>
            <td class="role-cell">
              <div class="role-badge" :class="`role-badge--${employee.role.toLowerCase()}`">
                <Icon :name="getRoleIcon(employee.role)" size="16" />
                <span class="caption1">{{ getRoleDisplayName(employee.role) }}</span>
              </div>
            </td>
            <td class="hours-cell">
              <span class="body">{{ employee.requiredMonthlyHours }}h</span>
            </td>
            <td class="date-cell">
              <span class="body">{{ formatDate(employee.createdAt) }}</span>
            </td>
            <td class="actions-cell">
              <div class="action-buttons">
                <Button
                  variant="ghost"
                  size="small"
                  @click="handleEdit(employee)"
                >
                  <Icon name="pencil" size="16" />
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  @click="handleDelete(employee)"
                  class="delete-button"
                >
                  <Icon name="trash" size="16" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <Button
        variant="ghost"
        size="small"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        <Icon name="chevron.left" size="16" />
        {{ $t('common.previous') }}
      </Button>
      
      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          :class="['page-number', { 'page-number--active': page === currentPage }]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </div>
      
      <Button
        variant="ghost"
        size="small"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        {{ $t('common.next') }}
        <Icon name="chevron.right" size="16" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserRole } from '~/types/auth'
import type { Employee, EmployeesFilter, EmployeesSortOptions } from '~/types/employee'

interface Props {
  employees: Employee[]
  isLoading?: boolean
  error?: string | null
  totalCount?: number
  currentPage?: number
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20
})

const emit = defineEmits<{
  'update:filters': [filters: EmployeesFilter]
  'update:sort': [sort: EmployeesSortOptions]
  'update:page': [page: number]
  'refresh': []
  'edit': [employee: Employee]
  'delete': [employee: Employee]
  'bulk-delete': [employeeIds: number[]]
}>()

// Filter state
const filterName = ref('')
const filterEmployeeNumber = ref('')
const filterRole = ref<UserRole | ''>('')

// Sort state
const sortField = ref<EmployeesSortOptions['field']>('name')
const sortDirection = ref<EmployeesSortOptions['direction']>('asc')

// Selection state
const selectedEmployees = ref<number[]>([])

// Computed properties
const { getRoleDisplayName } = useEmployees()
const { formatDate } = useDateTime()
const { t } = useI18n()

const availableRoles: UserRole[] = ['EMPLOYEE', 'MANAGER', 'ADMIN']

const totalPages = computed(() => Math.ceil(props.totalCount / props.pageSize))

const totalEmployeesText = computed(() => {
  return t('employee.totalEmployees', { count: props.totalCount })
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.currentPage - 2)
  const end = Math.min(totalPages.value, props.currentPage + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const isAllSelected = computed(() => {
  return props.employees.length > 0 && selectedEmployees.value.length === props.employees.length
})

const isPartiallySelected = computed(() => {
  return selectedEmployees.value.length > 0 && selectedEmployees.value.length < props.employees.length
})

// Methods
const sortBy = (field: EmployeesSortOptions['field']) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
  
  emit('update:sort', {
    field: sortField.value,
    direction: sortDirection.value
  })
}

const applyFilters = () => {
  const filters: EmployeesFilter = {}
  
  if (filterName.value.trim()) {
    filters.name = filterName.value.trim()
  }
  
  if (filterEmployeeNumber.value.trim()) {
    filters.employeeNumber = filterEmployeeNumber.value.trim()
  }
  
  if (filterRole.value) {
    filters.role = filterRole.value
  }
  
  emit('update:filters', filters)
}

const resetFilters = () => {
  filterName.value = ''
  filterEmployeeNumber.value = ''
  filterRole.value = ''
  
  emit('update:filters', {})
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:page', page)
  }
}

const fetchEmployees = () => {
  emit('refresh')
}

const getRoleIcon = (role: UserRole): string => {
  switch (role) {
    case 'EMPLOYEE':
      return 'person.fill'
    case 'MANAGER':
      return 'person.2.fill'
    case 'ADMIN':
      return 'person.badge.key.fill'
    default:
      return 'person.fill'
  }
}

// Selection methods
const toggleEmployeeSelection = (employeeId: number) => {
  const index = selectedEmployees.value.indexOf(employeeId)
  if (index > -1) {
    selectedEmployees.value.splice(index, 1)
  } else {
    selectedEmployees.value.push(employeeId)
  }
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedEmployees.value = []
  } else {
    selectedEmployees.value = props.employees.map(emp => emp.id)
  }
}

const clearSelection = () => {
  selectedEmployees.value = []
}

// Action handlers
const handleEdit = (employee: Employee) => {
  emit('edit', employee)
}

const handleDelete = (employee: Employee) => {
  emit('delete', employee)
}

const handleBulkDelete = () => {
  if (selectedEmployees.value.length > 0) {
    emit('bulk-delete', [...selectedEmployees.value])
  }
}

// Watch for employee changes to clear invalid selections
watch(() => props.employees, (newEmployees) => {
  const validIds = newEmployees.map(emp => emp.id)
  selectedEmployees.value = selectedEmployees.value.filter(id => validIds.includes(id))
})
</script>

<style scoped>
.employee-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.table-title {
  flex: 1;
}

.table-filters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 400px;
}

.filter-group {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-md);
}

.role-filter {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-label {
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
}

.role-select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  min-height: var(--touch-target-min);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-primary);
}

.selection-info {
  color: var(--color-primary);
  font-weight: var(--font-weight-headline);
}

.bulk-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-surface-secondary);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.employees-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-surface);
}

.employees-table th {
  background-color: var(--color-surface-secondary);
  padding: var(--spacing-md);
  text-align: left;
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.employees-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.employees-table th.sortable:hover {
  background-color: var(--color-surface-tertiary);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.employees-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.employee-row:hover {
  background-color: var(--color-surface-secondary);
}

.checkbox-column {
  width: 40px;
  text-align: center;
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.name-cell {
  min-width: 150px;
}

.number-cell {
  min-width: 120px;
  font-variant-numeric: tabular-nums;
}

.role-cell {
  min-width: 120px;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-headline);
}

.role-badge--employee {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--color-success);
}

.role-badge--manager {
  background-color: rgba(255, 149, 0, 0.1);
  color: var(--color-warning);
}

.role-badge--admin {
  background-color: rgba(255, 59, 48, 0.1);
  color: var(--color-error);
}

.hours-cell {
  min-width: 100px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.date-cell {
  min-width: 120px;
}

.actions-cell {
  min-width: 100px;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.delete-button:hover {
  color: var(--color-error);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) 0;
}

.page-numbers {
  display: flex;
  gap: var(--spacing-sm);
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-subhead);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-number:hover {
  background-color: var(--color-surface-secondary);
  color: var(--color-text-primary);
}

.page-number--active {
  background-color: var(--color-primary);
  color: white;
}

.page-number--active:hover {
  background-color: var(--color-primary-dark);
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-filters {
    min-width: auto;
  }
  
  .filter-group {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }
  
  .bulk-buttons {
    justify-content: center;
  }
  
  .employees-table th,
  .employees-table td {
    padding: var(--spacing-sm);
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
}
</style>