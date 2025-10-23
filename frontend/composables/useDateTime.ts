import dayjs from 'dayjs'
import 'dayjs/locale/ja'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// Configure dayjs
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('ja')

export const useDateTime = () => {
  const { t } = useI18n()

  // Format date for display
  const formatDate = (date: string | Date | dayjs.Dayjs, format?: string): string => {
    if (!date) return ''
    
    const defaultFormat = 'YYYY年MM月DD日'
    return dayjs(date).format(format || defaultFormat)
  }

  // Format time for display
  const formatTime = (time: string | Date | dayjs.Dayjs, format?: string): string => {
    if (!time) return ''
    
    const defaultFormat = 'HH:mm'
    return dayjs(time).format(format || defaultFormat)
  }

  // Format datetime for display
  const formatDateTime = (datetime: string | Date | dayjs.Dayjs, format?: string): string => {
    if (!datetime) return ''
    
    const defaultFormat = 'YYYY年MM月DD日 HH:mm'
    return dayjs(datetime).format(format || defaultFormat)
  }

  // Format date with weekday
  const formatDateWithWeekday = (date: string | Date | dayjs.Dayjs): string => {
    if (!date) return ''
    
    return dayjs(date).format('YYYY年MM月DD日 (ddd)')
  }

  // Format relative time (e.g., "2時間前")
  const formatRelativeTime = (date: string | Date | dayjs.Dayjs): string => {
    if (!date) return ''
    
    return dayjs(date).fromNow()
  }

  // Format duration in hours and minutes
  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes < 0) return '0時間0分'
    
    const duration = dayjs.duration(minutes, 'minutes')
    const hours = Math.floor(duration.asHours())
    const mins = duration.minutes()
    
    if (hours === 0) {
      return `${mins}分`
    } else if (mins === 0) {
      return `${hours}時間`
    } else {
      return `${hours}時間${mins}分`
    }
  }

  // Format working hours (e.g., "8.5時間")
  const formatWorkingHours = (minutes: number): string => {
    if (!minutes || minutes < 0) return '0時間'
    
    const hours = minutes / 60
    return `${hours.toFixed(1)}時間`
  }

  // Get current date in Japan timezone
  const getCurrentDate = (): dayjs.Dayjs => {
    return dayjs().tz('Asia/Tokyo')
  }

  // Get current time string
  const getCurrentTimeString = (): string => {
    return getCurrentDate().format('HH:mm:ss')
  }

  // Get current date string
  const getCurrentDateString = (): string => {
    return getCurrentDate().format('YYYY年MM月DD日 (ddd)')
  }

  // Check if date is today
  const isToday = (date: string | Date | dayjs.Dayjs): boolean => {
    if (!date) return false
    
    return dayjs(date).isSame(getCurrentDate(), 'day')
  }

  // Check if date is this month
  const isThisMonth = (date: string | Date | dayjs.Dayjs): boolean => {
    if (!date) return false
    
    return dayjs(date).isSame(getCurrentDate(), 'month')
  }

  // Get month name in Japanese
  const getMonthName = (month: number): string => {
    const monthNames = [
      t('months.january'),
      t('months.february'),
      t('months.march'),
      t('months.april'),
      t('months.may'),
      t('months.june'),
      t('months.july'),
      t('months.august'),
      t('months.september'),
      t('months.october'),
      t('months.november'),
      t('months.december')
    ]
    
    return monthNames[month - 1] || ''
  }

  // Get weekday name in Japanese
  const getWeekdayName = (weekday: number): string => {
    const weekdayNames = [
      t('weekdays.sunday'),
      t('weekdays.monday'),
      t('weekdays.tuesday'),
      t('weekdays.wednesday'),
      t('weekdays.thursday'),
      t('weekdays.friday'),
      t('weekdays.saturday')
    ]
    
    return weekdayNames[weekday] || ''
  }

  // Parse time string to minutes since midnight
  const parseTimeToMinutes = (timeString: string): number => {
    if (!timeString) return 0
    
    const [hours, minutes] = timeString.split(':').map(Number)
    return (hours * 60) + minutes
  }

  // Convert minutes since midnight to time string
  const minutesToTimeString = (minutes: number): string => {
    if (minutes < 0) return '00:00'
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Calculate working minutes between two times
  const calculateWorkingMinutes = (clockIn: string | Date, clockOut: string | Date): number => {
    if (!clockIn || !clockOut) return 0
    
    const start = dayjs(clockIn)
    const end = dayjs(clockOut)
    
    if (end.isBefore(start)) return 0
    
    return end.diff(start, 'minutes')
  }

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatDateWithWeekday,
    formatRelativeTime,
    formatDuration,
    formatWorkingHours,
    getCurrentDate,
    getCurrentTimeString,
    getCurrentDateString,
    isToday,
    isThisMonth,
    getMonthName,
    getWeekdayName,
    parseTimeToMinutes,
    minutesToTimeString,
    calculateWorkingMinutes
  }
}