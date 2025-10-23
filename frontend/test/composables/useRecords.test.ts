import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecords } from '~/composables/useRecords'
import type { RecordsFilter, RecordsSortOptions } from '~/types/attendance'

// Mock the store
const mockRecordsStore = {
  records: [],
  summary: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,
  currentFilters: {},
  currentSort: { field: 'date', direction: 'desc' },
  selectedMonth: '2024-01',
  hasRecords: false,
  hasSummary: false,
  recordsWithFormattedData: [],
  summaryWithFormattedData: null,
  isCurrentMonth: false,
  progressPercentage: 0,
  isOvertime: false,
  isUndertime: false,
  isExactTime: false,
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
  refreshAll: vi.fn(),
  clearCache: vi.fn(),
  clearError: vi.fn(),
  initializeMonth: vi.fn()
}

vi.mock('~/stores/records', () => ({
  useRecordsStore: () => mockRecordsStore
}))

vi.mock('@vueuse/core', () => ({
  useIntervalFn: vi.fn(() => ({
    pause: vi.fn(),
    resume: vi.fn()
  }))
}))

describe('useRecords Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes reactive state from store', () => {
    const { 
      records, 
      summary, 
      isLoading, 
      error, 
      totalCount, 
      currentPage, 
      hasRecords,
      hasSummary 
    } = useRecords()

    expect(records.value).toEqual(mockRecordsStore.records)
    expect(summary.value).toEqual(mockRecordsStore.summary)
    expect(isLoading.value).toEqual(mockRecordsStore.isLoading)
    expect(error.value).toEqual(mockRecordsStore.error)
    expect(totalCount.value).toEqual(mockRecordsStore.totalCount)
    expect(currentPage.value).toEqual(mockRecordsStore.currentPage)
    expect(hasRecords.value).toEqual(mockRecordsStore.hasRecords)
    expect(hasSummary.value).toEqual(mockRecordsStore.hasSummary)
  })

  it('delegates fetchRecords to store', async () => {
    const { fetchRecords } = useRecords()
    const options = { page: 2, force: true }

    await fetchRecords(options)

    expect(mockRecordsStore.fetchRecords).toHaveBeenCalledWith(options)
  })

  it('delegates fetchEmployeeRecords to store', async () => {
    const { fetchEmployeeRecords } = useRecords()
    const employeeId = 123
    const options = { page: 1 }

    await fetchEmployeeRecords(employeeId, options)

    expect(mockRecordsStore.fetchEmployeeRecords).toHaveBeenCalledWith(employeeId, options)
  })

  it('delegates fetchSummary to store', async () => {
    const { fetchSummary } = useRecords()
    const employeeId = 123
    const month = '2024-01'

    await fetchSummary(employeeId, month)

    expect(mockRecordsStore.fetchSummary).toHaveBeenCalledWith(employeeId, month)
  })

  it('delegates applyFilters to store', async () => {
    const { applyFilters } = useRecords()
    const filters: RecordsFilter = { startDate: '2024-01-01', endDate: '2024-01-31' }

    await applyFilters(filters)

    expect(mockRecordsStore.applyFilters).toHaveBeenCalledWith(filters)
  })

  it('delegates resetFilters to store', async () => {
    const { resetFilters } = useRecords()

    await resetFilters()

    expect(mockRecordsStore.resetFilters).toHaveBeenCalled()
  })

  it('delegates sortBy to store', async () => {
    const { sortBy } = useRecords()
    const field: RecordsSortOptions['field'] = 'clockInTime'
    const direction: RecordsSortOptions['direction'] = 'asc'

    await sortBy(field, direction)

    expect(mockRecordsStore.sortBy).toHaveBeenCalledWith(field, direction)
  })

  it('delegates goToPage to store', async () => {
    const { goToPage } = useRecords()
    const page = 3

    await goToPage(page)

    expect(mockRecordsStore.goToPage).toHaveBeenCalledWith(page)
  })

  it('implements nextPage correctly', async () => {
    mockRecordsStore.currentPage = 1
    mockRecordsStore.totalPages = 5

    const { nextPage } = useRecords()

    await nextPage()

    expect(mockRecordsStore.goToPage).toHaveBeenCalledWith(2)
  })

  it('implements previousPage correctly', async () => {
    mockRecordsStore.currentPage = 3
    mockRecordsStore.totalPages = 5

    const { previousPage } = useRecords()

    await previousPage()

    expect(mockRecordsStore.goToPage).toHaveBeenCalledWith(2)
  })

  it('does not go to next page if already on last page', async () => {
    mockRecordsStore.currentPage = 5
    mockRecordsStore.totalPages = 5

    const { nextPage } = useRecords()

    await nextPage()

    expect(mockRecordsStore.goToPage).not.toHaveBeenCalled()
  })

  it('does not go to previous page if already on first page', async () => {
    mockRecordsStore.currentPage = 1
    mockRecordsStore.totalPages = 5

    const { previousPage } = useRecords()

    await previousPage()

    expect(mockRecordsStore.goToPage).not.toHaveBeenCalled()
  })

  it('delegates changeMonth to store', async () => {
    const { changeMonth } = useRecords()
    const month = '2024-02'

    await changeMonth(month)

    expect(mockRecordsStore.changeMonth).toHaveBeenCalledWith(month)
  })

  it('delegates previousMonth to store', async () => {
    const { previousMonth } = useRecords()

    await previousMonth()

    expect(mockRecordsStore.previousMonth).toHaveBeenCalled()
  })

  it('delegates nextMonth to store', async () => {
    const { nextMonth } = useRecords()

    await nextMonth()

    expect(mockRecordsStore.nextMonth).toHaveBeenCalled()
  })

  it('delegates refresh methods to store', async () => {
    const { refreshRecords, refreshSummary, refreshAll } = useRecords()

    await refreshRecords()
    expect(mockRecordsStore.refreshRecords).toHaveBeenCalled()

    await refreshSummary()
    expect(mockRecordsStore.refreshSummary).toHaveBeenCalled()

    await refreshAll()
    expect(mockRecordsStore.refreshAll).toHaveBeenCalled()
  })

  it('implements filterByDateRange correctly', async () => {
    const { filterByDateRange } = useRecords()
    const startDate = '2024-01-01'
    const endDate = '2024-01-31'

    await filterByDateRange(startDate, endDate)

    expect(mockRecordsStore.applyFilters).toHaveBeenCalledWith({
      startDate,
      endDate
    })
  })

  it('implements filterByEmployee correctly', async () => {
    const { filterByEmployee } = useRecords()
    const employeeId = 123

    await filterByEmployee(employeeId)

    expect(mockRecordsStore.applyFilters).toHaveBeenCalledWith({
      employeeId
    })
  })

  it('implements filterByStatus correctly', async () => {
    const { filterByStatus } = useRecords()
    const status = 'PRESENT'

    await filterByStatus(status)

    expect(mockRecordsStore.applyFilters).toHaveBeenCalledWith({
      status
    })
  })

  it('delegates cache management to store', () => {
    const { clearCache, clearError } = useRecords()

    clearCache()
    expect(mockRecordsStore.clearCache).toHaveBeenCalled()

    clearError()
    expect(mockRecordsStore.clearError).toHaveBeenCalled()
  })

  it('initializes month on mount', () => {
    useRecords()

    expect(mockRecordsStore.initializeMonth).toHaveBeenCalled()
  })
})