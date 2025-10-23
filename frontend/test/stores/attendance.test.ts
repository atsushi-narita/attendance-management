import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAttendanceStore } from '~/stores/attendance'

describe('Attendance Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('has correct initial state', () => {
      const store = useAttendanceStore()
      
      expect(store.currentRecord).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastClockAction).toBeNull()
    })
  })

  describe('getters', () => {
    it('isWorking returns false when no record', () => {
      const store = useAttendanceStore()
      expect(store.isWorking).toBe(false)
    })

    it('isWorking returns true when clocked in but not out', () => {
      const store = useAttendanceStore()
      store.currentRecord = {
        id: 1,
        employeeId: 1,
        date: '2023-10-22',
        clockInTime: '2023-10-22T09:00:00Z',
        clockOutTime: null,
        workingMinutes: 0,
        status: 'PRESENT' as any,
        createdAt: '2023-10-22T09:00:00Z',
        updatedAt: '2023-10-22T09:00:00Z'
      }
      
      expect(store.isWorking).toBe(true)
    })

    it('canClockIn returns true when not working', () => {
      const store = useAttendanceStore()
      expect(store.canClockIn).toBe(true)
    })

    it('canClockOut returns false when not working', () => {
      const store = useAttendanceStore()
      expect(store.canClockOut).toBe(false)
    })

    it('canClockOut returns true when working', () => {
      const store = useAttendanceStore()
      store.currentRecord = {
        id: 1,
        employeeId: 1,
        date: '2023-10-22',
        clockInTime: '2023-10-22T09:00:00Z',
        clockOutTime: null,
        workingMinutes: 0,
        status: 'PRESENT' as any,
        createdAt: '2023-10-22T09:00:00Z',
        updatedAt: '2023-10-22T09:00:00Z'
      }
      
      expect(store.canClockOut).toBe(true)
    })
  })

  describe('error handling', () => {
    it('handles authentication errors', () => {
      const store = useAttendanceStore()
      const error = { statusCode: 401 }
      const message = store.getErrorMessage(error)
      expect(message).toBe('errors.unauthorized')
    })

    it('handles already clocked in error', () => {
      const store = useAttendanceStore()
      const error = { 
        statusCode: 400, 
        data: { code: 'ATTENDANCE_001' } 
      }
      const message = store.getErrorMessage(error)
      expect(message).toBe('attendance.alreadyClockedIn')
    })

    it('handles not clocked in error', () => {
      const store = useAttendanceStore()
      const error = { 
        statusCode: 400, 
        data: { code: 'ATTENDANCE_002' } 
      }
      const message = store.getErrorMessage(error)
      expect(message).toBe('attendance.notClockedIn')
    })
  })

  describe('clearError', () => {
    it('clears error state', () => {
      const store = useAttendanceStore()
      store.error = 'Test error'
      
      store.clearError()
      
      expect(store.error).toBeNull()
    })
  })
})