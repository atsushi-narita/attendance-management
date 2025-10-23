import { defineStore } from 'pinia'
import type {
    AttendanceRecord,
    RecordsFilter,
    RecordsListResponse,
    RecordsSortOptions,
    WorkingHoursSummary
} from '~/types/attendance'

interface RecordsState {
  records: AttendanceRecord[]
  summary: WorkingHoursSummary | null
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  currentFilters: RecordsFilter
  currentSort: RecordsSortOptions
  selectedMonth: string
  lastFetchTime: number | null
}

export const useRecordsStore = defineStore('records', {
  state: (): RecordsState => ({
    records: [],
    summary: null,
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 20,
    currentFilters: {},
    currentSort: {
      field: 'date',
      direction: 'desc'
    },
    selectedMonth: '',
    lastFetchTime: null
  }),

  getters: {
    totalPages: (state): number => Math.ceil(state.totalCount / state.pageSize),
    
    hasRecords: (state): boolean => state.records.length > 0,
    
    hasSummary: (state): boolean => state.summary !== null,
    
    isCurrentMonth: (state): boolean => {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return state.selectedMonth === currentMonth
    },
    
    recordsWithFormattedData: (state) => {
      const { formatDate, formatTime, formatDuration } = useDateTime()
      
      return state.records.map(record => ({
        ...record,
        formattedDate: formatDate(record.date),
        formattedClockIn: record.clockInTime ? formatTime(record.clockInTime) : null,
        formattedClockOut: record.clockOutTime ? formatTime(record.clockOutTime) : null,
        formattedDuration: formatDuration(record.workingMinutes)
      }))
    },

    summaryWithFormattedData: (state) => {
      if (!state.summary) return null
      
      const { formatHours } = useDateTime()
      
      return {
        ...state.summary,
        formattedTotalHours: formatHours(state.summary.totalWorkingMinutes),
        formattedRequiredHours: formatHours(state.summary.requiredMonthlyHours * 60),
        formattedOverUnderHours: formatHours(Math.abs(state.summary.overUnderHours * 60)),
        formattedAverageHours: formatHours(state.summary.averageWorkingMinutes)
      }
    },

    progressPercentage: (state): number => {
      if (!state.summary) return 0
      return (state.summary.totalWorkingMinutes / (state.summary.requiredMonthlyHours * 60)) * 100
    },

    isOvertime: (state): boolean => {
      return state.summary ? state.summary.overUnderHours > 0 : false
    },

    isUndertime: (state): boolean => {
      return state.summary ? state.summary.overUnderHours < 0 : false
    },

    isExactTime: (state): boolean => {
      return state.summary ? state.summary.overUnderHours === 0 : false
    }
  },

  actions: {
    initializeMonth(): void {
      const now = new Date()
      this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    },

    async fetchRecords(options: {
      page?: number
      filters?: RecordsFilter
      sort?: RecordsSortOptions
      force?: boolean
    } = {}): Promise<void> {
      // Check if we need to fetch (avoid unnecessary requests)
      const now = Date.now()
      if (!options.force && this.lastFetchTime && (now - this.lastFetchTime) < 30000) {
        return // Skip if fetched within last 30 seconds
      }

      this.isLoading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        // Build query parameters
        const params = new URLSearchParams()
        
        // Pagination
        const page = options.page || this.currentPage
        params.append('page', String(page))
        params.append('pageSize', String(this.pageSize))
        
        // Filters
        const filters = options.filters !== undefined ? options.filters : this.currentFilters
        if (filters.employeeId) {
          params.append('employeeId', String(filters.employeeId))
        }
        if (filters.startDate) {
          params.append('startDate', filters.startDate)
        }
        if (filters.endDate) {
          params.append('endDate', filters.endDate)
        }
        if (filters.status) {
          params.append('status', filters.status)
        }
        
        // Sorting
        const sort = options.sort || this.currentSort
        params.append('sortField', sort.field)
        params.append('sortDirection', sort.direction)

        const apiClient = useApiClient()
        const response = await apiClient.get<RecordsListResponse>(`/api/records?${params.toString()}`)
        
        this.records = response.records
        this.totalCount = response.totalCount
        this.currentPage = response.page
        this.lastFetchTime = now
        
        // Update current state
        if (options.filters !== undefined) {
          this.currentFilters = filters
        }
        if (options.sort) {
          this.currentSort = sort
        }

      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        console.error('Failed to fetch records:', error)
      } finally {
        this.isLoading = false
      }
    },

    async fetchEmployeeRecords(employeeId: number, options: {
      page?: number
      filters?: RecordsFilter
      sort?: RecordsSortOptions
    } = {}): Promise<void> {
      const filters = { ...options.filters, employeeId }
      await this.fetchRecords({ ...options, filters })
    },

    async fetchSummary(employeeId?: number, month?: string): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        const targetEmployeeId = employeeId || parseInt(authStore.user.employeeNumber)
        const targetMonth = month || this.selectedMonth

        const apiClient = useApiClient()
        const response = await apiClient.get<WorkingHoursSummary>(
          `/api/records/${targetEmployeeId}/summary?month=${targetMonth}`
        )
        
        this.summary = response

      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        console.error('Failed to fetch summary:', error)
      } finally {
        this.isLoading = false
      }
    },

    async applyFilters(filters: RecordsFilter): Promise<void> {
      this.currentPage = 1 // Reset to first page when filtering
      await this.fetchRecords({ filters, force: true })
    },

    async resetFilters(): Promise<void> {
      this.currentPage = 1
      await this.fetchRecords({ filters: {}, force: true })
    },

    async sortBy(field: RecordsSortOptions['field'], direction?: RecordsSortOptions['direction']): Promise<void> {
      const newDirection = direction || (
        this.currentSort.field === field && this.currentSort.direction === 'asc' 
          ? 'desc' 
          : 'asc'
      )
      
      await this.fetchRecords({ 
        sort: { field, direction: newDirection },
        force: true
      })
    },

    async goToPage(page: number): Promise<void> {
      if (page >= 1 && page <= this.totalPages) {
        await this.fetchRecords({ page })
      }
    },

    async changeMonth(month: string): Promise<void> {
      this.selectedMonth = month
      await this.fetchSummary()
    },

    async previousMonth(): Promise<void> {
      const [year, month] = this.selectedMonth.split('-').map(Number)
      const prevDate = new Date(year, month - 2, 1) // month - 2 because month is 1-based
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      await this.changeMonth(prevMonth)
    },

    async nextMonth(): Promise<void> {
      if (this.isCurrentMonth) return
      
      const [year, month] = this.selectedMonth.split('-').map(Number)
      const nextDate = new Date(year, month, 1) // month because we want next month
      const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
      
      // Don't go beyond current month
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      
      if (nextMonth <= currentMonth) {
        await this.changeMonth(nextMonth)
      }
    },

    async refreshRecords(): Promise<void> {
      await this.fetchRecords({ force: true })
    },

    async refreshSummary(): Promise<void> {
      await this.fetchSummary()
    },

    async refreshAll(): Promise<void> {
      await Promise.all([
        this.fetchRecords({ force: true }),
        this.fetchSummary()
      ])
    },

    clearCache(): void {
      this.records = []
      this.summary = null
      this.totalCount = 0
      this.currentPage = 1
      this.currentFilters = {}
      this.error = null
      this.lastFetchTime = null
    },

    clearError(): void {
      this.error = null
    },

    getErrorMessage(error: any): string {
      const { t } = useI18n()
      
      if (error.statusCode === 401) {
        return t('errors.unauthorized')
      } else if (error.statusCode === 403) {
        return t('errors.forbidden')
      } else if (error.statusCode === 404) {
        return t('errors.notFound')
      } else if (error.statusCode === 500) {
        return t('errors.serverError')
      }
      
      return error.message || t('errors.unknownError')
    }
  }
})