import { defineStore } from 'pinia'
import type { AttendanceState, AttendanceStatusResponse, ClockRequest, ClockResponse } from '~/types/attendance'

export const useAttendanceStore = defineStore('attendance', {
  state: (): AttendanceState => ({
    currentRecord: null,
    isLoading: false,
    error: null,
    lastClockAction: null
  }),

  getters: {
    isWorking: (state): boolean => {
      return state.currentRecord?.clockInTime != null && state.currentRecord?.clockOutTime == null
    },

    canClockIn: (state): boolean => {
      return !state.isLoading && (state.currentRecord == null || state.currentRecord.clockOutTime != null)
    },

    canClockOut: (state): boolean => {
      return !state.isLoading && state.currentRecord?.clockInTime != null && state.currentRecord?.clockOutTime == null
    },

    workingMinutes: (state): number => {
      if (!state.currentRecord?.clockInTime) return 0
      
      const { calculateWorkingMinutes, getCurrentDate } = useDateTime()
      const clockOutTime = state.currentRecord.clockOutTime || getCurrentDate().toISOString()
      
      return calculateWorkingMinutes(state.currentRecord.clockInTime, clockOutTime)
    },

    statusMessage: (state): string => {
      const { t } = useI18n()
      
      if (state.isLoading) return t('common.loading')
      if (state.error) return t('common.error')
      
      if (!state.currentRecord || state.currentRecord.clockOutTime) {
        return t('attendance.notWorking')
      } else if (state.currentRecord.clockInTime && !state.currentRecord.clockOutTime) {
        return t('attendance.working')
      } else {
        return t('attendance.finished')
      }
    }
  },

  actions: {
    async fetchAttendanceStatus(): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        const apiClient = useApiClient()
        const response = await apiClient.get<AttendanceStatusResponse>('/api/attendance/status')
        
        this.currentRecord = response.currentRecord
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        console.error('Failed to fetch attendance status:', error)
      } finally {
        this.isLoading = false
      }
    },

    async clockIn(): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        const { getCurrentDate } = useDateTime()
        const request: ClockRequest = {
          employeeId: parseInt(authStore.user.employeeNumber),
          timestamp: getCurrentDate().toISOString()
        }

        const apiClient = useApiClient()
        const response = await apiClient.post<ClockResponse>('/api/attendance/clock-in', request)

        if (response.success) {
          this.currentRecord = response.record
          this.lastClockAction = 'clock-in'
          
          // Show success notification
          const { success } = useGlobalNotification()
          const { t } = useI18n()
          success(t('attendance.clockInSuccess'))
        }
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        console.error('Failed to clock in:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async clockOut(): Promise<void> {
      this.isLoading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        const { getCurrentDate } = useDateTime()
        const request: ClockRequest = {
          employeeId: parseInt(authStore.user.employeeNumber),
          timestamp: getCurrentDate().toISOString()
        }

        const apiClient = useApiClient()
        const response = await apiClient.post<ClockResponse>('/api/attendance/clock-out', request)

        if (response.success) {
          this.currentRecord = response.record
          this.lastClockAction = 'clock-out'
          
          // Show success notification
          const { success } = useGlobalNotification()
          const { t } = useI18n()
          success(t('attendance.clockOutSuccess'))
        }
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        console.error('Failed to clock out:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    clearError(): void {
      this.error = null
    },

    getErrorMessage(error: any): string {
      const { t } = useI18n()
      
      if (error.statusCode === 400) {
        if (error.data?.code === 'ATTENDANCE_001') {
          return t('attendance.alreadyClockedIn')
        } else if (error.data?.code === 'ATTENDANCE_002') {
          return t('attendance.notClockedIn')
        }
      } else if (error.statusCode === 401) {
        return t('errors.unauthorized')
      } else if (error.statusCode === 403) {
        return t('errors.forbidden')
      } else if (error.statusCode === 500) {
        return t('errors.serverError')
      }
      
      return error.message || t('errors.unknownError')
    }
  }
})