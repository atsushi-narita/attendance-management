import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployeeForm from '~/components/employees/EmployeeForm.vue'
import type { UserRole } from '~/types/auth'
import type { Employee } from '~/types/employee'

// Mock composables
const mockUseEmployees = {
  getRoleDisplayName: vi.fn((role: UserRole) => `role.${role.toLowerCase()}`),
  validateRequiredHours: vi.fn((hours: number) => hours >= 140 && hours <= 180)
}

vi.mock('~/composables/useEmployees', () => ({
  useEmployees: () => mockUseEmployees
}))

vi.mock('#app', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    }
  })
}))

// Mock components
vi.mock('~/components/ui/Input.vue', () => ({
  default: {
    name: 'Input',
    template: '<input v-bind="$attrs" v-model="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label', 'placeholder', 'error', 'type', 'min', 'max', 'required'],
    emits: ['update:modelValue', 'blur']
  }
}))

vi.mock('~/components/ui/Button.vue', () => ({
  default: {
    name: 'Button',
    template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'type', 'disabled', 'loading'],
    emits: ['click']
  }
}))

vi.mock('~/components/ui/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<span class="icon" :data-name="name" :data-size="size"></span>',
    props: ['name', 'size']
  }
}))

describe('EmployeeForm', () => {
  let wrapper: any

  const mockEmployee: Employee = {
    id: 1,
    name: 'John Doe',
    employeeNumber: 'EMP001',
    requiredMonthlyHours: 160,
    role: 'EMPLOYEE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeForm, {
        props: {
          employee: null,
          isOpen: true
        }
      })
    })

    it('should render create form correctly', () => {
      expect(wrapper.find('h2').text()).toBe('employee.addEmployee')
      expect(wrapper.find('p').text()).toBe('employee.addDescription')
    })

    it('should initialize with default values', () => {
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')
      const hoursInput = wrapper.find('input[placeholder="employee.requiredMonthlyHoursPlaceholder"]')

      expect(nameInput.element.value).toBe('')
      expect(employeeNumberInput.element.value).toBe('')
      expect(hoursInput.element.value).toBe('160')
    })

    it('should validate required fields', async () => {
      const submitButton = wrapper.find('button[type="submit"]')
      
      // Form should be invalid initially
      expect(submitButton.attributes('disabled')).toBeDefined()

      // Fill in required fields
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')

      await nameInput.setValue('John Doe')
      await employeeNumberInput.setValue('EMP001')

      // Form should be valid now
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('should validate employee number format', async () => {
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')
      
      await employeeNumberInput.setValue('invalid')
      await employeeNumberInput.trigger('blur')

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.validationErrors.employeeNumber).toBe('employee.validation.employeeNumberFormat')
    })

    it('should validate required monthly hours range', async () => {
      const hoursInput = wrapper.find('input[placeholder="employee.requiredMonthlyHoursPlaceholder"]')
      
      await hoursInput.setValue('100')
      await hoursInput.trigger('blur')

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.validationErrors.requiredMonthlyHours).toBe('employee.validation.requiredMonthlyHoursRange')
    })

    it('should emit submit event with form data', async () => {
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')
      const hoursInput = wrapper.find('input[placeholder="employee.requiredMonthlyHoursPlaceholder"]')

      await nameInput.setValue('John Doe')
      await employeeNumberInput.setValue('EMP001')
      await hoursInput.setValue('160')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')[0][0]).toEqual({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        requiredMonthlyHours: 160,
        role: 'EMPLOYEE'
      })
    })

    it('should emit cancel event', async () => {
      const cancelButton = wrapper.find('button[type="button"]')
      await cancelButton.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('edit mode', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeForm, {
        props: {
          employee: mockEmployee,
          isOpen: true
        }
      })
    })

    it('should render edit form correctly', () => {
      expect(wrapper.find('h2').text()).toBe('employee.editEmployee')
      expect(wrapper.find('p').text()).toBe('employee.editDescription')
    })

    it('should load employee data', () => {
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')
      const hoursInput = wrapper.find('input[placeholder="employee.requiredMonthlyHoursPlaceholder"]')

      expect(nameInput.element.value).toBe('John Doe')
      expect(employeeNumberInput.element.value).toBe('EMP001')
      expect(hoursInput.element.value).toBe('160')
    })

    it('should update form when employee prop changes', async () => {
      const updatedEmployee: Employee = {
        ...mockEmployee,
        name: 'Jane Smith',
        employeeNumber: 'EMP002'
      }

      await wrapper.setProps({ employee: updatedEmployee })

      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')

      expect(nameInput.element.value).toBe('Jane Smith')
      expect(employeeNumberInput.element.value).toBe('EMP002')
    })
  })

  describe('role selection', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeForm, {
        props: {
          employee: null,
          isOpen: true
        }
      })
    })

    it('should render role options', () => {
      const roleOptions = wrapper.findAll('.role-option')
      expect(roleOptions).toHaveLength(3)
    })

    it('should select role when clicked', async () => {
      const managerOption = wrapper.findAll('.role-option')[1]
      await managerOption.trigger('click')

      expect(wrapper.vm.formData.role).toBe('MANAGER')
      expect(managerOption.classes()).toContain('role-option--selected')
    })

    it('should show role descriptions', () => {
      const roleOptions = wrapper.findAll('.role-option')
      
      roleOptions.forEach((option, index) => {
        const roles = ['EMPLOYEE', 'MANAGER', 'ADMIN']
        const expectedDescription = `employee.roleDescriptions.${roles[index].toLowerCase()}`
        expect(option.text()).toContain(expectedDescription)
      })
    })
  })

  describe('form validation', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeForm, {
        props: {
          employee: null,
          isOpen: true
        }
      })
    })

    it('should validate name field', async () => {
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      
      // Test empty name
      await nameInput.setValue('')
      await nameInput.trigger('blur')
      expect(wrapper.vm.validationErrors.name).toBe('employee.validation.nameRequired')

      // Test short name
      await nameInput.setValue('A')
      await nameInput.trigger('blur')
      expect(wrapper.vm.validationErrors.name).toBe('employee.validation.nameMinLength')

      // Test valid name
      await nameInput.setValue('John Doe')
      await nameInput.trigger('blur')
      expect(wrapper.vm.validationErrors.name).toBeUndefined()
    })

    it('should prevent submission with invalid data', async () => {
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      // Should not emit submit event with invalid data
      expect(wrapper.emitted('submit')).toBeFalsy()
    })

    it('should show validation errors', async () => {
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      await nameInput.setValue('')
      await nameInput.trigger('blur')

      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('employee.validation.nameRequired')
    })
  })

  describe('form reset', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeForm, {
        props: {
          employee: mockEmployee,
          isOpen: true
        }
      })
    })

    it('should reset form when switching from edit to create', async () => {
      await wrapper.setProps({ employee: null })

      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      const employeeNumberInput = wrapper.find('input[placeholder="employee.employeeNumberPlaceholder"]')
      const hoursInput = wrapper.find('input[placeholder="employee.requiredMonthlyHoursPlaceholder"]')

      expect(nameInput.element.value).toBe('')
      expect(employeeNumberInput.element.value).toBe('')
      expect(hoursInput.element.value).toBe('160')
      expect(wrapper.vm.formData.role).toBe('EMPLOYEE')
    })

    it('should clear validation errors when form is reset', async () => {
      // Trigger validation error
      const nameInput = wrapper.find('input[placeholder="employee.namePlaceholder"]')
      await nameInput.setValue('')
      await nameInput.trigger('blur')

      expect(wrapper.vm.validationErrors.name).toBeTruthy()

      // Reset form
      await wrapper.setProps({ employee: null })

      expect(Object.keys(wrapper.vm.validationErrors)).toHaveLength(0)
    })
  })
})