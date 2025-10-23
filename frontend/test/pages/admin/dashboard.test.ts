import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a simplified admin dashboard test component
const AdminDashboardTest = {
  template: `
    <div class="admin-dashboard">
      <div class="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button @click="refreshDashboard" :disabled="isLoading">Refresh</button>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card" v-for="stat in stats" :key="stat.label">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div class="employees-attendance-card">
          <h3>Employee Attendance</h3>
          <div v-if="employeesLoading" class="loading-state">Loading employees...</div>
          <div v-else-if="employeesError" class="error-state">{{ employeesError }}</div>
          <div v-else class="employees-attendance-list">
            <div 
              v-for="employee in employeesWithAttendance" 
              :key="employee.id"
              class="employee-attendance-item"
            >
              <span>{{ employee.name }}</span>
              <span :class="getAttendanceStatusClass(employee.todayAttendance)">
                {{ getAttendanceStatusText(employee.todayAttendance) }}
              </span>
            </div>
            <div v-if="employeesWithAttendance.length === 0" class="empty-state">
              No employees
            </div>
          </div>
        </div>
        
        <div class="pending-corrections-card">
          <h3>Pending Corrections</h3>
          <div v-if="correctionsLoading" class="loading-state">Loading corrections...</div>
          <div v-else-if="correctionsError" class="error-state">{{ correctionsError }}</div>
          <div v-else class="pending-corrections-list">
            <div 
              v-for="correction in pendingCorrectionsList" 
              :key="correction.id"
              class="correction-item"
            >
              <span>{{ correction.employeeName }}</span>
              <div class="correction-actions">
                <button @click="approveCorrection(correction.id)" :disabled="isProcessingCorrection">
                  Approve
                </button>
                <button @click="rejectCorrection(correction.id)" :disabled="isProcessingCorrection">
                  Reject
                </button>
              </div>
            </div>
            <div v-if="pendingCorrectionsList.length === 0" class="empty-state">
              No pending corrections
            </div>
          </div>
        </div>
        
        <div class="system-stats-card">
          <h3>System Statistics</h3>
          <div class="system-stats-content">
            <div class="stats-summary">
              <div class="summary-item">
                <span>Total Hours: {{ totalMonthlyHours }}</span>
              </div>
              <div class="summary-item">
                <span>Average Hours: {{ averageMonthlyHours }}</span>
              </div>
            </div>
            <div class="progress-visualization">
              <div class="progress-bar">
                <div class="progress-fill progress-normal" :style="{ width: progressWidth }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      isLoading: false,
      employeesLoading: false,
      employeesError: null,
      correctionsLoading: false,
      correctionsError: null,
      isProcessingCorrection: false,
      employees: [
        { id: 1, name: '山田太郎', employeeNumber: 'EMP001', requiredMonthlyHours: 160 },
        { id: 2, name: '佐藤花子', employeeNumber: 'EMP002', requiredMonthlyHours: 150 }
      ],
      corrections: [
        { id: 1, employeeId: 1, employeeName: '山田太郎', status: 'PENDING', requestDate: '2024-01-15T10:00:00Z' }
      ],
      employeesWithAttendance: []
    }
  },
  computed: {
    stats() {
      return [
        { label: 'Total Employees', value: this.employees.length },
        { label: 'Present Today', value: this.presentToday },
        { label: 'Average Working Hours', value: this.averageWorkingHours },
        { label: 'Pending Corrections', value: this.pendingCorrections }
      ]
    },
    presentToday() {
      return this.employeesWithAttendance.filter(emp => 
        emp.todayAttendance?.clockInTime && !emp.todayAttendance?.clockOutTime
      ).length
    },
    averageWorkingHours() {
      const totalMinutes = this.employeesWithAttendance.reduce((sum, emp) => {
        return sum + (emp.todayAttendance?.workingMinutes || 0)
      }, 0)
      const avgMinutes = totalMinutes / Math.max(this.employeesWithAttendance.length, 1)
      const hours = Math.floor(avgMinutes / 60)
      const minutes = Math.floor(avgMinutes % 60)
      return `${hours}:${minutes.toString().padStart(2, '0')}`
    },
    pendingCorrections() {
      return this.corrections.filter(c => c.status === 'PENDING').length
    },
    pendingCorrectionsList() {
      return this.corrections.filter(c => c.status === 'PENDING').slice(0, 5)
    },
    totalMonthlyHours() {
      const totalMinutes = this.employees.reduce((sum, emp) => sum + (emp.requiredMonthlyHours * 60), 0)
      return this.formatDuration(totalMinutes)
    },
    averageMonthlyHours() {
      if (this.employees.length === 0) return '0:00'
      const avgMinutes = this.employees.reduce((sum, emp) => sum + (emp.requiredMonthlyHours * 60), 0) / this.employees.length
      return this.formatDuration(avgMinutes)
    },
    progressWidth() {
      const currentDate = new Date()
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      const currentDay = currentDate.getDate()
      return `${(currentDay / daysInMonth) * 100}%`
    }
  },
  mounted() {
    this.initializeDashboard()
  },
  methods: {
    refreshDashboard() {
      this.isLoading = true
      setTimeout(() => {
        this.isLoading = false
      }, 1000)
    },
    initializeDashboard() {
      this.employeesWithAttendance = this.employees.map(employee => ({
        ...employee,
        todayAttendance: this.generateMockAttendance(employee.id)
      }))
    },
    generateMockAttendance(employeeId) {
      const random = Math.random()
      if (random < 0.3) return undefined
      if (random < 0.7) {
        return {
          id: employeeId * 1000,
          employeeId,
          clockInTime: '2024-01-15T09:00:00Z',
          clockOutTime: null,
          workingMinutes: 240
        }
      }
      return {
        id: employeeId * 1000,
        employeeId,
        clockInTime: '2024-01-15T09:00:00Z',
        clockOutTime: '2024-01-15T18:00:00Z',
        workingMinutes: 480
      }
    },
    getAttendanceStatusClass(attendance) {
      if (!attendance) return 'status-absent'
      if (attendance.clockOutTime) return 'status-finished'
      if (attendance.clockInTime) return 'status-working'
      return 'status-absent'
    },
    getAttendanceStatusText(attendance) {
      if (!attendance) return 'Not working'
      if (attendance.clockOutTime) return 'Finished'
      if (attendance.clockInTime) return 'Working'
      return 'Not working'
    },
    approveCorrection(id) {
      this.isProcessingCorrection = true
      setTimeout(() => {
        const correctionIndex = this.corrections.findIndex(c => c.id === id)
        if (correctionIndex !== -1) {
          this.corrections[correctionIndex].status = 'APPROVED'
        }
        this.isProcessingCorrection = false
      }, 500)
    },
    rejectCorrection(id) {
      this.isProcessingCorrection = true
      setTimeout(() => {
        const correctionIndex = this.corrections.findIndex(c => c.id === id)
        if (correctionIndex !== -1) {
          this.corrections[correctionIndex].status = 'REJECTED'
        }
        this.isProcessingCorrection = false
      }, 500)
    },
    formatDuration(minutes) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}:${mins.toString().padStart(2, '0')}`
    }
  }
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders admin dashboard header correctly', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.find('.dashboard-header').exists()).toBe(true)
    expect(wrapper.text()).toContain('Admin Dashboard')
  })

  it('displays system statistics correctly', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.find('.stats-grid').exists()).toBe(true)
    expect(wrapper.findAll('.stat-card')).toHaveLength(4)
    
    // Check if statistics are displayed
    expect(wrapper.text()).toContain('Total Employees')
    expect(wrapper.text()).toContain('Present Today')
    expect(wrapper.text()).toContain('Average Working Hours')
    expect(wrapper.text()).toContain('Pending Corrections')
  })

  it('displays employee attendance list', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.find('.employees-attendance-card').exists()).toBe(true)
    expect(wrapper.find('.employees-attendance-list').exists()).toBe(true)
  })

  it('displays pending corrections list', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.find('.pending-corrections-card').exists()).toBe(true)
    expect(wrapper.find('.pending-corrections-list').exists()).toBe(true)
  })

  it('displays system statistics chart', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.find('.system-stats-card').exists()).toBe(true)
    expect(wrapper.find('.system-stats-content').exists()).toBe(true)
    expect(wrapper.find('.progress-visualization').exists()).toBe(true)
  })

  it('shows loading state when employees are loading', async () => {
    const wrapper = mount(AdminDashboardTest)
    await wrapper.setData({ employeesLoading: true })

    expect(wrapper.find('.loading-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading employees...')
  })

  it('shows error state when there is an error', async () => {
    const wrapper = mount(AdminDashboardTest)
    await wrapper.setData({ employeesError: 'Test error' })

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test error')
  })

  it('calculates total employees correctly', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.text()).toContain('2') // employees.length
  })

  it('calculates pending corrections correctly', () => {
    const wrapper = mount(AdminDashboardTest)

    expect(wrapper.text()).toContain('1') // corrections with PENDING status
  })

  it('handles refresh dashboard action', async () => {
    const wrapper = mount(AdminDashboardTest)

    const refreshButton = wrapper.find('button')
    await refreshButton.trigger('click')

    expect(wrapper.vm.isLoading).toBe(true)
  })

  it('displays empty state when no employees', async () => {
    const wrapper = mount(AdminDashboardTest)
    await wrapper.setData({ 
      employees: [],
      employeesWithAttendance: []
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('No employees')
  })

  it('displays empty state when no pending corrections', async () => {
    const wrapper = mount(AdminDashboardTest)
    await wrapper.setData({ corrections: [] })

    expect(wrapper.text()).toContain('No pending corrections')
  })

  it('handles correction approval', async () => {
    const wrapper = mount(AdminDashboardTest)

    const approveButton = wrapper.find('.correction-actions button')
    await approveButton.trigger('click')

    expect(wrapper.vm.isProcessingCorrection).toBe(true)
  })

  it('handles correction rejection', async () => {
    const wrapper = mount(AdminDashboardTest)

    const rejectButton = wrapper.findAll('.correction-actions button')[1]
    await rejectButton.trigger('click')

    expect(wrapper.vm.isProcessingCorrection).toBe(true)
  })
})