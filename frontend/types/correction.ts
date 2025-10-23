export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CorrectionRequest {
  id: number
  employeeId: number
  originalRecordId: number
  requestedClockIn: string | null
  requestedClockOut: string | null
  reason: string
  status: CorrectionStatus
  requestDate: string
  processedDate: string | null
  createdAt: string
  updatedAt: string
  // Additional fields for display
  employeeName?: string
  originalClockIn?: string | null
  originalClockOut?: string | null
  originalDate?: string
}

export interface CorrectionRequestFormData {
  originalRecordId: number
  requestedClockIn: string | null
  requestedClockOut: string | null
  reason: string
}

export interface CorrectionRequestCreateRequest {
  originalRecordId: number
  requestedClockIn: string | null
  requestedClockOut: string | null
  reason: string
}

export interface CorrectionRequestsListResponse {
  corrections: CorrectionRequest[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CorrectionRequestsFilter {
  employeeId?: number
  status?: CorrectionStatus
  startDate?: string
  endDate?: string
}

export interface CorrectionRequestsSortOptions {
  field: 'requestDate' | 'processedDate' | 'status' | 'employeeName'
  direction: 'asc' | 'desc'
}

export interface CorrectionRequestValidationErrors {
  originalRecordId?: string
  requestedClockIn?: string
  requestedClockOut?: string
  reason?: string
}

export interface CorrectionApprovalRequest {
  id: number
  action: 'approve' | 'reject'
  comment?: string
}