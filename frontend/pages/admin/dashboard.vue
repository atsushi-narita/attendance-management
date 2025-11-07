<template>
  <div class="admin-dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="large-title">{{ t('dashboard.title') }} - {{ t('employee.roles.admin') }}</h1>
        <p class="subhead">{{ t('dashboard.statistics.totalEmployees') }}: {{ totalEmployees }}人</p>
      </div>
      <div class="header-actions">
        <Button
          variant="secondary"
          @click="refreshDashboard"
          :disabled="isLoading"
        >
          <Icon name="arrow.clockwise" size="16" />
          {{ t('common.refresh') }}
        </Button>
      </div>
    </div>

    <!-- System Statistics Cards -->
    <div class="stats-grid">
      <Card variant="elevated" class="stat-card">
        <div class="stat-content">
          <Icon name="person.2.fill" size="32" color="var(--color-primary)" />
          <div class="stat-info">
            <span class="stat-value">{{ totalEmployees }}</span>
            <span class="stat-label">{{ t('dashboard.statistics.totalEmployees') }}</span>
          </div>
        </div>
      </Card>

      <Card variant="elevated" class="stat-card">
        <div class="stat-content">
          <Icon name="checkmark.circle.fill" size="32" color="var(--color-success)" />
          <div class="stat-info">
            <span class="stat-value">{{ presentToday }}</span>
            <span class="stat-label">{{ t('dashboard.statistics.presentToday') }}</span>
          </div>
        </div>
      </Card>

      <Card variant="elevated" class="stat-card">
        <div class="stat-content">
          <Icon name="clock.fill" size="32" color="var(--color-warning)" />
          <div class="stat-info">
            <span class="stat-value">{{ averageWorkingHours }}</span>
            <span class="stat-label">{{ t('dashboard.statistics.averageWorkingHours') }}</span>
          </div>
        </div>
      </Card>

      <Card variant="elevated" class="stat-card">
        <div class="stat-content">
          <Icon name="doc.text.fill" size="32" color="var(--color-error)" />
          <div class="stat-info">
            <span class="stat-value">{{ pendingCorrections }}</span>
            <span class="stat-label">{{ t('dashboard.statistics.pendingCorrections') }}</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Main Dashboard Content -->
    <div class="dashboard-content">
      <!-- All Employees Attendance Status -->
      <Card variant="elevated" class="employees-attendance-card">
        <template #header>
          <div class="card-header-with-actions">
            <h3 class="title3">{{ t('dashboard.todayAttendance') }} - {{ t('common.all') }}</h3>
            <NuxtLink to="/admin/employees" class="view-all-link">
              <Icon name="arrow.right" size="16" />
              {{ t('employee.title') }}
            </NuxtLink>
          </div>
        </template>

        <div v-if="employeesLoading" class="loading-state">
          <Icon name="arrow.clockwise" size="24" class="loading-spinner" />
          <span class="body">{{ t('common.loading') }}</span>
        </div>

        <div v-else-if="employeesError" class="error-state">
          <Icon name="exclamationmark.triangle" size="24" color="var(--color-error)" />
          <span class="body text-error">{{ employeesError }}</span>
        </div>

        <div v-else class="employees-attendance-list">
          <div 
            v-for="employee in employeesWithAttendance" 
            :key="employee.id"
            class="employee-attendance-item"
          >
            <div class="employee-info">
              <Icon name="person.circle.fill" size="24" :class="getEmployeeStatusClass(employee)" />
              <div class="employee-details">
                <span class="body">{{ employee.name }}</span>
                <span class="caption2 text-secondary">{{ employee.employeeNumber }}</span>
              </div>
            </div>
            
            <div class="attendance-status">
              <div class="status-indicator" :class="getAttendanceStatusClass(employee.todayAttendance)">
                <Icon :name="getAttendanceStatusIcon(employee.todayAttendance)" size="16" />
              </div>
              <div class="status-details">
                <span class="footnote">{{ getAttendanceStatusText(employee.todayAttendance) }}</span>
                <span v-if="employee.todayAttendance?.workingMinutes" class="caption2 text-secondary">
                  {{ formatDuration(employee.todayAttendance.workingMinutes) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="employeesWithAttendance.length === 0" class="empty-state">
            <Icon name="person.2" size="24" color="var(--color-text-tertiary)" />
            <span class="body text-secondary">{{ t('employee.noEmployees') }}</span>
          </div>
        </div>
      </Card>

      <!-- Pending Correction Requests -->
      <Card variant="elevated" class="pending-corrections-card">
        <template #header>
          <div class="card-header-with-actions">
            <h3 class="title3">{{ t('corrections.pending') }}</h3>
            <NuxtLink to="/corrections" class="view-all-link">
              <Icon name="arrow.right" size="16" />
              {{ t('corrections.title') }}
            </NuxtLink>
          </div>
        </template>

        <div v-if="correctionsLoading" class="loading-state">
          <Icon name="arrow.clockwise" size="24" class="loading-spinner" />
          <span class="body">{{ t('common.loading') }}</span>
        </div>

        <div v-else-if="correctionsError" class="error-state">
          <Icon name="exclamationmark.triangle" size="24" color="var(--color-error)" />
          <span class="body text-error">{{ correctionsError }}</span>
        </div>

        <div v-else class="pending-corrections-list">
          <div 
            v-for="correction in pendingCorrectionsList" 
            :key="correction.id"
            class="correction-item"
          >
            <div class="correction-info">
              <Icon name="doc.text" size="20" color="var(--color-warning)" />
              <div class="correction-details">
                <span class="body">{{ correction.employeeName }}</span>
                <span class="caption2 text-secondary">{{ formatDate(correction.requestDate) }}</span>
              </div>
            </div>
            
            <div class="correction-actions">
              <Button
                variant="success"
                size="small"
                @click="approveCorrection(correction.id)"
                :disabled="isProcessingCorrection"
              >
                <Icon name="checkmark" size="14" />
                {{ t('corrections.approve') }}
              </Button>
              <Button
                variant="error"
                size="small"
                @click="rejectCorrection(correction.id)"
                :disabled="isProcessingCorrection"
              >
                <Icon name="xmark" size="14" />
                {{ t('corrections.reject') }}
              </Button>
            </div>
          </div>

          <div v-if="pendingCorrectionsList.length === 0" class="empty-state">
            <Icon name="checkmark.circle" size="24" color="var(--color-success)" />
            <span class="body text-secondary">{{ t('corrections.noPendingRequests') }}</span>
          </div>
        </div>
      </Card>

      <!-- System Statistics Chart -->
      <Card variant="elevated" class="system-stats-card">
        <template #header>
          <h3 class="title3">{{ t('dashboard.monthlyOverview') }}</h3>
        </template>

        <div class="system-stats-content">
          <div class="stats-summary">
            <div class="summary-item">
              <span class="caption1 text-secondary">{{ t('records.totalHours') }}</span>
              <span class="title2">{{ totalMonthlyHours }}</span>
            </div>
            <div class="summary-item">
              <span class="caption1 text-secondary">{{ t('records.averageHours') }}</span>
              <span class="title2">{{ averageMonthlyHours }}</span>
            </div>
            <div class="summary-item">
              <span class="caption1 text-secondary">{{ t('records.workingDays') }}</span>
              <span class="title2">{{ averageWorkingDays }}日</span>
            </div>
          </div>

          <!-- Simple progress visualization -->
          <div class="progress-visualization">
            <div class="progress-header">
              <span class="caption1 text-secondary">{{ t('records.monthlyProgress') }}</span>
              <span class="caption1 text-secondary">{{ Math.round(systemProgressPercentage) }}%</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill progress-normal" 
                :style="{ width: `${Math.min(systemProgressPercentage, 100)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AttendanceRecord } from '~/types/attendance'
import type { Employee } from '~/types/employee'

// Meta
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// Composables
const { t } = useI18n()
const { formatDate, formatDuration } = useDateTime()
const { canAccessAdmin } = useAuth()
const { 
  employees, 
  isLoading: employeesLoading, 
  error: employeesError,
  fetchEmployees 
} = useEmployees()
const {
  corrections,
  isLoading: correctionsLoading,
  error: correctionsError,
  isProcessing: isProcessingCorrection,
  fetchCorrections,
  approveCorrectionRequest,
  rejectCorrectionRequest
} = useCorrections()

// Redirect if not admin
if (!canAccessAdmin.value) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Access denied'
  })
}

// Local state
const isLoading = ref(false)
const employeesWithAttendance = ref<(Employee & { todayAttendance?: AttendanceRecord })[]>([])

// Page meta
useHead({
  title: `${t('dashboard.title')} - ${t('employee.roles.admin')} - 勤怠管理システム`
})

// Computed
const totalEmployees = computed(() => employees.value.length)

const presentToday = computed(() => {
  return employeesWithAttendance.value.filter(emp => 
    emp.todayAttendance?.clockInTime && !emp.todayAttendance?.clockOutTime
  ).length
})

const averageWorkingHours = computed(() => {
  const totalMinutes = employeesWithAttendance.value.reduce((sum, emp) => {
    return sum + (emp.todayAttendance?.workingMinutes || 0)
  }, 0)
  
  const avgMinutes = totalMinutes / Math.max(employeesWithAttendance.value.length, 1)
  const hours = Math.floor(avgMinutes / 60)
  const minutes = Math.floor(avgMinutes % 60)
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`
})

const pendingCorrections = computed(() => {
  return corrections.value.filter(c => c.status === 'PENDING').length
})

const pendingCorrectionsList = computed(() => {
  return corrections.value
    .filter(c => c.status === 'PENDING')
    .slice(0, 5) // Show only first 5
})

const totalMonthlyHours = computed(() => {
  const totalMinutes = employeesWithAttendance.value.reduce((sum, emp) => {
    // This would be calculated from monthly records in a real implementation
    return sum + (emp.requiredMonthlyHours * 60)
  }, 0)
  
  return formatDuration(totalMinutes)
})

const averageMonthlyHours = computed(() => {
  if (employeesWithAttendance.value.length === 0) return '0:00'
  
  const avgMinutes = employeesWithAttendance.value.reduce((sum, emp) => {
    return sum + (emp.requiredMonthlyHours * 60)
  }, 0) / employeesWithAttendance.value.length
  
  return formatDuration(avgMinutes)
})

const averageWorkingDays = computed(() => {
  // This would be calculated from actual attendance data
  // For now, estimate based on required hours (assuming 8 hours per day)
  const avgHours = employeesWithAttendance.value.reduce((sum, emp) => {
    return sum + emp.requiredMonthlyHours
  }, 0) / Math.max(employeesWithAttendance.value.length, 1)
  
  return Math.round(avgHours / 8)
})

const systemProgressPercentage = computed(() => {
  // This would be calculated based on actual monthly progress
  // For now, return a placeholder value
  const currentDate = new Date()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const currentDay = currentDate.getDate()
  
  return (currentDay / daysInMonth) * 100
})

// Methods
const refreshDashboard = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      fetchEmployees(),
      fetchCorrections({ filters: { status: 'PENDING' } }),
      fetchTodayAttendance()
    ])
  } catch (error) {
    console.error('Failed to refresh admin dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchTodayAttendance = async () => {
  try {
    // In a real implementation, this would fetch today's attendance for all employees
    // For now, we'll simulate some data
    employeesWithAttendance.value = employees.value.map(employee => ({
      ...employee,
      todayAttendance: generateMockAttendance(employee.id)
    }))
  } catch (error) {
    console.error('Failed to fetch today attendance:', error)
  }
}

const generateMockAttendance = (employeeId: number): AttendanceRecord | undefined => {
  // Generate mock attendance data for demonstration
  const random = Math.random()
  
  if (random < 0.3) {
    // Not clocked in yet
    return undefined
  } else if (random < 0.7) {
    // Currently working
    const clockInTime = new Date()
    clockInTime.setHours(9, 0, 0, 0)
    
    return {
      id: employeeId * 1000,
      employeeId,
      date: new Date().toISOString().split('T')[0],
      clockInTime: clockInTime.toISOString(),
      clockOutTime: null,
      workingMinutes: Math.floor((Date.now() - clockInTime.getTime()) / (1000 * 60)),
      status: 'PRESENT',
      createdAt: clockInTime.toISOString(),
      updatedAt: clockInTime.toISOString()
    }
  } else {
    // Finished work
    const clockInTime = new Date()
    clockInTime.setHours(9, 0, 0, 0)
    const clockOutTime = new Date()
    clockOutTime.setHours(18, 0, 0, 0)
    
    return {
      id: employeeId * 1000,
      employeeId,
      date: new Date().toISOString().split('T')[0],
      clockInTime: clockInTime.toISOString(),
      clockOutTime: clockOutTime.toISOString(),
      workingMinutes: 480, // 8 hours
      status: 'PRESENT',
      createdAt: clockInTime.toISOString(),
      updatedAt: clockOutTime.toISOString()
    }
  }
}

const getEmployeeStatusClass = (employee: Employee & { todayAttendance?: AttendanceRecord }) => {
  if (!employee.todayAttendance) return 'text-tertiary'
  if (employee.todayAttendance.clockOutTime) return 'text-primary'
  if (employee.todayAttendance.clockInTime) return 'text-success'
  return 'text-tertiary'
}

const getAttendanceStatusClass = (attendance?: AttendanceRecord) => {
  if (!attendance) return 'status-absent'
  if (attendance.clockOutTime) return 'status-finished'
  if (attendance.clockInTime) return 'status-working'
  return 'status-absent'
}

const getAttendanceStatusIcon = (attendance?: AttendanceRecord) => {
  if (!attendance) return 'minus.circle'
  if (attendance.clockOutTime) return 'checkmark.circle.fill'
  if (attendance.clockInTime) return 'clock.fill'
  return 'minus.circle'
}

const getAttendanceStatusText = (attendance?: AttendanceRecord) => {
  if (!attendance) return t('attendance.notWorking')
  if (attendance.clockOutTime) return t('attendance.finished')
  if (attendance.clockInTime) return t('attendance.working')
  return t('attendance.notWorking')
}

const approveCorrection = async (id: number) => {
  const success = await approveCorrectionRequest(id)
  if (success) {
    await fetchCorrections({ filters: { status: 'PENDING' } })
  }
}

const rejectCorrection = async (id: number) => {
  const success = await rejectCorrectionRequest(id)
  if (success) {
    await fetchCorrections({ filters: { status: 'PENDING' } })
  }
}

// Initialize dashboard data
onMounted(async () => {
  await refreshDashboard()
})

// Auto-refresh every 5 minutes
const { pause: pauseAutoRefresh } = useIntervalFn(
  async () => {
    if (!isLoading.value) {
      await fetchTodayAttendance()
    }
  },
  300000, // 5 minutes
  { immediate: false }
)

// Cleanup
onUnmounted(() => {
  pauseAutoRefresh()
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.header-content {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* Statistics Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  padding: var(--spacing-lg);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-value {
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--font-size-caption1);
  color: var(--color-text-secondary);
}

/* Dashboard Content */
.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--spacing-lg);
}

.employees-attendance-card {
  grid-column: 1;
  grid-row: 1;
}

.pending-corrections-card {
  grid-column: 2;
  grid-row: 1;
}

.system-stats-card {
  grid-column: 1 / -1;
  grid-row: 2;
}

/* Card Headers */
.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-primary);
  text-decoration: none;
  font-size: var(--font-size-caption1);
  font-weight: var(--font-weight-headline);
  transition: opacity 0.2s ease;
}

.view-all-link:hover {
  opacity: 0.7;
}

/* Loading and Error States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  text-align: center;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Employees Attendance List */
.employees-attendance-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 400px;
  overflow-y: auto;
}

.employee-attendance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.employee-attendance-item:hover {
  background-color: var(--color-surface);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.employee-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.attendance-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  color: white;
}

.status-working {
  background-color: var(--color-success);
}

.status-finished {
  background-color: var(--color-primary);
}

.status-absent {
  background-color: var(--color-text-tertiary);
}

.status-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  text-align: right;
}

/* Pending Corrections List */
.pending-corrections-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 400px;
  overflow-y: auto;
}

.correction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.correction-item:hover {
  background-color: var(--color-surface);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.correction-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.correction-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.correction-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* System Statistics */
.system-stats-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  text-align: center;
}

/* Progress Visualization */
.progress-visualization {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-bar {
  height: 12px;
  background-color: var(--color-surface-secondary);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-normal {
  background-color: var(--color-success);
}

/* Text Colors */
.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

/* Responsive Design */
@media (max-width: 1200px) {
  .dashboard-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  .employees-attendance-card {
    grid-column: 1;
    grid-row: 1;
  }

  .pending-corrections-card {
    grid-column: 1;
    grid-row: 2;
  }

  .system-stats-card {
    grid-column: 1;
    grid-row: 3;
  }
}

@media (max-width: 768px) {
  .admin-dashboard {
    padding: var(--spacing-md);
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-md);
  }

  .stats-summary {
    grid-template-columns: 1fr;
  }

  .employee-attendance-item,
  .correction-item {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }

  .attendance-status,
  .correction-actions {
    justify-content: center;
  }

  .status-details {
    text-align: center;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .stat-card {
    background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%);
  }
}
</style>