import { defineStore } from 'pinia'
import type { CorrectionRequest, CorrectionRequestsFilter, CorrectionRequestsSortOptions } from '~/types/correction'

interface CorrectionsState {
  corrections: CorrectionRequest[]
  selectedCorrection: CorrectionRequest | null
  isLoading: boolean
  isSubmitting: boolean
  isProcessing: boolean
  error: string | null
  
  // Pagination
  currentPage: number
  pageSize: number
  totalCount: number
  
  // Filters and sorting
  filters: CorrectionRequestsFilter
  sortOptions: CorrectionRequestsSortOptions
  
  // UI state
  showCorrectionForm: boolean
  showCorrectionDetails: boolean
  
  // Stats
  stats: {
    pending: number
    approved: number
    rejected: number
    total: number
  } | null
}

export const useCorrectionsStore = defineStore('corrections', {
  state: (): CorrectionsState => ({
    corrections: [],
    selectedCorrection: null,
    isLoading: false,
    isSubmitting: false,
    isProcessing: false,
    error: null,
    
    // Pagination
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    
    // Filters and sorting
    filters: {},
    sortOptions: {
      field: 'requestDate',
      direction: 'desc'
    },
    
    // UI state
    showCorrectionForm: false,
    showCorrectionDetails: false,
    
    // Stats
    stats: null
  }),

  getters: {
    totalPages: (state): number => Math.ceil(state.totalCount / state.pageSize),
    
    hasFilters: (state): boolean => {
      return !!(
        state.filters.employeeId ||
        state.filters.status ||
        state.filters.startDate ||
        state.filters.endDate
      )
    },
    
    pendingCorrections: (state): CorrectionRequest[] => {
      return state.corrections.filter(c => c.status === 'PENDING')
    },
    
    approvedCorrections: (state): CorrectionRequest[] => {
      return state.corrections.filter(c => c.status === 'APPROVED')
    },
    
    rejectedCorrections: (state): CorrectionRequest[] => {
      return state.corrections.filter(c => c.status === 'REJECTED')
    },
    
    correctionsByEmployee: (state) => {
      return (employeeId: number): CorrectionRequest[] => {
        return state.corrections.filter(c => c.employeeId === employeeId)
      }
    },
    
    hasPendingCorrections: (state): boolean => {
      return state.corrections.some(c => c.status === 'PENDING')
    }
  },

  actions: {
    /**
     * 修正申請一覧を設定
     */
    setCorrections(corrections: CorrectionRequest[], totalCount: number, page: number) {
      this.corrections = corrections
      this.totalCount = totalCount
      this.currentPage = page
    },

    /**
     * 修正申請を追加
     */
    addCorrection(correction: CorrectionRequest) {
      this.corrections.unshift(correction)
      this.totalCount += 1
    },

    /**
     * 修正申請を更新
     */
    updateCorrection(id: number, updates: Partial<CorrectionRequest>) {
      const index = this.corrections.findIndex(c => c.id === id)
      if (index !== -1) {
        this.corrections[index] = { ...this.corrections[index], ...updates }
      }
      
      // Update selected correction if it's the same one
      if (this.selectedCorrection?.id === id) {
        this.selectedCorrection = { ...this.selectedCorrection, ...updates }
      }
    },

    /**
     * 修正申請を削除
     */
    removeCorrection(id: number) {
      const index = this.corrections.findIndex(c => c.id === id)
      if (index !== -1) {
        this.corrections.splice(index, 1)
        this.totalCount -= 1
      }
      
      // Clear selected correction if it's the same one
      if (this.selectedCorrection?.id === id) {
        this.selectedCorrection = null
      }
    },

    /**
     * 選択された修正申請を設定
     */
    setSelectedCorrection(correction: CorrectionRequest | null) {
      this.selectedCorrection = correction
    },

    /**
     * ローディング状態を設定
     */
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading
    },

    /**
     * 送信状態を設定
     */
    setSubmitting(isSubmitting: boolean) {
      this.isSubmitting = isSubmitting
    },

    /**
     * 処理状態を設定
     */
    setProcessing(isProcessing: boolean) {
      this.isProcessing = isProcessing
    },

    /**
     * エラーを設定
     */
    setError(error: string | null) {
      this.error = error
    },

    /**
     * フィルターを設定
     */
    setFilters(filters: CorrectionRequestsFilter) {
      this.filters = { ...filters }
      this.currentPage = 1 // Reset to first page when filters change
    },

    /**
     * ソートオプションを設定
     */
    setSortOptions(sortOptions: CorrectionRequestsSortOptions) {
      this.sortOptions = { ...sortOptions }
      this.currentPage = 1 // Reset to first page when sort changes
    },

    /**
     * ページを設定
     */
    setCurrentPage(page: number) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
      }
    },

    /**
     * ページサイズを設定
     */
    setPageSize(pageSize: number) {
      this.pageSize = pageSize
      this.currentPage = 1 // Reset to first page when page size changes
    },

    /**
     * フィルターをリセット
     */
    resetFilters() {
      this.filters = {}
      this.currentPage = 1
    },

    /**
     * 修正申請フォームの表示状態を設定
     */
    setShowCorrectionForm(show: boolean) {
      this.showCorrectionForm = show
    },

    /**
     * 修正申請詳細の表示状態を設定
     */
    setShowCorrectionDetails(show: boolean) {
      this.showCorrectionDetails = show
    },

    /**
     * 統計情報を設定
     */
    setStats(stats: { pending: number; approved: number; rejected: number; total: number }) {
      this.stats = stats
    },

    /**
     * 修正申請の状態を更新（承認・却下時）
     */
    updateCorrectionStatus(id: number, status: 'APPROVED' | 'REJECTED') {
      const correction = this.corrections.find(c => c.id === id)
      if (correction) {
        correction.status = status
        correction.processedDate = new Date().toISOString()
      }
      
      // Update selected correction if it's the same one
      if (this.selectedCorrection?.id === id) {
        this.selectedCorrection.status = status
        this.selectedCorrection.processedDate = new Date().toISOString()
      }
      
      // Update stats if available
      if (this.stats) {
        if (status === 'APPROVED') {
          this.stats.approved += 1
          this.stats.pending -= 1
        } else if (status === 'REJECTED') {
          this.stats.rejected += 1
          this.stats.pending -= 1
        }
      }
    },

    /**
     * 状態をリセット
     */
    reset() {
      this.corrections = []
      this.selectedCorrection = null
      this.isLoading = false
      this.isSubmitting = false
      this.isProcessing = false
      this.error = null
      this.currentPage = 1
      this.totalCount = 0
      this.filters = {}
      this.sortOptions = {
        field: 'requestDate',
        direction: 'desc'
      }
      this.showCorrectionForm = false
      this.showCorrectionDetails = false
      this.stats = null
    },

    /**
     * 特定の従業員の修正申請をフィルター
     */
    filterByEmployee(employeeId: number) {
      this.setFilters({ ...this.filters, employeeId })
    },

    /**
     * 特定の状態の修正申請をフィルター
     */
    filterByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
      this.setFilters({ ...this.filters, status })
    },

    /**
     * 日付範囲で修正申請をフィルター
     */
    filterByDateRange(startDate: string, endDate: string) {
      this.setFilters({ ...this.filters, startDate, endDate })
    }
  }
})