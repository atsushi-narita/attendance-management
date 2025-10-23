export interface AttendanceRecord {
  id: number
  employeeId: number
  date: string
  clockInTime: string | null
  clockOutTime: string | null
  workingMinutes: number
  status: AttendanceStatus
  createdAt: string
  updatedAt: string
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  PARTIAL = 'PARTIAL'
}

export interface AttendanceState {
  currentRecord: AttendanceRecord | null
  isLoading: boolean
  error: string | null
  lastClockAction: 'clock-in' | 'clock-out' | null
}

export interface ClockRequest {
  employeeId: number
  timestamp: string
}

export interface ClockResponse {
  success: boolean
  record: AttendanceRecord
  message: string
}

export interface AttendanceStatusResponse {
  isWorking: boolean
  currentRecord: AttendanceRecord | null
  workingMinutes: number
  clockInTime: string | null
}

export interface RecordsListResponse {
  records: AttendanceRecord[]
  totalCount: number
  page: number
  pageSize: number
}

export interface RecordsFilter {
  employeeId?: number
  startDate?: string
  endDate?: string
  status?: AttendanceStatus
}

export interface RecordsSortOptions {
  field: 'date' | 'clockInTime' | 'clockOutTime' | 'workingMinutes'
  direction: 'asc' | 'desc'
}

export interface WorkingHoursSummary {
  employeeId: number
  month: string
  totalWorkingMinutes: number
  totalWorkingDays: number
  requiredMonthlyHours: number
  overUnderHours: number
  averageWorkingMinutes: number
}