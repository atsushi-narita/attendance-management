import { vi } from 'vitest'
import { computed, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue'

// Make Vue composition API functions globally available
global.computed = computed
global.ref = ref
global.reactive = reactive
global.readonly = readonly
global.watch = watch
global.watchEffect = watchEffect
global.onMounted = onMounted

// Mock Nuxt composables
global.useNuxtApp = vi.fn(() => ({
  $t: vi.fn((key: string) => key),
  $i18n: {
    t: vi.fn((key: string) => key)
  }
}))

global.useRuntimeConfig = vi.fn(() => ({
  public: {
    awsRegion: 'ap-northeast-1',
    cognitoUserPoolId: 'test-pool-id',
    cognitoUserPoolClientId: 'test-client-id',
    cognitoIdentityPoolId: 'test-identity-pool-id',
    apiGatewayUrl: 'https://test-api.amazonaws.com'
  }
}))

global.useHead = vi.fn()
global.navigateTo = vi.fn()
global.defineNuxtPlugin = vi.fn((fn) => fn)
global.defineNuxtRouteMiddleware = vi.fn((fn) => fn)
global.createError = vi.fn()

// Mock Pinia store
global.useAuthStore = vi.fn(() => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isEmployee: false,
  isManager: false,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuthState: vi.fn(),
  clearError: vi.fn(),
  hasRole: vi.fn(() => false)
}))

// Mock useI18n
global.useI18n = vi.fn(() => ({
  t: vi.fn((key: string) => key)
}))

// Mock Pinia stores
global.useRecordsStore = vi.fn(() => ({
  records: [],
  summary: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  currentFilters: {},
  currentSort: { field: 'date', direction: 'desc' },
  selectedMonth: '2024-01',
  lastFetchTime: null,
  fetchRecords: vi.fn(),
  fetchEmployeeRecords: vi.fn(),
  fetchSummary: vi.fn(),
  applyFilters: vi.fn(),
  resetFilters: vi.fn(),
  sortBy: vi.fn(),
  goToPage: vi.fn(),
  changeMonth: vi.fn(),
  previousMonth: vi.fn(),
  nextMonth: vi.fn(),
  refreshRecords: vi.fn(),
  refreshSummary: vi.fn(),
  clearCache: vi.fn(),
  initializeMonth: vi.fn()
}))

global.useEmployeesStore = vi.fn(() => ({
  employees: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  currentFilters: {},
  currentSort: { field: 'name', direction: 'asc' },
  selectedEmployees: [],
  fetchEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  bulkDeleteEmployees: vi.fn(),
  applyFilters: vi.fn(),
  resetFilters: vi.fn(),
  sortBy: vi.fn(),
  goToPage: vi.fn(),
  selectEmployee: vi.fn(),
  selectAllEmployees: vi.fn(),
  clearSelection: vi.fn(),
  refreshEmployees: vi.fn()
}))

// Mock composables
global.useDateTime = vi.fn(() => ({
  formatDate: vi.fn(() => '2024年1月15日'),
  formatTime: vi.fn(() => '09:00'),
  formatDuration: vi.fn(() => '8時間0分'),
  formatWeekday: vi.fn(() => '月'),
  formatHours: vi.fn(() => '8.0時間'),
  formatMonth: vi.fn(() => '2024年1月'),
  parseDate: vi.fn(),
  parseTime: vi.fn(),
  calculateDuration: vi.fn(() => 480),
  isValidDate: vi.fn(() => true),
  isValidTime: vi.fn(() => true),
  getCurrentDate: vi.fn(() => '2024-01-15'),
  getCurrentTime: vi.fn(() => '09:00'),
  getMonthRange: vi.fn(() => ({ start: '2024-01-01', end: '2024-01-31' }))
}))

global.useEmployees = vi.fn(() => ({
  employees: [],
  isLoading: false,
  error: null,
  fetchEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  getRoleDisplayName: vi.fn((role: string) => role),
  validateRequiredHours: vi.fn(() => true),
  refreshEmployees: vi.fn()
}))

global.useRecords = vi.fn(() => ({
  records: [],
  summary: null,
  isLoading: false,
  error: null,
  fetchRecords: vi.fn(),
  fetchSummary: vi.fn(),
  refreshRecords: vi.fn(),
  refreshSummary: vi.fn()
}))

// Mock VueUse functions
global.useIntervalFn = vi.fn(() => ({
  pause: vi.fn(),
  resume: vi.fn(),
  isActive: false
}))

// Mock $t function globally
global.$t = vi.fn((key: string) => key)

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn()
}))

// Mock dayjs
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn(() => ({
    format: vi.fn(() => '2023年10月22日'),
    fromNow: vi.fn(() => '今'),
    isSame: vi.fn(() => true),
    isBefore: vi.fn(() => false),
    diff: vi.fn(() => 480),
    tz: vi.fn(() => mockDayjs())
  }))
  
  mockDayjs.extend = vi.fn()
  mockDayjs.locale = vi.fn()
  mockDayjs.duration = vi.fn(() => ({
    asHours: vi.fn(() => 8),
    minutes: vi.fn(() => 0)
  }))
  
  return {
    default: mockDayjs
  }
})