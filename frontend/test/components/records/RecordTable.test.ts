import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RecordTable from '~/components/records/RecordTable.vue'
import type { AttendanceRecord, AttendanceStatus } from '~/types/attendance'

// Mock the composables
vi.mock('~/composables/useDateTime', () => ({
  useDateTime: () => ({
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('ja-JP')),
    formatTime: vi.fn((time: string) => new Date(time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })),
    formatDuration: vi.fn((minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`),
    formatWeekday: vi.fn((date: string) => new Date(date).toLocaleDateString('ja-JP', { weekday: 'short' })),
    getCurrentDate: vi.fn(() => new Date())
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'records.title': '勤務記録',
        'records.totalRecords': `${params?.count || 0}件の記録`,
        'records.date': '日付',
        'records.clockInTime': '出勤時刻',
        'records.clockOutTime': '退勤時刻',
        'records.workingHours': '勤務時間',
        'records.status': '状態',
        'records.present': '出勤',
        'records.absent': '欠勤',
        'records.partial': '部分出勤',
        'records.noRecords': '記録がありません',
        'records.noRecordsMessage': '指定した期間の勤務記録が見つかりません',
        'common.loading': '読み込み中...',
        'common.retry': '再試行',
        'common.reset': 'リセット',
        'common.filter': 'フィルター',
        'common.previous': '前へ',
        'common.next': '次へ',
        'common.startDate': '開始日',
        'common.endDate': '終了日'
      }
      return translations[key] || key
    })
  })
}))

// Mock Icon component
vi.mock('~/components/ui/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['name', 'size'],
    template: '<span class="icon">{{ name }}</span>'
  }
}))

// Mock Input component
vi.mock('~/components/ui/Input.vue', () => ({
  default: {
    name: 'Input',
    props: ['modelValue', 'type', 'label', 'size'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}))

// Mock Button component
vi.mock('~/components/ui/Button.vue', () => ({
  default: {
    name: 'Button',
    props: ['variant', 'size', 'disabled'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')" :disabled="disabled"><slot /></button>'
  }
}))

describe('RecordTable Component', () => {
  const mockRecords: AttendanceRecord[] = [
    {
      id: 1,
      employeeId: 1,
      date: '2024-01-15',
      clockInTime: '2024-01-15T09:00:00Z',
      clockOutTime: '2024-01-15T18:00:00Z',
      workingMinutes: 480,
      status: 'PRESENT' as AttendanceStatus,
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T18:00:00Z'
    },
    {
      id: 2,
      employeeId: 1,
      date: '2024-01-16',
      clockInTime: '2024-01-16T09:30:00Z',
      clockOutTime: null,
      workingMinutes: 0,
      status: 'PARTIAL' as AttendanceStatus,
      createdAt: '2024-01-16T09:30:00Z',
      updatedAt: '2024-01-16T09:30:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with records data', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 2,
        currentPage: 1,
        pageSize: 20
      }
    })

    expect(wrapper.find('.records-table').exists()).toBe(true)
    expect(wrapper.findAll('.record-row')).toHaveLength(2)
  })

  it('displays loading state', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: [],
        isLoading: true,
        totalCount: 0
      }
    })

    expect(wrapper.find('.loading-state').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.text()).toContain('読み込み中...')
  })

  it('displays error state', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: [],
        error: 'Network error',
        totalCount: 0
      }
    })

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Network error')
  })

  it('displays empty state when no records', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: [],
        totalCount: 0
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('記録がありません')
  })

  it('emits sort event when header is clicked', async () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 2
      }
    })

    const dateHeader = wrapper.find('th[class*="sortable"]')
    await dateHeader.trigger('click')

    expect(wrapper.emitted('update:sort')).toBeTruthy()
    expect(wrapper.emitted('update:sort')?.[0]).toEqual([{
      field: 'date',
      direction: 'desc'
    }])
  })

  it('emits filter event when filters are applied', async () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 2
      }
    })

    const filterButton = wrapper.find('button:contains("フィルター")')
    await filterButton.trigger('click')

    expect(wrapper.emitted('update:filters')).toBeTruthy()
  })

  it('emits page event when pagination is used', async () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 50,
        currentPage: 1,
        pageSize: 20
      }
    })

    const nextButton = wrapper.find('button:contains("次へ")')
    await nextButton.trigger('click')

    expect(wrapper.emitted('update:page')).toBeTruthy()
    expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
  })

  it('displays correct status badges', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 2
      }
    })

    const statusBadges = wrapper.findAll('.status-badge')
    expect(statusBadges).toHaveLength(2)
    
    expect(statusBadges[0].classes()).toContain('status-badge--present')
    expect(statusBadges[1].classes()).toContain('status-badge--partial')
  })

  it('formats time and duration correctly', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 2
      }
    })

    const rows = wrapper.findAll('.record-row')
    
    // First row should have both clock in and out times
    expect(rows[0].find('.time-cell').text()).not.toBe('--')
    
    // Second row should show -- for clock out time
    const secondRowTimeCells = rows[1].findAll('.time-cell')
    expect(secondRowTimeCells[1].text()).toBe('--')
  })

  it('shows pagination when total pages > 1', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 50,
        currentPage: 1,
        pageSize: 20
      }
    })

    expect(wrapper.find('.pagination').exists()).toBe(true)
    expect(wrapper.findAll('.page-number')).toHaveLength(3) // Pages 1, 2, 3 visible
  })

  it('hides pagination when total pages <= 1', () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: mockRecords,
        totalCount: 10,
        currentPage: 1,
        pageSize: 20
      }
    })

    expect(wrapper.find('.pagination').exists()).toBe(false)
  })

  it('emits refresh event when retry button is clicked', async () => {
    const wrapper = mount(RecordTable, {
      props: {
        records: [],
        error: 'Network error',
        totalCount: 0
      }
    })

    const retryButton = wrapper.find('button:contains("再試行")')
    await retryButton.trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})