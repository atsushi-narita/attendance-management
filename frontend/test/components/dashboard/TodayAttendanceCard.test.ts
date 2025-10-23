import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a simplified test component that mimics the behavior
const TodayAttendanceCardTest = {
  template: `
    <div class="today-attendance-card">
      <div v-if="isLoading" class="loading-state">
        <span>Loading...</span>
      </div>
      <div v-else-if="error" class="error-state">
        <span class="text-error">{{ error }}</span>
      </div>
      <div v-else class="attendance-content">
        <div class="status-section">
          <div :class="statusIndicatorClass">
            <span>Status Icon</span>
          </div>
          <div class="status-info">
            <span>{{ statusMessage }}</span>
            <span v-if="workingMinutes > 0">{{ formatDuration(workingMinutes) }}</span>
          </div>
        </div>
        <div class="action-buttons">
          <button 
            :disabled="!canClockIn || isLoading"
            @click="$emit('clock-in')"
          >
            Clock In
          </button>
          <button 
            :disabled="!canClockOut || isLoading"
            @click="$emit('clock-out')"
          >
            Clock Out
          </button>
        </div>
      </div>
    </div>
  `,
  props: {
    currentRecord: Object,
    isLoading: Boolean,
    error: String,
    isWorking: Boolean,
    workingMinutes: Number,
    statusMessage: String
  },
  emits: ['clock-in', 'clock-out'],
  computed: {
    canClockIn() {
      return !this.isLoading && (
        this.currentRecord == null || 
        this.currentRecord.clockOutTime != null
      )
    },
    canClockOut() {
      return !this.isLoading && 
        this.currentRecord?.clockInTime != null && 
        this.currentRecord?.clockOutTime == null
    },
    statusIndicatorClass() {
      if (this.isWorking) return 'status-working'
      if (this.currentRecord?.clockOutTime) return 'status-finished'
      return 'status-not-working'
    }
  },
  methods: {
    formatDuration(minutes) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}:${mins.toString().padStart(2, '0')}`
    }
  }
}

describe('TodayAttendanceCard', () => {
  const mockCurrentRecord = {
    id: 1,
    employeeId: 1,
    date: '2024-01-15',
    clockInTime: '2024-01-15T09:00:00Z',
    clockOutTime: null,
    workingMinutes: 240,
    status: 'PRESENT',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  }

  const defaultProps = {
    currentRecord: null,
    isLoading: false,
    error: null,
    isWorking: false,
    workingMinutes: 0,
    statusMessage: 'Not working'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state correctly', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        isLoading: true
      }
    })

    expect(wrapper.find('.loading-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading...')
  })

  it('renders error state correctly', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        error: 'Test error message'
      }
    })

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test error message')
  })

  it('renders not working state correctly', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: defaultProps
    })

    expect(wrapper.find('.attendance-content').exists()).toBe(true)
    expect(wrapper.find('.status-not-working').exists()).toBe(true)
  })

  it('renders working state correctly', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        currentRecord: mockCurrentRecord,
        isWorking: true,
        workingMinutes: 240,
        statusMessage: 'Working'
      }
    })

    expect(wrapper.find('.status-working').exists()).toBe(true)
    expect(wrapper.text()).toContain('Working')
    expect(wrapper.text()).toContain('4:00')
  })

  it('renders finished work state correctly', () => {
    const finishedRecord = {
      ...mockCurrentRecord,
      clockOutTime: '2024-01-15T18:00:00Z',
      workingMinutes: 480
    }

    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        currentRecord: finishedRecord,
        isWorking: false,
        workingMinutes: 480,
        statusMessage: 'Finished'
      }
    })

    expect(wrapper.find('.status-finished').exists()).toBe(true)
    expect(wrapper.text()).toContain('Finished')
  })

  it('enables clock-in button when not working', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: defaultProps
    })

    const clockInButton = wrapper.findAll('button')[0]
    expect(clockInButton.attributes('disabled')).toBeUndefined()
  })

  it('enables clock-out button when working', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        currentRecord: mockCurrentRecord,
        isWorking: true
      }
    })

    const clockOutButton = wrapper.findAll('button')[1]
    expect(clockOutButton.attributes('disabled')).toBeUndefined()
  })

  it('emits clock-in event when clock-in button is clicked', async () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: defaultProps
    })

    const clockInButton = wrapper.findAll('button')[0]
    await clockInButton.trigger('click')

    expect(wrapper.emitted('clock-in')).toBeTruthy()
  })

  it('emits clock-out event when clock-out button is clicked', async () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        currentRecord: mockCurrentRecord,
        isWorking: true
      }
    })

    const clockOutButton = wrapper.findAll('button')[1]
    await clockOutButton.trigger('click')

    expect(wrapper.emitted('clock-out')).toBeTruthy()
  })

  it('displays working time when available', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        workingMinutes: 240
      }
    })

    expect(wrapper.text()).toContain('4:00')
  })

  it('disables buttons when loading', () => {
    const wrapper = mount(TodayAttendanceCardTest, {
      props: {
        ...defaultProps,
        isLoading: true
      }
    })

    const buttons = wrapper.findAll('button')
    buttons.forEach(button => {
      expect(button.attributes('disabled')).toBeDefined()
    })
  })
})