import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDateTime } from '~/composables/useDateTime'

// Mock dayjs
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn((date?: any) => {
    const mockInstance = {
      format: vi.fn((format: string) => {
        if (format === 'YYYY年MM月DD日') return '2023年10月22日'
        if (format === 'HH:mm') return '09:30'
        if (format === 'YYYY年MM月DD日 HH:mm') return '2023年10月22日 09:30'
        if (format === 'YYYY年MM月DD日 (ddd)') return '2023年10月22日 (日)'
        return format
      }),
      fromNow: vi.fn(() => '2時間前'),
      isSame: vi.fn(() => true),
      isBefore: vi.fn(() => false),
      diff: vi.fn(() => 480), // 8 hours in minutes
      tz: vi.fn(() => mockInstance)
    }
    return mockInstance
  })
  
  mockDayjs.extend = vi.fn()
  mockDayjs.locale = vi.fn()
  mockDayjs.duration = vi.fn((value: number, unit: string) => ({
    asHours: vi.fn(() => Math.floor(value / 60)),
    minutes: vi.fn(() => value % 60)
  }))
  
  return {
    default: mockDayjs
  }
})

describe('useDateTime', () => {
  let dateTime: ReturnType<typeof useDateTime>

  beforeEach(() => {
    dateTime = useDateTime()
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const result = dateTime.formatDate('2023-10-22')
      expect(result).toBe('2023年10月22日')
    })

    it('returns empty string for invalid date', () => {
      const result = dateTime.formatDate('')
      expect(result).toBe('')
    })
  })

  describe('formatTime', () => {
    it('formats time correctly', () => {
      const result = dateTime.formatTime('2023-10-22T09:30:00')
      expect(result).toBe('09:30')
    })
  })

  describe('formatDateTime', () => {
    it('formats datetime correctly', () => {
      const result = dateTime.formatDateTime('2023-10-22T09:30:00')
      expect(result).toBe('2023年10月22日 09:30')
    })
  })

  describe('formatDuration', () => {
    it('formats duration in hours and minutes', () => {
      const result = dateTime.formatDuration(150) // 2.5 hours
      expect(result).toBe('2時間30分')
    })

    it('formats duration with only hours', () => {
      const result = dateTime.formatDuration(120) // 2 hours
      expect(result).toBe('2時間')
    })

    it('formats duration with only minutes', () => {
      const result = dateTime.formatDuration(30) // 30 minutes
      expect(result).toBe('30分')
    })

    it('handles zero duration', () => {
      const result = dateTime.formatDuration(0)
      expect(result).toBe('0時間0分')
    })

    it('handles negative duration', () => {
      const result = dateTime.formatDuration(-30)
      expect(result).toBe('0時間0分')
    })
  })

  describe('formatWorkingHours', () => {
    it('formats working hours correctly', () => {
      const result = dateTime.formatWorkingHours(480) // 8 hours
      expect(result).toBe('8.0時間')
    })

    it('handles fractional hours', () => {
      const result = dateTime.formatWorkingHours(510) // 8.5 hours
      expect(result).toBe('8.5時間')
    })
  })

  describe('parseTimeToMinutes', () => {
    it('parses time string to minutes', () => {
      const result = dateTime.parseTimeToMinutes('09:30')
      expect(result).toBe(570) // 9*60 + 30
    })

    it('handles empty string', () => {
      const result = dateTime.parseTimeToMinutes('')
      expect(result).toBe(0)
    })
  })

  describe('minutesToTimeString', () => {
    it('converts minutes to time string', () => {
      const result = dateTime.minutesToTimeString(570) // 9:30
      expect(result).toBe('09:30')
    })

    it('handles negative minutes', () => {
      const result = dateTime.minutesToTimeString(-30)
      expect(result).toBe('00:00')
    })
  })
})