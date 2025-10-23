import type {
    RecordsFilter,
    RecordsSortOptions
} from '~/types/attendance'

export const useRecords = () => {
  const recordsStore = useRecordsStore()

  // Reactive state from store
  const records = computed(() => recordsStore.records)
  const summary = computed(() => recordsStore.summary)
  const isLoading = computed(() => recordsStore.isLoading)
  const error = computed(() => recordsStore.error)
  const totalCount = computed(() => recordsStore.totalCount)
  const currentPage = computed(() => recordsStore.currentPage)
  const pageSize = computed(() => recordsStore.pageSize)
  const totalPages = computed(() => recordsStore.totalPages)
  const currentFilters = computed(() => recordsStore.currentFilters)
  const currentSort = computed(() => recordsStore.currentSort)
  const selectedMonth = computed(() => recordsStore.selectedMonth)
  const hasRecords = computed(() => recordsStore.hasRecords)
  const hasSummary = computed(() => recordsStore.hasSummary)
  const recordsWithFormattedData = computed(() => recordsStore.recordsWithFormattedData)
  const summaryWithFormattedData = computed(() => recordsStore.summaryWithFormattedData)
  const isCurrentMonth = computed(() => recordsStore.isCurrentMonth)
  const progressPercentage = computed(() => recordsStore.progressPercentage)
  const isOvertime = computed(() => recordsStore.isOvertime)
  const isUndertime = computed(() => recordsStore.isUndertime)
  const isExactTime = computed(() => recordsStore.isExactTime)

  // API methods (delegate to store)
  const fetchRecords = async (options: {
    page?: number
    filters?: RecordsFilter
    sort?: RecordsSortOptions
    force?: boolean
  } = {}) => {
    await recordsStore.fetchRecords(options)
  }

  const fetchEmployeeRecords = async (employeeId: number, options: {
    page?: number
    filters?: RecordsFilter
    sort?: RecordsSortOptions
  } = {}) => {
    await recordsStore.fetchEmployeeRecords(employeeId, options)
  }

  const fetchSummary = async (employeeId?: number, month?: string) => {
    await recordsStore.fetchSummary(employeeId, month)
  }

  // Filter methods
  const applyFilters = async (filters: RecordsFilter) => {
    await recordsStore.applyFilters(filters)
  }

  const resetFilters = async () => {
    await recordsStore.resetFilters()
  }

  const filterByDateRange = async (startDate: string, endDate: string) => {
    await applyFilters({ startDate, endDate })
  }

  const filterByEmployee = async (employeeId: number) => {
    await applyFilters({ employeeId })
  }

  const filterByStatus = async (status: RecordsFilter['status']) => {
    await applyFilters({ status })
  }

  // Sort methods
  const sortBy = async (field: RecordsSortOptions['field'], direction?: RecordsSortOptions['direction']) => {
    await recordsStore.sortBy(field, direction)
  }

  // Pagination methods
  const goToPage = async (page: number) => {
    await recordsStore.goToPage(page)
  }

  const nextPage = async () => {
    if (currentPage.value < totalPages.value) {
      await goToPage(currentPage.value + 1)
    }
  }

  const previousPage = async () => {
    if (currentPage.value > 1) {
      await goToPage(currentPage.value - 1)
    }
  }

  // Month navigation for summary
  const changeMonth = async (month: string) => {
    await recordsStore.changeMonth(month)
  }

  const previousMonth = async () => {
    await recordsStore.previousMonth()
  }

  const nextMonth = async () => {
    await recordsStore.nextMonth()
  }

  // Refresh methods
  const refreshRecords = async () => {
    await recordsStore.refreshRecords()
  }

  const refreshSummary = async () => {
    await recordsStore.refreshSummary()
  }

  const refreshAll = async () => {
    await recordsStore.refreshAll()
  }

  // Cache management
  const clearCache = () => {
    recordsStore.clearCache()
  }

  const clearError = () => {
    recordsStore.clearError()
  }

  // Auto-refresh functionality
  const { pause: pauseAutoRefresh, resume: resumeAutoRefresh } = useIntervalFn(
    async () => {
      if (!isLoading.value) {
        await refreshRecords()
      }
    },
    300000, // Refresh every 5 minutes
    { immediate: false }
  )

  // Initialize
  onMounted(() => {
    recordsStore.initializeMonth()
  })

  // Cleanup
  onUnmounted(() => {
    pauseAutoRefresh()
  })

  return {
    // State
    records: readonly(records),
    summary: readonly(summary),
    isLoading: readonly(isLoading),
    error: readonly(error),
    totalCount: readonly(totalCount),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    totalPages: readonly(totalPages),
    currentFilters: readonly(currentFilters),
    currentSort: readonly(currentSort),
    selectedMonth: readonly(selectedMonth),
    
    // Computed
    hasRecords: readonly(hasRecords),
    hasSummary: readonly(hasSummary),
    recordsWithFormattedData: readonly(recordsWithFormattedData),
    summaryWithFormattedData: readonly(summaryWithFormattedData),
    isCurrentMonth: readonly(isCurrentMonth),
    progressPercentage: readonly(progressPercentage),
    isOvertime: readonly(isOvertime),
    isUndertime: readonly(isUndertime),
    isExactTime: readonly(isExactTime),
    
    // Methods
    fetchRecords,
    fetchEmployeeRecords,
    fetchSummary,
    applyFilters,
    resetFilters,
    filterByDateRange,
    filterByEmployee,
    filterByStatus,
    sortBy,
    goToPage,
    nextPage,
    previousPage,
    changeMonth,
    previousMonth,
    nextMonth,
    refreshRecords,
    refreshSummary,
    refreshAll,
    clearCache,
    clearError,
    
    // Auto-refresh control
    pauseAutoRefresh,
    resumeAutoRefresh
  }
}