<template>
  <div class="employee-form">
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Form Header -->
      <div class="form-header">
        <h2 class="title2">
          {{ isEditMode ? $t('employee.editEmployee') : $t('employee.addEmployee') }}
        </h2>
        <p class="subhead">
          {{ isEditMode ? $t('employee.editDescription') : $t('employee.addDescription') }}
        </p>
      </div>

      <!-- Form Fields -->
      <div class="form-fields">
        <!-- Name Field -->
        <div class="field-group">
          <Input
            v-model="formData.name"
            :label="$t('employee.name')"
            :placeholder="$t('employee.namePlaceholder')"
            :error="validationErrors.name"
            required
            @blur="validateField('name')"
          />
        </div>

        <!-- Employee Number Field -->
        <div class="field-group">
          <Input
            v-model="formData.employeeNumber"
            :label="$t('employee.employeeNumber')"
            :placeholder="$t('employee.employeeNumberPlaceholder')"
            :error="validationErrors.employeeNumber"
            required
            @blur="validateField('employeeNumber')"
          />
        </div>

        <!-- Required Monthly Hours Field -->
        <div class="field-group">
          <Input
            v-model.number="formData.requiredMonthlyHours"
            type="number"
            :label="$t('employee.requiredMonthlyHours')"
            :placeholder="$t('employee.requiredMonthlyHoursPlaceholder')"
            :error="validationErrors.requiredMonthlyHours"
            :min="140"
            :max="180"
            required
            @blur="validateField('requiredMonthlyHours')"
          />
          <p class="caption1 text-secondary field-hint">
            {{ $t('employee.requiredMonthlyHoursHint') }}
          </p>
        </div>

        <!-- Role Field -->
        <div class="field-group">
          <label class="field-label">
            {{ $t('employee.role') }}
            <span class="required-indicator">*</span>
          </label>
          
          <div class="role-options">
            <div
              v-for="role in availableRoles"
              :key="role"
              :class="['role-option', { 'role-option--selected': formData.role === role }]"
              @click="selectRole(role)"
            >
              <div class="role-content">
                <Icon :name="getRoleIcon(role)" size="20" />
                <div class="role-info">
                  <span class="headline">{{ getRoleDisplayName(role) }}</span>
                  <span class="caption1 text-secondary">{{ getRoleDescription(role) }}</span>
                </div>
              </div>
              <Icon 
                v-if="formData.role === role" 
                name="checkmark.circle.fill" 
                size="20" 
                class="text-primary" 
              />
            </div>
          </div>
          
          <p v-if="validationErrors.role" class="field-error">
            {{ validationErrors.role }}
          </p>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <Button
          variant="secondary"
          type="button"
          @click="handleCancel"
          :disabled="isSubmitting"
        >
          {{ $t('common.cancel') }}
        </Button>
        
        <Button
          variant="primary"
          type="submit"
          :disabled="!isFormValid || isSubmitting"
          :loading="isSubmitting"
        >
          {{ isEditMode ? $t('common.update') : $t('common.create') }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { UserRole } from '~/types/auth';
import type { Employee, EmployeeFormData, EmployeeValidationErrors } from '~/types/employee';

interface Props {
  employee?: Employee | null
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  employee: null,
  isOpen: false
})

const emit = defineEmits<{
  'submit': [data: EmployeeFormData]
  'cancel': []
  'close': []
}>()

// Composables
const { t } = useI18n()
const { getRoleDisplayName, validateRequiredHours } = useEmployees()

// State
const formData = ref<EmployeeFormData>({
  name: '',
  employeeNumber: '',
  requiredMonthlyHours: 160,
  role: 'EMPLOYEE'
})

const validationErrors = ref<EmployeeValidationErrors>({})
const isSubmitting = ref(false)

// Computed
const isEditMode = computed(() => !!props.employee)

const availableRoles: UserRole[] = ['EMPLOYEE', 'MANAGER', 'ADMIN']

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    formData.value.employeeNumber.trim() !== '' &&
    validateRequiredHours(formData.value.requiredMonthlyHours) &&
    formData.value.role &&
    Object.keys(validationErrors.value).length === 0
  )
})

// Methods
const validateField = (field: keyof EmployeeFormData): void => {
  const errors: EmployeeValidationErrors = { ...validationErrors.value }

  switch (field) {
    case 'name':
      if (!formData.value.name.trim()) {
        errors.name = t('employee.validation.nameRequired')
      } else if (formData.value.name.trim().length < 2) {
        errors.name = t('employee.validation.nameMinLength')
      } else {
        delete errors.name
      }
      break

    case 'employeeNumber':
      if (!formData.value.employeeNumber.trim()) {
        errors.employeeNumber = t('employee.validation.employeeNumberRequired')
      } else if (!/^[A-Z0-9]{3,10}$/.test(formData.value.employeeNumber.trim())) {
        errors.employeeNumber = t('employee.validation.employeeNumberFormat')
      } else {
        delete errors.employeeNumber
      }
      break

    case 'requiredMonthlyHours':
      if (!validateRequiredHours(formData.value.requiredMonthlyHours)) {
        errors.requiredMonthlyHours = t('employee.validation.requiredMonthlyHoursRange')
      } else {
        delete errors.requiredMonthlyHours
      }
      break

    case 'role':
      if (!formData.value.role) {
        errors.role = t('employee.validation.roleRequired')
      } else {
        delete errors.role
      }
      break
  }

  validationErrors.value = errors
}

const validateAllFields = (): boolean => {
  const fields: (keyof EmployeeFormData)[] = ['name', 'employeeNumber', 'requiredMonthlyHours', 'role']
  fields.forEach(field => validateField(field))
  return Object.keys(validationErrors.value).length === 0
}

const selectRole = (role: UserRole): void => {
  formData.value.role = role
  validateField('role')
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

const getRoleDescription = (role: UserRole): string => {
  switch (role) {
    case 'EMPLOYEE':
      return t('employee.roleDescriptions.employee')
    case 'MANAGER':
      return t('employee.roleDescriptions.manager')
    case 'ADMIN':
      return t('employee.roleDescriptions.admin')
    default:
      return ''
  }
}

const resetForm = (): void => {
  formData.value = {
    name: '',
    employeeNumber: '',
    requiredMonthlyHours: 160,
    role: 'EMPLOYEE'
  }
  validationErrors.value = {}
}

const loadEmployeeData = (): void => {
  if (props.employee) {
    formData.value = {
      name: props.employee.name,
      employeeNumber: props.employee.employeeNumber,
      requiredMonthlyHours: props.employee.requiredMonthlyHours,
      role: props.employee.role
    }
  } else {
    resetForm()
  }
  validationErrors.value = {}
}

const handleSubmit = async (): Promise<void> => {
  if (!validateAllFields()) {
    return
  }

  isSubmitting.value = true

  try {
    emit('submit', { ...formData.value })
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = (): void => {
  resetForm()
  emit('cancel')
}

// Watch for employee changes
watch(() => props.employee, loadEmployeeData, { immediate: true })

// Watch for form open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadEmployeeData()
  }
})
</script>

<style scoped>
.employee-form {
  max-width: 600px;
  margin: 0 auto;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.form-header {
  text-align: center;
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.field-label {
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.required-indicator {
  color: var(--color-error);
  font-size: var(--font-size-caption1);
}

.field-hint {
  margin-top: var(--spacing-xs);
}

.field-error {
  color: var(--color-error);
  font-size: var(--font-size-caption1);
  margin-top: var(--spacing-xs);
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.role-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-option:hover {
  border-color: var(--color-primary);
  background-color: var(--color-surface-secondary);
}

.role-option--selected {
  border-color: var(--color-primary);
  background-color: rgba(0, 122, 255, 0.05);
}

.role-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .employee-form {
    max-width: none;
    margin: 0;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .form-actions button {
    width: 100%;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .role-option--selected {
    background-color: rgba(0, 122, 255, 0.1);
  }
}
</style>