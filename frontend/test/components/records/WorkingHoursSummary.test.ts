import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkingHoursSummary from '~/components/records/WorkingHoursSummary.vue'
import type { WorkingHoursSummary as SummaryType } from '~/types/attendance'

// Mock the composables
vi.mock('~/composables/useDateTime', () => ({
  useDateTime: () => ({
    formatHours: vi.fn((minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`),
    formatMonth: vi.fn((month: string) => {
      const [year, monthNum] = month.split('-')
      return `${year}年${monthNum}月`
    })
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'records.summary': 'サマリー',
        'records.monthlyOverview': `${params?.month || ''}の概要`,
        'records.totalHours': '合計時間',
        'records.requiredHours': '規定時間',
        'records.overtime': '超過時間',
        'records.shortage': '不足時間',
        'records.exact': '達成',
        'records.averageHours': '平均時間',
        'records.workingDays': `${params?.days || 0}日出勤`,
        'records.monthlyTarget': '月間目標',
        'records.perDay': '1日平均',
        'records.monthlyProgress': '月間進捗',
        'records.workedHours': '実働時間',
        'records.overtimeDescription': '規定時間を超過しています',
        'records.shortageDescription': '規定時間に不足しています',
        'records.exactDescription': '規定時間を達成しています',
        'records.weeklyBreakdown': '週別内訳',
        'records.week': '第',
        'records.noSummaryData': 'サマリーデータがありません',
        'records.noSummaryMessage': '選択した月のサマリーデータが見つかりません',
        'common.loading': '読み込み中...',
        'common.retry': '再試行'
      }
      return translations[key] || key
    })
  })
}))

// Mock components
vi.mock('~/components/ui/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['name', 'size'],
    template: '<span class="icon">{{ name }}</span>'
  }
}))

vi.mock('~/components/ui/Button.vue', () => ({
  default: {
    name: 'Button',
    props: ['variant', 'size', 'disabled'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')" :disabled="disabled"><slot /></button>'
  }
}))

vi.mock('~/components/ui/Card.vue', () => ({
  default: {
    name: 'Card',
    props: ['variant'],
    template: '<div class="card"><div class="card-content"><slot /></div></div>'
  }
}))

describe('WorkingHoursSummary Component', () => {
  const mockSummary: SummaryType = {
    employeeId: 1,
    month: '2024-01',
    totalWorkingMinutes: 9600, // 160 hours
    totalWorkingDays: 20,
    requiredMonthlyHours: 160,
    overUnderHours: 0,
    averageWorkingMinutes: 480 // 8 hours
  }

  const mockOvertimeSummary: SummaryType = {
    ...mockSummary,
    totalWorkingMinutes: 10800, // 180 hours
    overUnderHours: 20 // 20 hours overtime
  }

  const mockUndertimeSummary: SummaryType = {
    ...mockSummary,
    totalWorkingMinutes: 8400, // 140 hours
    overUnderHours: -20 // 20 hours shortage
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with summary data', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.working-hours-summary').exists()).toBe(true)
    expect(wrapper.find('.summary-content').exists()).toBe(true)
    expect(wrapper.findAll('.summary-card')).toHaveLength(4)
  })

  it('displays loading state', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: null,
        isLoading: true,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.loading-state').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.text()).toContain('読み込み中...')
  })

  it('displays error state', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: null,
        error: 'Network error',
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Network error')
  })

  it('displays empty state when no summary', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: null,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('サマリーデータがありません')
  })

  it('shows overtime styling for overtime summary', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockOvertimeSummary,
        selectedMonth: '2024-01'
      }
    })

    const summaryCards = wrapper.findAll('.summary-card')
    const overtimeCard = summaryCards.find(card => card.classes().includes('summary-card--over'))
    expect(overtimeCard).toBeTruthy()
  })

  it('shows undertime styling for undertime summary', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockUndertimeSummary,
        selectedMonth: '2024-01'
      }
    })

    const summaryCards = wrapper.findAll('.summary-card')
    const undertimeCard = summaryCards.find(card => card.classes().includes('summary-card--under'))
    expect(undertimeCard).toBeTruthy()
  })

  it('shows exact styling for exact time summary', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary,
        selectedMonth: '2024-01'
      }
    })

    const summaryCards = wrapper.findAll('.summary-card')
    const exactCard = summaryCards.find(card => card.classes().includes('summary-card--exact'))
    expect(exactCard).toBeTruthy()
  })

  it('displays progress bar correctly', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.progress-bar').exists()).toBe(true)
    expect(wrapper.find('.progress-fill').exists()).toBe(true)
  })

  it('shows overflow for overtime', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockOvertimeSummary,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.progress-overflow').exists()).toBe(true)
  })

  it('displays weekly breakdown chart', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.weekly-chart').exists()).toBe(true)
    expect(wrapper.findAll('.week-bar')).toHaveLength(4) // 4 weeks
  })

  it('emits month update when navigation buttons are clicked', async () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary,
        selectedMonth: '2024-01'
      }
    })

    const prevButton = wrapper.find('button').element
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:month')).toBeTruthy()
  })

  it('disables next month button for current month', () => {
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary,
        selectedMonth: currentMonth
      }
    })

    const buttons = wrapper.findAll('button')
    const nextButton = buttons[buttons.length - 1] // Last button should be next
    expect(nextButton.attributes('disabled')).toBeDefined()
  })

  it('emits refresh event when retry button is clicked', async () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: null,
        error: 'Network error',
        selectedMonth: '2024-01'
      }
    })

    const retryButton = wrapper.find('button:contains("再試行")')
    await retryButton.trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('calculates progress percentage correctly', () => {
    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: mockSummary, // 160 hours worked, 160 hours required = 100%
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.text()).toContain('100%')
  })

  it('shows correct progress fill class based on percentage', () => {
    const lowProgressSummary = {
      ...mockSummary,
      totalWorkingMinutes: 4800 // 80 hours = 50%
    }

    const wrapper = mount(WorkingHoursSummary, {
      props: {
        summary: lowProgressSummary,
        selectedMonth: '2024-01'
      }
    })

    expect(wrapper.find('.progress-fill--low').exists()).toBe(true)
  })
})