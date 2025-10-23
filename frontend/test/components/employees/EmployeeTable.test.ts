import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployeeTable from '~/components/employees/EmployeeTable.vue'
import type { UserRole } from '~/types/auth'
import type { Employee } from '~/types/employee'

// Mock composables
const mockUseEmployees = {
  getRoleDisplayName: vi.fn((role: UserRole) => `role.${role.toLowerCase()}`)
}

const mockUseDateTime = {
  formatDate: vi.fn((date: string) => date.split('T')[0])
}

vi.mock('~/composables/useEmployees', () => ({
  useEmployees: () => mockUseEmployees
}))

vi.mock('~/composables/useDateTime', () => ({
  useDateTime: () => mockUseDateTime
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
    props: ['modelValue', 'label', 'placeholder', 'size'],
    emits: ['update:modelValue']
  }
}))

vi.mock('~/components/ui/Button.vue', () => ({
  default: {
    name: 'Button',
    template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
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

describe('EmployeeTable', () => {
  let wrapper: any

  const mockEmployees: Employee[] = [
    {
      id: 1,
      name: 'John Doe',
      employeeNumber: 'EMP001',
      requiredMonthlyHours: 160,
      role: 'EMPLOYEE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: 'Jane Smith',
      employeeNumber: 'EMP002',
      requiredMonthlyHours: 170,
      role: 'MANAGER',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('with employees data', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: mockEmployees,
          isLoading: false,
          error: null,
          totalCount: 2,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should render employee table correctly', () => {
      expect(wrapper.find('.employees-table').exists()).toBe(true)
      expect(wrapper.find('h2').text()).toBe('employee.employeeList')
    })

    it('should display employee data', () => {
      const rows = wrapper.findAll('.employee-row')
      expect(rows).toHaveLength(2)

      // Check first employee
      const firstRow = rows[0]
      expect(firstRow.text()).toContain('John Doe')
      expect(firstRow.text()).toContain('EMP001')
      expect(firstRow.text()).toContain('160h')

      // Check second employee
      const secondRow = rows[1]
      expect(secondRow.text()).toContain('Jane Smith')
      expect(secondRow.text()).toContain('EMP002')
      expect(secondRow.text()).toContain('170h')
    })

    it('should show total count', () => {
      expect(wrapper.text()).toContain('employee.totalEmployees:{"count":2}')
    })

    it('should emit edit event when edit button is clicked', async () => {
      const editButton = wrapper.find('.employee-row .action-buttons button:first-child')
      await editButton.trigger('click')

      expect(wrapper.emitted('edit')).toBeTruthy()
      expect(wrapper.emitted('edit')[0][0]).toEqual(mockEmployees[0])
    })

    it('should emit delete event when delete button is clicked', async () => {
      const deleteButton = wrapper.find('.employee-row .action-buttons button:last-child')
      await deleteButton.trigger('click')

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')[0][0]).toEqual(mockEmployees[0])
    })
  })

  describe('loading state', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: [],
          isLoading: true,
          error: null,
          totalCount: 0,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should show loading state', () => {
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('common.loading')
    })
  })

  describe('error state', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: [],
          isLoading: false,
          error: 'Failed to load employees',
          totalCount: 0,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should show error state', () => {
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load employees')
      expect(wrapper.text()).toContain('common.retry')
    })

    it('should emit refresh event when retry button is clicked', async () => {
      const retryButton = wrapper.find('.error-state button')
      await retryButton.trigger('click')

      expect(wrapper.emitted('refresh')).toBeTruthy()
    })
  })

  describe('empty state', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: [],
          isLoading: false,
          error: null,
          totalCount: 0,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should show empty state', () => {
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('employee.noEmployees')
      expect(wrapper.text()).toContain('employee.noEmployeesMessage')
    })
  })

  describe('filtering', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: mockEmployees,
          isLoading: false,
          error: null,
          totalCount: 2,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should emit filters when filter button is clicked', async () => {
      const nameInput = wrapper.find('input[placeholder="employee.searchByName"]')
      const roleSelect = wrapper.find('.role-select')
      const filterButton = wrapper.find('.filter-actions button:last-child')

      await nameInput.setValue('John')
      await roleSelect.setValue('EMPLOYEE')
      await filterButton.trigger('click')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')[0][0]).toEqual({
        name: 'John',
        role: 'EMPLOYEE'
      })
    })

    it('should reset filters when reset button is clicked', async () => {
      const nameInput = wrapper.find('input[placeholder="employee.searchByName"]')
      const resetButton = wrapper.find('.filter-actions button:first-child')

      await nameInput.setValue('John')
      await resetButton.trigger('click')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')[0][0]).toEqual({})
    })
  })

  describe('sorting', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: mockEmployees,
          isLoading: false,
          error: null,
          totalCount: 2,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should emit sort event when sortable header is clicked', async () => {
      const nameHeader = wrapper.find('th.sortable')
      await nameHeader.trigger('click')

      expect(wrapper.emitted('update:sort')).toBeTruthy()
      expect(wrapper.emitted('update:sort')[0][0]).toEqual({
        field: 'name',
        direction: 'desc'
      })
    })

    it('should toggle sort direction on repeated clicks', async () => {
      const nameHeader = wrapper.find('th.sortable')
      
      // First click - should sort desc
      await nameHeader.trigger('click')
      expect(wrapper.emitted('update:sort')[0][0].direction).toBe('desc')

      // Second click - should sort asc
      await nameHeader.trigger('click')
      expect(wrapper.emitted('update:sort')[1][0].direction).toBe('asc')
    })
  })

  describe('selection', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: mockEmployees,
          isLoading: false,
          error: null,
          totalCount: 2,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should select individual employees', async () => {
      const firstCheckbox = wrapper.find('.employee-row .checkbox')
      await firstCheckbox.setChecked(true)

      expect(wrapper.vm.selectedEmployees).toContain(1)
    })

    it('should select all employees', async () => {
      const selectAllCheckbox = wrapper.find('th .checkbox')
      await selectAllCheckbox.setChecked(true)

      expect(wrapper.vm.selectedEmployees).toEqual([1, 2])
    })

    it('should show bulk actions when employees are selected', async () => {
      const firstCheckbox = wrapper.find('.employee-row .checkbox')
      await firstCheckbox.setChecked(true)

      await wrapper.vm.$nextTick()
      expect(wrapper.find('.bulk-actions').exists()).toBe(true)
      expect(wrapper.text()).toContain('employee.selectedCount:{"count":1}')
    })

    it('should emit bulk delete event', async () => {
      const firstCheckbox = wrapper.find('.employee-row .checkbox')
      await firstCheckbox.setChecked(true)

      await wrapper.vm.$nextTick()
      const bulkDeleteButton = wrapper.find('.bulk-actions .bulk-buttons button:last-child')
      await bulkDeleteButton.trigger('click')

      expect(wrapper.emitted('bulk-delete')).toBeTruthy()
      expect(wrapper.emitted('bulk-delete')[0][0]).toEqual([1])
    })

    it('should clear selection', async () => {
      const firstCheckbox = wrapper.find('.employee-row .checkbox')
      await firstCheckbox.setChecked(true)

      await wrapper.vm.$nextTick()
      const clearButton = wrapper.find('.bulk-actions .bulk-buttons button:first-child')
      await clearButton.trigger('click')

      expect(wrapper.vm.selectedEmployees).toEqual([])
    })
  })

  describe('pagination', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: mockEmployees,
          isLoading: false,
          error: null,
          totalCount: 50,
          currentPage: 2,
          pageSize: 20
        }
      })
    })

    it('should show pagination when there are multiple pages', () => {
      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('should emit page change event', async () => {
      const nextButton = wrapper.find('.pagination button:last-child')
      await nextButton.trigger('click')

      expect(wrapper.emitted('update:page')).toBeTruthy()
      expect(wrapper.emitted('update:page')[0][0]).toBe(3)
    })

    it('should show page numbers', () => {
      const pageNumbers = wrapper.findAll('.page-number')
      expect(pageNumbers.length).toBeGreaterThan(0)
    })

    it('should emit page change when page number is clicked', async () => {
      const pageNumber = wrapper.find('.page-number')
      await pageNumber.trigger('click')

      expect(wrapper.emitted('update:page')).toBeTruthy()
    })
  })

  describe('role badges', () => {
    beforeEach(() => {
      wrapper = mount(EmployeeTable, {
        props: {
          employees: mockEmployees,
          isLoading: false,
          error: null,
          totalCount: 2,
          currentPage: 1,
          pageSize: 20
        }
      })
    })

    it('should display role badges with correct styling', () => {
      const roleBadges = wrapper.findAll('.role-badge')
      expect(roleBadges).toHaveLength(2)

      expect(roleBadges[0].classes()).toContain('role-badge--employee')
      expect(roleBadges[1].classes()).toContain('role-badge--manager')
    })

    it('should show role icons', () => {
      const roleIcons = wrapper.findAll('.role-badge .icon')
      expect(roleIcons).toHaveLength(2)
    })
  })
})