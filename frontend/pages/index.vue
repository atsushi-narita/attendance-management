<template>
  <div class="dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="large-title">{{ t('dashboard.title') }}</h1>
        <p class="subhead">{{ welcomeMessage }}</p>
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

    <!-- Today's Attendance Card -->
    <div class="today-attendance-section">
      <TodayAttendanceCard
        :current-record="currentRecord"
        :is-loading="attendanceLoading"
        :error="attendanceError"
        :is-working="isWorking"
        :working-minutes="workingMinutes"
        :status-message="statusMessage"
        @clock-in="handleClockIn"
        @clock-out="handleClockOut"
      />
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Monthly Summary -->
      <Card variant="elevated" class="monthly-summary-card">
        <template #header>
          <div class="card-header-with-actions">
            <h3 class="title3">{{ t('dashboard.thisMonthSummary') }}</h3>
            <NuxtLink to="/records" class="view-all-link">
              <Icon name="arrow.right" size="16" />
              {{ t('records.title') }}
            </NuxtLink>
          </div>
        </template>

        <div v-if="summaryLoading" class="loading-state">
          <Icon name="arrow.clockwise" size="24" class="loading-spinner" />
          <span class="body">{{ t('common.loading') }}</span>
        </div>

        <div v-else-if="summaryError" class="error-state">
          <Icon name="exclamationmark.triangle" size="24" color="var(--color-error)" />
          <span class="body text-error">{{ summaryError }}</span>
        </div>

        <div v-else-if="summary" class="summary-content">
          <div class="summary-stats">
            <div class="stat-item">
              <Icon name="calendar" size="20" class="stat-icon text-primary" />
              <div class="stat-info">
                <span class="caption1 text-secondary">{{ t('dashboard.workingDays') }}</span>
                <span class="headline">{{ summary.workingDays }}日</span>
              </div>
            </div>
            
            <div class="stat-item">
              <Icon name="clock.fill" size="20" class="stat-icon text-success" />
              <div class="stat-info">
                <span class="caption1 text-secondary">{{ t('dashboard.workingHours') }}</span>
                <span class="headline">{{ formatHours(summary.totalWorkingMinutes) }}</span>
              </div>
            </div>
            
            <div class="stat-item">
              <Icon name="target" size="20" class="stat-icon text-warning" />
              <div class="stat-info">
                <span class="caption1 text-secondary">{{ t('dashboard.requiredHours') }}</span>
                <span class="headline">{{ formatHours(summary.requiredMonthlyHours * 60) }}</span>
              </div>
            </div>
            
            <div class="stat-item">
              <Icon :name="overtimeIcon" size="20" :class="overtimeIconClass" />
              <div class="stat-info">
                <span class="caption1 text-secondary">{{ t('dashboard.overtime') }}</span>
                <span class="headline" :class="overtimeTextClass">{{ overtimeText }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-section">
            <div class="progress-header">
              <span class="caption1 text-secondary">{{ t('records.monthlyProgress') }}</span>
              <span class="caption1 text-secondary">{{ Math.round(progressPercentage) }}%</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${Math.min(progressPercentage, 100)}%` }"
                :class="progressBarClass"
              ></div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <Icon name="chart.bar" size="24" color="var(--color-text-tertiary)" />
          <span class="body text-secondary">{{ t('records.noSummaryData') }}</span>
        </div>
      </Card>

      <!-- Recent Activity -->
      <Card variant="elevated" class="recent-activity-card">
        <template #header>
          <h3 class="title3">{{ t('dashboard.recentActivity') }}</h3>
        </template>

        <div class="activity-list">
          <div v-if="recentRecords.length > 0">
            <div 
              v-for="record in recentRecords" 
              :key="record.id"
              class="activity-item"
            >
              <Icon 
                :name="getActivityIcon(record)" 
                size="16" 
                :class="getActivityIconClass(record)" 
              />
              <div class="activity-content">
                <span class="footnote">{{ getActivityMessage(record) }}</span>
                <span class="caption2 text-tertiary">{{ formatRelativeTime(record.date) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-activity">
            <Icon name="clock" size="16" color="var(--color-text-tertiary)" />
            <span class="footnote text-secondary">{{ t('records.noRecords') }}</span>
          </div>
        </div>
      </Card>

      <!-- Quick Actions (Admin/Manager only) -->
      <Card 
        v-if="canAccessAdmin || canManageEmployees" 
        variant="elevated" 
        class="quick-actions-card"
      >
        <template #header>
          <h3 class="title3">{{ t('dashboard.quickActions') }}</h3>
        </template>

        <div class="quick-actions-grid">
          <NuxtLink v-if="canManageEmployees" to="/admin/employees" class="quick-action-item">
            <Icon name="person.2.fill" size="24" color="var(--color-primary)" />
            <div class="action-info">
              <span class="body">{{ t('employee.title') }}</span>
              <span class="caption2 text-secondary">{{ totalEmployees }}人</span>
            </div>
          </NuxtLink>

          <NuxtLink v-if="canApproveCorrections" to="/corrections" class="quick-action-item">
            <Icon name="doc.text.fill" size="24" color="var(--color-warning)" />
            <div class="action-info">
              <span class="body">{{ t('corrections.title') }}</span>
              <span class="caption2 text-secondary">{{ pendingCorrections }}件待機</span>
            </div>
          </NuxtLink>
        </div>
      </Card>

      <!-- Pending Actions -->
      <Card v-if="hasPendingActions" variant="elevated" class="pending-actions-card">
        <template #header>
          <div class="card-header-with-badge">
            <h3 class="title3">{{ t('dashboard.pendingActions') }}</h3>
            <div class="badge badge-warning">{{ totalPendingActions }}</div>
          </div>
        </template>

        <div class="pending-actions-list">
          <div 
            v-if="pendingCorrections > 0 && canApproveCorrections"
            class="pending-item"
          >
            <Icon name="doc.text" size="16" color="var(--color-warning)" />
            <div class="pending-content">
              <span class="footnote">{{ t('corrections.pendingRequests') }}</span>
              <span class="caption2 text-secondary">{{ pendingCorrections }}件</span>
            </div>
            <NuxtLink to="/corrections" class="pending-action">
              <Icon name="arrow.right" size="14" />
            </NuxtLink>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
// Meta
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// Composables
const { t } = useI18n()
const { formatHours, formatRelativeTime } = useDateTime()
const { 
  user, 
  isAuthenticated, 
  canAccessAdmin, 
  canManageEmployees, 
  canApproveCorrections 
} = useAuth()

// Attendance data
const {
  currentRecord,
  isLoading: attendanceLoading,
  error: attendanceError,
  isWorking,
  workingMinutes,
  statusMessage,
  clockIn,
  clockOut,
  fetchStatus: fetchAttendanceStatus
} = useAttendance()

// Records data
const {
  records,
  summary,
  isLoading: summaryLoading,
  error: summaryError,
  progressPercentage,
  isOvertime,
  isUndertime,
  refreshSummary,
  fetchRecords
} = useRecords()

// Local state
const isLoading = ref(false)
const totalEmployees = ref(0)
const pendingCorrections = ref(0)

// Page meta
useHead({
  title: `${t('dashboard.title')} - 勤怠管理システム`
})

// Computed
const welcomeMessage = computed(() => {
  if (user.value?.name) {
    return `${user.value.name}さん、${t('dashboard.welcome')}`
  }
  return t('dashboard.welcome')
})

const recentRecords = computed(() => {
  return records.value.slice(0, 5) // Show last 5 records
})

const overtimeIcon = computed(() => {
  if (!summary.value) return 'minus.circle'
  if (isOvertime.value) return 'plus.circle.fill'
  if (isUndertime.value) return 'minus.circle.fill'
  return 'checkmark.circle.fill'
})

const overtimeIconClass = computed(() => {
  if (!summary.value) return 'stat-icon text-secondary'
  if (isOvertime.value) return 'stat-icon text-error'
  if (isUndertime.value) return 'stat-icon text-warning'
  return 'stat-icon text-success'
})

const overtimeText = computed(() => {
  if (!summary.value) return '--'
  const hours = Math.abs(summary.value.overUnderHours)
  const sign = isOvertime.value ? '+' : isUndertime.value ? '-' : ''
  return `${sign}${formatHours(hours * 60)}`
})

const overtimeTextClass = computed(() => {
  if (!summary.value) return ''
  if (isOvertime.value) return 'text-error'
  if (isUndertime.value) return 'text-warning'
  return 'text-success'
})

const progressBarClass = computed(() => {
  if (!summary.value) return ''
  if (isOvertime.value) return 'progress-overtime'
  if (isUndertime.value) return 'progress-undertime'
  return 'progress-normal'
})

const hasPendingActions = computed(() => {
  return pendingCorrections.value > 0 && canApproveCorrections.value
})

const totalPendingActions = computed(() => {
  return pendingCorrections.value
})

// Methods
const refreshDashboard = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      fetchAttendanceStatus(),
      refreshSummary(),
      fetchRecords({ page: 1, force: true }),
      fetchDashboardStats()
    ])
  } catch (error) {
    console.error('Failed to refresh dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

const handleClockIn = async () => {
  try {
    await clockIn()
    await fetchAttendanceStatus()
  } catch (error) {
    console.error('Clock in failed:', error)
  }
}

const handleClockOut = async () => {
  try {
    await clockOut()
    await fetchAttendanceStatus()
  } catch (error) {
    console.error('Clock out failed:', error)
  }
}

const fetchDashboardStats = async () => {
  try {
    // Fetch employee count if user has permission
    if (canManageEmployees.value) {
      // This would be implemented when employee management is available
      totalEmployees.value = 0
    }

    // Fetch pending corrections count if user has permission
    if (canApproveCorrections.value) {
      // This would be implemented when corrections management is available
      pendingCorrections.value = 0
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
  }
}

const getActivityIcon = (record: any) => {
  if (record.clockInTime && record.clockOutTime) {
    return 'checkmark.circle.fill'
  } else if (record.clockInTime) {
    return 'clock.fill'
  } else {
    return 'exclamationmark.circle'
  }
}

const getActivityIconClass = (record: any) => {
  if (record.clockInTime && record.clockOutTime) {
    return 'text-success'
  } else if (record.clockInTime) {
    return 'text-primary'
  } else {
    return 'text-warning'
  }
}

const getActivityMessage = (record: any) => {
  if (record.clockInTime && record.clockOutTime) {
    return `${formatHours(record.workingMinutes)}の勤務を完了`
  } else if (record.clockInTime) {
    return '出勤打刻済み'
  } else {
    return '未出勤'
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
      await fetchAttendanceStatus()
      await refreshSummary()
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
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1200px;
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

.today-attendance-section {
  margin-bottom: var(--spacing-lg);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto auto;
  gap: var(--spacing-lg);
}

.monthly-summary-card {
  grid-column: 1;
  grid-row: 1;
}

.recent-activity-card {
  grid-column: 2;
  grid-row: 1;
}

.quick-actions-card {
  grid-column: 1;
  grid-row: 2;
}

.pending-actions-card {
  grid-column: 2;
  grid-row: 2;
}

/* Card Headers */
.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header-with-badge {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
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

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--spacing-xs);
  border-radius: 10px;
  font-size: var(--font-size-caption2);
  font-weight: var(--font-weight-headline);
}

.badge-warning {
  background-color: var(--color-warning);
  color: white;
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

/* Summary Content */
.summary-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.stat-icon {
  flex-shrink: 0;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  background-color: rgba(255, 255, 255, 0.1);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

/* Progress Section */
.progress-section {
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
  height: 8px;
  background-color: var(--color-surface-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-normal {
  background-color: var(--color-success);
}

.progress-undertime {
  background-color: var(--color-warning);
}

.progress-overtime {
  background-color: var(--color-error);
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
}

.empty-activity {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  text-align: center;
  justify-content: center;
}

/* Quick Actions */
.quick-actions-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quick-action-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.quick-action-item:hover {
  background-color: var(--color-surface);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

/* Pending Actions */
.pending-actions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.pending-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.pending-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
}

.pending-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: white;
  text-decoration: none;
  transition: all 0.2s ease;
}

.pending-action:hover {
  background-color: var(--color-primary-dark);
}

/* Text Colors */
.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }

  .monthly-summary-card {
    grid-column: 1;
    grid-row: 1;
  }

  .recent-activity-card {
    grid-column: 1;
    grid-row: 2;
  }

  .quick-actions-card {
    grid-column: 1;
    grid-row: 3;
  }

  .pending-actions-card {
    grid-column: 1;
    grid-row: 4;
  }

  .summary-stats {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: var(--spacing-md);
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .quick-actions-grid {
    gap: var(--spacing-sm);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .stat-icon {
    background-color: rgba(0, 0, 0, 0.2);
  }
}
</style>