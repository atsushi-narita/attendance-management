import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecordsStore } from '~/stores/records'
import type { AttendanceRecord, RecordsListResponse, WorkingHoursSummary } from '~/types/attendance'

// Mock API client
const mockApiClient = {
  get: vi.fn()
}

vi.mock('~/utils/api', () => ({
  useApiClient: () => mockApiClient
}))

// Mock auth store
const mockAuthStore = {
  user: {
    employeeNumber: '123'
  }
}

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

// Mock composables
vi.mock('~/composables/useDateTime', () => ({
  useDateTime: () => ({
    formatDate: vi.fn((date: string) => date),
    formatTime: vi.fn((time: string) => time),
    formatDuration: vi.fn((minutes: number) => `${minutes}m`),
    formatHours: vi.fn((minutes: number) => `${Math.floor(minutes / 60)}h`)
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key: string) => key)
  })
}))

describe('Records Store', () => {
  let store: ReturnType<typeof useRecordsStore>

  const mockRecords: AttendanceRecord[] = [
    {
      id: 1,
      employeeId: 123,
      date: '2024-01-15',
      clockInTime: '2024-01-15T09:00:00Z',
      clockOutTime: '2024-01-15T18:00:00Z',
      workingMinutes: 480,
      status: 'PRESENT',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T18:00:00Z'
    }
  ]

  const mockSummary: WorkingHoursSummary = {
    employeeId: 123,
    month: '2024-01',
    totalWorkingMinutes: 9600,
    totalWorkingDays: 20,
    requiredMonthlyHours: 160,
    overUnderHours: 0,
    averageWorkingMinutes: 480
  }

  const mockRecordsResponse: RecordsListResponse = {
    records: mockRecords,
    totalCount: 1,
    page: 1,
    pageSize: 20
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useRecordsStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct initial state', () => {
      expect(store.records).toEqual([])
      expect(store.summary).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.totalCount).toBe(0)
      expect(store.currentPage).toBe(1)
      expect(store.pageSize).toBe(20)
      expect(store.currentFilters).toEqual({})
      expect(store.currentSort).toEqual({
        field: 'date',
        direction: 'desc'
      })
      expect(store.selectedMonth).toBe('')
      expect(store.lastFetchTime).toBeNull()
    })
  })

  describe('getters', () => {
    it('calculates totalPages correctly', () => {
      store.totalCount = 50
      store.pageSize = 20
      expect(store.totalPages).toBe(3)
    })

    it('calculates hasRecords correctly', () => {
      expect(store.hasRecords).toBe(false)
      store.records = mockRecords
      expect(store.hasRecords).toBe(true)
    })

    it('calculates hasSummary correctly', () => {
      expect(store.hasSummary).toBe(false)
      store.summary = mockSummary
      expect(store.hasSummary).toBe(true)
    })

    it('calculates isCurrentMonth correctly', () => {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      
      store.selectedMonth = currentMonth
      expect(store.isCurrentMonth).toBe(true)
      
      store.selectedMonth = '2020-01'
      expect(store.isCurrentMonth).toBe(false)
    })

    it('calculates progressPercentage correctly', () => {
      store.summary = mockSummary
      expect(store.progressPercentage).toBe(100) // 9600 minutes / (160 * 60) = 100%
    })

    it('calculates overtime/undertime flags correctly', () => {
      // Exact time
      store.summary = mockSummary
      expect(store.isOvertime).toBe(false)
      expect(store.isUndertime).toBe(false)
      expect(store.isExactTime).toBe(true)

      // Overtime
      store.summary = { ...mockSummary, overUnderHours: 10 }
      expect(store.isOvertime).toBe(true)
      expect(store.isUndertime).toBe(false)
      expect(store.isExactTime).toBe(false)

      // Undertime
      store.summary = { ...mockSummary, overUnderHours: -10 }
      expect(store.isOvertime).toBe(false)
      expect(store.isUndertime).toBe(true)
      expect(store.isExactTime).toBe(false)
    })
  })

  describe('actions', () => {
    describe('initializeMonth', () => {
      it('sets selectedMonth to current month', () => {
        store.initializeMonth()
        
        const now = new Date()
        const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        expect(store.selectedMonth).toBe(expectedMonth)
      })
    })

    describe('fetchRecords', () => {
      it('fetches records successfully', async () => {
        mockApiClient.get.mockResolvedValue(mockRecordsResponse)

        await store.fetchRecords()

        expect(store.isLoading).toBe(false)
        expect(store.records).toEqual(mockRecords)
        expect(store.totalCount).toBe(1)
        expect(store.currentPage).toBe(1)
        expect(store.error).toBeNull()
        expect(store.lastFetchTime).toBeTruthy()
      })

      it('handles fetch error', async () => {
        const error = new Error('Network error')
        mockApiClient.get.mockRejectedValue(error)

        await store.fetchRecords()

        expect(store.isLoading).toBe(false)
        expect(store.error).toBeTruthy()
        expect(store.records).toEqual([])
      })

      it('skips fetch if recently fetched', async () => {
        store.lastFetchTime = Date.now() - 10000 // 10 seconds ago

        await store.fetchRecords()

        expect(mockApiClient.get).not.toHaveBeenCalled()
      })

      it('forces fetch when force option is true', async () => {
        store.lastFetchTime = Date.now() - 10000 // 10 seconds ago
        mockApiClient.get.mockResolvedValue(mockRecordsResponse)

        await store.fetchRecords({ force: true })

        expect(mockApiClient.get).toHaveBeenCalled()
      })

      it('builds query parameters correctly', async () => {
        mockApiClient.get.mockResolvedValue(mockRecordsResponse)

        await store.fetchRecords({
          page: 2,
          filters: { startDate: '2024-01-01', endDate: '2024-01-31' },
          sort: { field: 'clockInTime', direction: 'asc' }
        })

        const expectedUrl = expect.stringContaining('page=2')
        expect(mockApiClient.get).toHaveBeenCalledWith(expectedUrl)
      })
    })

    describe('fetchSummary', () => {
      it('fetches summary successfully', async () => {
        mockApiClient.get.mockResolvedValue(mockSummary)
        store.selectedMonth = '2024-01'

        await store.fetchSummary()

        expect(store.isLoading).toBe(false)
        expect(store.summary).toEqual(mockSummary)
        expect(store.error).toBeNull()
      })

      it('handles fetch error', async () => {
        const error = new Error('Network error')
        mockApiClient.get.mockRejectedValue(error)

        await store.fetchSummary()

        expect(store.isLoading).toBe(false)
        expect(store.error).toBeTruthy()
        expect(store.summary).toBeNull()
      })
    })

    describe('applyFilters', () => {
      it('applies filters and resets page', async () => {
        mockApiClient.get.mockResolvedValue(mockRecordsResponse)
        store.currentPage = 3

        const filters = { startDate: '2024-01-01' }
        await store.applyFilters(filters)

        expect(store.currentPage).toBe(1)
        expect(store.currentFilters).toEqual(filters)
      })
    })

    describe('sortBy', () => {
      it('sorts by field and toggles direction', async () => {
        mockApiClient.get.mockResolvedValue(mockRecordsResponse)

        await store.sortBy('clockInTime')

        expect(store.currentSort).toEqual({
          field: 'clockInTime',
          direction: 'asc'
        })

        // Sort by same field again to toggle direction
        await store.sortBy('clockInTime')

        expect(store.currentSort).toEqual({
          field: 'clockInTime',
          direction: 'desc'
        })
      })
    })

    describe('goToPage', () => {
      it('goes to valid page', async () => {
        mockApiClient.get.mockResolvedValue(mockRecordsResponse)
        store.totalCount = 100
        store.pageSize = 20 // totalPages = 5

        await store.goToPage(3)

        expect(store.currentPage).toBe(1) // Will be set by fetchRecords response
      })

      it('does not go to invalid page', async () => {
        store.totalCount = 100
        store.pageSize = 20 // totalPages = 5

        await store.goToPage(10) // Invalid page

        expect(mockApiClient.get).not.toHaveBeenCalled()
      })
    })

    describe('month navigation', () => {
      it('changes month and fetches summary', async () => {
        mockApiClient.get.mockResolvedValue(mockSummary)

        await store.changeMonth('2024-02')

        expect(store.selectedMonth).toBe('2024-02')
        expect(mockApiClient.get).toHaveBeenCalled()
      })

      it('navigates to previous month', async () => {
        mockApiClient.get.mockResolvedValue(mockSummary)
        store.selectedMonth = '2024-02'

        await store.previousMonth()

        expect(store.selectedMonth).toBe('2024-01')
      })

      it('navigates to next month', async () => {
        mockApiClient.get.mockResolvedValue(mockSummary)
        store.selectedMonth = '2024-01'

        await store.nextMonth()

        expect(store.selectedMonth).toBe('2024-02')
      })

      it('does not navigate beyond current month', async () => {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        store.selectedMonth = currentMonth

        await store.nextMonth()

        expect(store.selectedMonth).toBe(currentMonth)
        expect(mockApiClient.get).not.toHaveBeenCalled()
      })
    })

    describe('cache management', () => {
      it('clears cache correctly', () => {
        store.records = mockRecords
        store.summary = mockSummary
        store.totalCount = 10
        store.error = 'Some error'

        store.clearCache()

        expect(store.records).toEqual([])
        expect(store.summary).toBeNull()
        expect(store.totalCount).toBe(0)
        expect(store.currentPage).toBe(1)
        expect(store.currentFilters).toEqual({})
        expect(store.error).toBeNull()
        expect(store.lastFetchTime).toBeNull()
      })

      it('clears error', () => {
        store.error = 'Some error'

        store.clearError()

        expect(store.error).toBeNull()
      })
    })
  })
})