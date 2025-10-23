export const useAttendance = () => {
  const attendanceStore = useAttendanceStore()
  const { t } = useI18n()

  // Reactive state
  const currentRecord = computed(() => attendanceStore.currentRecord)
  const isLoading = computed(() => attendanceStore.isLoading)
  const error = computed(() => attendanceStore.error)
  const isWorking = computed(() => attendanceStore.isWorking)
  const canClockIn = computed(() => attendanceStore.canClockIn)
  const canClockOut = computed(() => attendanceStore.canClockOut)
  const workingMinutes = computed(() => attendanceStore.workingMinutes)
  const statusMessage = computed(() => attendanceStore.statusMessage)
  const lastClockAction = computed(() => attendanceStore.lastClockAction)

  // Actions
  const fetchStatus = async () => {
    await attendanceStore.fetchAttendanceStatus()
  }

  const clockIn = async () => {
    // Show confirmation dialog
    const confirmed = await showConfirmDialog(
      t('attendance.confirmClockIn'),
      t('attendance.clockIn')
    )
    
    if (confirmed) {
      await attendanceStore.clockIn()
    }
  }

  const clockOut = async () => {
    // Show confirmation dialog
    const confirmed = await showConfirmDialog(
      t('attendance.confirmClockOut'),
      t('attendance.clockOut')
    )
    
    if (confirmed) {
      await attendanceStore.clockOut()
    }
  }

  const clearError = () => {
    attendanceStore.clearError()
  }

  // Helper function to show confirmation dialog
  const showConfirmDialog = async (message: string, title: string): Promise<boolean> => {
    // This is a simple implementation - in a real app you'd use a proper modal/dialog component
    return confirm(`${title}\n\n${message}`)
  }

  // Format working time for display
  const formatWorkingTime = computed(() => {
    const { formatDuration } = useDateTime()
    return formatDuration(workingMinutes.value)
  })

  // Get current clock in time formatted
  const clockInTimeFormatted = computed(() => {
    if (!currentRecord.value?.clockInTime) return null
    
    const { formatTime } = useDateTime()
    return formatTime(currentRecord.value.clockInTime)
  })

  // Get current clock out time formatted
  const clockOutTimeFormatted = computed(() => {
    if (!currentRecord.value?.clockOutTime) return null
    
    const { formatTime } = useDateTime()
    return formatTime(currentRecord.value.clockOutTime)
  })

  // Auto-refresh status periodically when working
  const { pause: pauseAutoRefresh, resume: resumeAutoRefresh } = useIntervalFn(
    async () => {
      if (isWorking.value && !isLoading.value) {
        await fetchStatus()
      }
    },
    30000, // Refresh every 30 seconds
    { immediate: false }
  )

  // Start auto-refresh when working
  watch(isWorking, (working) => {
    if (working) {
      resumeAutoRefresh()
    } else {
      pauseAutoRefresh()
    }
  })

  // Initialize on mount
  onMounted(async () => {
    await fetchStatus()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    pauseAutoRefresh()
  })

  return {
    // State
    currentRecord: readonly(currentRecord),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isWorking: readonly(isWorking),
    canClockIn: readonly(canClockIn),
    canClockOut: readonly(canClockOut),
    workingMinutes: readonly(workingMinutes),
    statusMessage: readonly(statusMessage),
    lastClockAction: readonly(lastClockAction),
    
    // Formatted data
    formatWorkingTime: readonly(formatWorkingTime),
    clockInTimeFormatted: readonly(clockInTimeFormatted),
    clockOutTimeFormatted: readonly(clockOutTimeFormatted),
    
    // Actions
    fetchStatus,
    clockIn,
    clockOut,
    clearError
  }
}