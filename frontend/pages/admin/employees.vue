<template>
  <div class="employees-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="large-title">{{ $t('employee.title') }}</h1>
        <p class="subhead">{{ $t('employee.description') }}</p>
      </div>
      
      <div class="header-actions">
        <Button
          variant="secondary"
          @click="refreshEmployees"
          :disabled="isLoading"
        >
          <Icon name="arrow.clockwise" size="16" />
          {{ $t('common.refresh') }}
        </Button>
        
        <Button
          variant="primary"
          @click="openCreateModal"
        >
          <Icon name="plus" size="16" />
          {{ $t('employee.addEmployee') }}
        </Button>
      </div>
    </div>

    <!-- Employee Table -->
    <EmployeeTable
      :employees="employees"
      :is-loading="isLoading"
      :error="error"
      :total-count="totalCount"
      :current-page="currentPage"
      :page-size="pageSize"
      @update:filters="handleFiltersUpdate"
      @update:sort="handleSortUpdate"
      @update:page="handlePageUpdate"
      @refresh="refreshEmployees"
      @edit="openEditModal"
      @delete="handleDeleteEmployee"
      @bulk-delete="handleBulkDelete"
    />

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="title2">
            {{ editingEmployee ? $t('employee.editEmployee') : $t('employee.addEmployee') }}
          </h2>
          <Button
            variant="ghost"
            size="small"
            @click="closeModal"
          >
            <Icon name="xmark" size="20" />
          </Button>
        </div>
        
        <div class="modal-body">
          <EmployeeForm
            :employee="editingEmployee"
            :is-open="showModal"
            @submit="handleFormSubmit"
            @cancel="closeModal"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content modal-content--small" @click.stop>
        <div class="modal-header">
          <h2 class="title2">{{ $t('employee.confirmDelete') }}</h2>
        </div>
        
        <div class="modal-body">
          <p class="body">
            {{ deletingEmployee 
              ? $t('employee.confirmDeleteMessage', { name: deletingEmployee.name })
              : $t('employee.confirmBulkDeleteMessage', { count: deletingEmployeeIds.length })
            }}
          </p>
          <p class="caption1 text-secondary">
            {{ $t('employee.deleteWarning') }}
          </p>
        </div>
        
        <div class="modal-actions">
          <Button
            variant="secondary"
            @click="closeDeleteModal"
            :disabled="isDeleting"
          >
            {{ $t('common.cancel') }}
          </Button>
          <Button
            variant="destructive"
            @click="confirmDelete"
            :loading="isDeleting"
          >
            {{ $t('common.delete') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Success/Error Notifications -->
    <NotificationContainer />
  </div>
</template>

<script setup lang="ts">
import type { Employee, EmployeeFormData, EmployeesFilter, EmployeesSortOptions } from '~/types/employee'

// Meta
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// Composables
const { t } = useI18n()
const { showNotification } = useNotification()
const {
  employees,
  isLoading,
  error,
  totalCount,
  currentPage,
  pageSize,
  hasEmployees,
  canManageEmployees,
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  deleteMultipleEmployees,
  applyFilters,
  sortBy,
  goToPage,
  refreshEmployees,
  clearError
} = useEmployees()

// Check permissions
const authStore = useAuthStore()
if (!authStore.isAdmin) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Access Denied'
  })
}

// Modal state
const showModal = ref(false)
const editingEmployee = ref<Employee | null>(null)

// Delete modal state
const showDeleteModal = ref(false)
const deletingEmployee = ref<Employee | null>(null)
const deletingEmployeeIds = ref<number[]>([])
const isDeleting = ref(false)

// Event handlers
const handleFiltersUpdate = async (filters: EmployeesFilter) => {
  await applyFilters(filters)
}

const handleSortUpdate = async (sort: EmployeesSortOptions) => {
  await sortBy(sort.field, sort.direction)
}

const handlePageUpdate = async (page: number) => {
  await goToPage(page)
}

// Modal handlers
const openCreateModal = () => {
  editingEmployee.value = null
  showModal.value = true
}

const openEditModal = (employee: Employee) => {
  editingEmployee.value = employee
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingEmployee.value = null
}

const handleFormSubmit = async (formData: EmployeeFormData) => {
  try {
    if (editingEmployee.value) {
      // Update existing employee
      const updated = await updateEmployee(editingEmployee.value.id, formData)
      if (updated) {
        showNotification({
          type: 'success',
          message: t('employee.updateSuccess', { name: updated.name })
        })
        closeModal()
      }
    } else {
      // Create new employee
      const created = await createEmployee(formData)
      if (created) {
        showNotification({
          type: 'success',
          message: t('employee.createSuccess', { name: created.name })
        })
        closeModal()
      }
    }
  } catch (err: any) {
    showNotification({
      type: 'error',
      message: err.message || t('employee.operationFailed')
    })
  }
}

// Delete handlers
const handleDeleteEmployee = (employee: Employee) => {
  deletingEmployee.value = employee
  deletingEmployeeIds.value = []
  showDeleteModal.value = true
}

const handleBulkDelete = (employeeIds: number[]) => {
  deletingEmployee.value = null
  deletingEmployeeIds.value = employeeIds
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingEmployee.value = null
  deletingEmployeeIds.value = []
}

const confirmDelete = async () => {
  isDeleting.value = true
  
  try {
    if (deletingEmployee.value) {
      // Single delete
      const success = await deleteEmployee(deletingEmployee.value.id)
      if (success) {
        showNotification({
          type: 'success',
          message: t('employee.deleteSuccess', { name: deletingEmployee.value.name })
        })
        closeDeleteModal()
      }
    } else if (deletingEmployeeIds.value.length > 0) {
      // Bulk delete
      const success = await deleteMultipleEmployees(deletingEmployeeIds.value)
      if (success) {
        showNotification({
          type: 'success',
          message: t('employee.bulkDeleteSuccess', { count: deletingEmployeeIds.value.length })
        })
        closeDeleteModal()
      }
    }
  } catch (err: any) {
    showNotification({
      type: 'error',
      message: err.message || t('employee.deleteFailed')
    })
  } finally {
    isDeleting.value = false
  }
}

// Initialize data
onMounted(async () => {
  if (canManageEmployees.value) {
    await refreshEmployees()
  }
})

// Clear errors when component unmounts
onUnmounted(() => {
  clearError()
})

// Handle escape key for modals
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showDeleteModal.value) {
      closeDeleteModal()
    } else if (showModal.value) {
      closeModal()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.employees-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.header-content {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content--small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .employees-page {
    padding: var(--spacing-md);
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
  
  .modal-overlay {
    padding: var(--spacing-md);
  }
  
  .modal-content {
    max-height: 95vh;
  }
  
  .modal-actions {
    flex-direction: column-reverse;
  }
  
  .modal-actions button {
    width: 100%;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .modal-overlay {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>