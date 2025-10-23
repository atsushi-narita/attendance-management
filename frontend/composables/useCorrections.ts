import type {
    CorrectionApprovalRequest,
    CorrectionRequest,
    CorrectionRequestCreateRequest,
    CorrectionRequestsFilter,
    CorrectionRequestsListResponse,
    CorrectionRequestsSortOptions
} from '~/types/correction'

export const useCorrections = () => {
  const { $api } = useNuxtApp()
  const { showNotification } = useNotification()
  const { t } = useI18n()

  // State
  const corrections = ref<CorrectionRequest[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  // Pagination state
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalCount = ref(0)
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

  // Filter and sort state
  const filters = ref<CorrectionRequestsFilter>({})
  const sortOptions = ref<CorrectionRequestsSortOptions>({
    field: 'requestDate',
    direction: 'desc'
  })

  /**
   * 修正申請一覧を取得
   */
  const fetchCorrections = async (options?: {
    page?: number
    pageSize?: number
    filters?: CorrectionRequestsFilter
    sort?: CorrectionRequestsSortOptions
  }): Promise<CorrectionRequestsListResponse | null> => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      
      // Pagination
      if (options?.page) params.append('page', options.page.toString())
      if (options?.pageSize) params.append('pageSize', options.pageSize.toString())
      
      // Filters
      if (options?.filters?.employeeId) {
        params.append('employeeId', options.filters.employeeId.toString())
      }
      if (options?.filters?.status) {
        params.append('status', options.filters.status)
      }
      if (options?.filters?.startDate) {
        params.append('startDate', options.filters.startDate)
      }
      if (options?.filters?.endDate) {
        params.append('endDate', options.filters.endDate)
      }
      
      // Sort
      if (options?.sort) {
        params.append('sortField', options.sort.field)
        params.append('sortDirection', options.sort.direction)
      }

      const response = await $api<CorrectionRequestsListResponse>(`/api/corrections?${params.toString()}`, {
        method: 'GET'
      })

      if (response) {
        corrections.value = response.corrections
        totalCount.value = response.totalCount
        currentPage.value = response.page
        return response
      }

      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch corrections'
      showNotification({
        type: 'error',
        title: 'エラー',
        message: '修正申請の取得に失敗しました'
      })
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 修正申請を提出
   */
  const submitCorrectionRequest = async (data: CorrectionRequestCreateRequest): Promise<CorrectionRequest | null> => {
    isSubmitting.value = true
    error.value = null

    try {
      const response = await $api<CorrectionRequest>('/api/corrections', {
        method: 'POST',
        body: data
      })

      if (response) {
        showNotification({
          type: 'success',
          title: '成功',
          message: '修正申請を提出しました'
        })
        
        // Refresh the list if we're currently viewing corrections
        if (corrections.value.length > 0) {
          await refreshCorrections()
        }
        
        return response
      }

      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit correction request'
      showNotification({
        type: 'error',
        title: 'エラー',
        message: '修正申請の提出に失敗しました'
      })
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * 修正申請を承認
   */
  const approveCorrectionRequest = async (id: number, comment?: string): Promise<boolean> => {
    isProcessing.value = true
    error.value = null

    try {
      const requestData: CorrectionApprovalRequest = {
        id,
        action: 'approve',
        comment
      }

      await $api(`/api/corrections/${id}/approve`, {
        method: 'PUT',
        body: requestData
      })

      showNotification({
        type: 'success',
        title: '成功',
        message: '修正申請を承認しました'
      })

      // Update the local state
      const correctionIndex = corrections.value.findIndex(c => c.id === id)
      if (correctionIndex !== -1) {
        corrections.value[correctionIndex].status = 'APPROVED'
        corrections.value[correctionIndex].processedDate = new Date().toISOString()
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to approve correction request'
      showNotification({
        type: 'error',
        title: 'エラー',
        message: '修正申請の承認に失敗しました'
      })
      return false
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 修正申請を却下
   */
  const rejectCorrectionRequest = async (id: number, comment?: string): Promise<boolean> => {
    isProcessing.value = true
    error.value = null

    try {
      const requestData: CorrectionApprovalRequest = {
        id,
        action: 'reject',
        comment
      }

      await $api(`/api/corrections/${id}/reject`, {
        method: 'PUT',
        body: requestData
      })

      showNotification({
        type: 'success',
        title: '成功',
        message: '修正申請を却下しました'
      })

      // Update the local state
      const correctionIndex = corrections.value.findIndex(c => c.id === id)
      if (correctionIndex !== -1) {
        corrections.value[correctionIndex].status = 'REJECTED'
        corrections.value[correctionIndex].processedDate = new Date().toISOString()
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reject correction request'
      showNotification({
        type: 'error',
        title: 'エラー',
        message: '修正申請の却下に失敗しました'
      })
      return false
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 特定の修正申請を取得
   */
  const getCorrectionRequest = async (id: number): Promise<CorrectionRequest | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $api<CorrectionRequest>(`/api/corrections/${id}`, {
        method: 'GET'
      })

      return response || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch correction request'
      showNotification({
        type: 'error',
        title: 'エラー',
        message: '修正申請の取得に失敗しました'
      })
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 現在のフィルターと設定で修正申請一覧を再取得
   */
  const refreshCorrections = async (): Promise<void> => {
    await fetchCorrections({
      page: currentPage.value,
      pageSize: pageSize.value,
      filters: filters.value,
      sort: sortOptions.value
    })
  }

  /**
   * フィルターを適用
   */
  const applyFilters = async (newFilters: CorrectionRequestsFilter): Promise<void> => {
    filters.value = { ...newFilters }
    currentPage.value = 1
    await refreshCorrections()
  }

  /**
   * ソートを適用
   */
  const applySorting = async (newSort: CorrectionRequestsSortOptions): Promise<void> => {
    sortOptions.value = { ...newSort }
    currentPage.value = 1
    await refreshCorrections()
  }

  /**
   * ページを変更
   */
  const goToPage = async (page: number): Promise<void> => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
      await refreshCorrections()
    }
  }

  /**
   * フィルターをリセット
   */
  const resetFilters = async (): Promise<void> => {
    filters.value = {}
    currentPage.value = 1
    await refreshCorrections()
  }

  /**
   * 修正申請の状態表示名を取得
   */
  const getStatusDisplayName = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return t('corrections.pending')
      case 'APPROVED':
        return t('corrections.approved')
      case 'REJECTED':
        return t('corrections.rejected')
      default:
        return status
    }
  }

  /**
   * 修正申請の状態に応じたCSSクラスを取得
   */
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'status-pending'
      case 'APPROVED':
        return 'status-approved'
      case 'REJECTED':
        return 'status-rejected'
      default:
        return 'status-unknown'
    }
  }

  /**
   * バリデーション: 修正申請データの検証
   */
  const validateCorrectionRequest = (data: CorrectionRequestCreateRequest): string[] => {
    const errors: string[] = []

    if (!data.originalRecordId || data.originalRecordId <= 0) {
      errors.push('対象の勤務記録が選択されていません')
    }

    if (!data.requestedClockIn && !data.requestedClockOut) {
      errors.push('出勤時刻または退勤時刻のいずれかは必須です')
    }

    if (data.requestedClockIn && data.requestedClockOut) {
      const clockIn = new Date(data.requestedClockIn)
      const clockOut = new Date(data.requestedClockOut)
      
      if (clockIn >= clockOut) {
        errors.push('出勤時刻は退勤時刻より前である必要があります')
      }
    }

    if (!data.reason || data.reason.trim().length < 10) {
      errors.push('修正理由は10文字以上で入力してください')
    }

    if (data.reason && data.reason.trim().length > 500) {
      errors.push('修正理由は500文字以内で入力してください')
    }

    return errors
  }

  /**
   * 統計情報を取得
   */
  const getCorrectionStats = async (): Promise<{
    pending: number
    approved: number
    rejected: number
    total: number
  } | null> => {
    try {
      const response = await $api<{
        pending: number
        approved: number
        rejected: number
        total: number
      }>('/api/corrections/stats', {
        method: 'GET'
      })

      return response || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch correction stats'
      return null
    }
  }

  return {
    // State
    corrections: readonly(corrections),
    isLoading: readonly(isLoading),
    isSubmitting: readonly(isSubmitting),
    isProcessing: readonly(isProcessing),
    error: readonly(error),
    
    // Pagination
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    totalCount: readonly(totalCount),
    totalPages,
    
    // Filter and sort
    filters: readonly(filters),
    sortOptions: readonly(sortOptions),
    
    // Methods
    fetchCorrections,
    submitCorrectionRequest,
    approveCorrectionRequest,
    rejectCorrectionRequest,
    getCorrectionRequest,
    refreshCorrections,
    applyFilters,
    applySorting,
    goToPage,
    resetFilters,
    
    // Utilities
    getStatusDisplayName,
    getStatusClass,
    validateCorrectionRequest,
    getCorrectionStats
  }
}