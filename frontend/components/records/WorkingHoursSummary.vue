<template>
  <div class="working-hours-summary">
    <!-- Summary Header -->
    <div class="summary-header">
      <div class="header-content">
        <h2 class="title2">{{ $t('records.summary') }}</h2>
        <p class="subhead">{{ monthText }}</p>
      </div>
      
      <div class="month-selector">
        <Button
          variant="ghost"
          size="small"
          @click="previousMonth"
        >
          <Icon name="chevron.left" size="16" />
        </Button>
        
        <div class="current-month">
          <span class="headline">{{ formatMonth(selectedMonth) }}</span>
        </div>
        
        <Button
          variant="ghost"
          size="small"
          @click="nextMonth"
          :disabled="isCurrentMonth"
        >
          <Icon name="chevron.right" size="16" />
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="body">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="body text-error">{{ error }}</p>
      <Button variant="secondary" @click="fetchSummary">
        {{ $t('common.retry') }}
      </Button>
    </div>

    <!-- Summary Content -->
    <div v-else-if="summary" class="summary-content">
      <!-- Overview Cards -->
      <div class="overview-cards">
        <Card variant="elevated" class="summary-card">
          <div class="card-content">
            <div class="metric-header">
              <Icon name="clock.fill" size="24" class="metric-icon text-primary" />
              <div class="metric-info">
                <p class="caption1 text-secondary">{{ $t('records.totalHours') }}</p>
                <p class="title1">{{ formatHours(summary.totalWorkingMinutes) }}</p>
              </div>
            </div>
            <div class="metric-detail">
              <p class="footnote text-secondary">
                {{ $t('records.workingDays', { days: summary.totalWorkingDays }) }}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" class="summary-card">
          <div class="card-content">
            <div class="metric-header">
              <Icon name="target" size="24" class="metric-icon text-secondary" />
              <div class="metric-info">
                <p class="caption1 text-secondary">{{ $t('records.requiredHours') }}</p>
                <p class="title1">{{ formatHours(summary.requiredMonthlyHours * 60) }}</p>
              </div>
            </div>
            <div class="metric-detail">
              <p class="footnote text-secondary">
                {{ $t('records.monthlyTarget') }}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" class="summary-card" :class="overUnderClass">
          <div class="card-content">
            <div class="metric-header">
              <Icon :name="overUnderIcon" size="24" class="metric-icon" :class="overUnderIconClass" />
              <div class="metric-info">
                <p class="caption1 text-secondary">{{ overUnderLabel }}</p>
                <p class="title1" :class="overUnderTextClass">{{ formatHours(Math.abs(summary.overUnderHours * 60)) }}</p>
              </div>
            </div>
            <div class="metric-detail">
              <p class="footnote text-secondary">
                {{ overUnderDescription }}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" class="summary-card">
          <div class="card-content">
            <div class="metric-header">
              <Icon name="chart.bar.fill" size="24" class="metric-icon text-warning" />
              <div class="metric-info">
                <p class="caption1 text-secondary">{{ $t('records.averageHours') }}</p>
                <p class="title1">{{ formatHours(summary.averageWorkingMinutes) }}</p>
              </div>
            </div>
            <div class="metric-detail">
              <p class="footnote text-secondary">
                {{ $t('records.perDay') }}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Progress Visualization -->
      <Card variant="elevated" class="progress-card">
        <div class="card-content">
          <div class="progress-header">
            <h3 class="headline">{{ $t('records.monthlyProgress') }}</h3>
            <p class="subhead">{{ progressPercentageText }}</p>
          </div>
          
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :class="progressFillClass"
                :style="{ width: `${Math.min(progressPercentage, 100)}%` }"
              ></div>
              <div 
                v-if="progressPercentage > 100"
                class="progress-overflow"
                :style="{ width: `${Math.min(progressPercentage - 100, 50)}%` }"
              ></div>
            </div>
            
            <div class="progress-labels">
              <span class="caption1 text-secondary">0h</span>
              <span class="caption1 text-secondary">{{ formatHours(summary.requiredMonthlyHours * 60) }}</span>
            </div>
          </div>

          <div class="progress-details">
            <div class="detail-item">
              <div class="detail-indicator detail-indicator--worked"></div>
              <span class="caption1">{{ $t('records.workedHours') }}: {{ formatHours(summary.totalWorkingMinutes) }}</span>
            </div>
            <div class="detail-item">
              <div class="detail-indicator detail-indicator--required"></div>
              <span class="caption1">{{ $t('records.requiredHours') }}: {{ formatHours(summary.requiredMonthlyHours * 60) }}</span>
            </div>
            <div v-if="summary.overUnderHours !== 0" class="detail-item">
              <div class="detail-indicator" :class="overUnderIndicatorClass"></div>
              <span class="caption1">{{ overUnderLabel }}: {{ formatHours(Math.abs(summary.overUnderHours * 60)) }}</span>
            </div>
          </div>
        </div>
      </Card>

      <!-- Weekly Breakdown -->
      <Card variant="elevated" class="weekly-breakdown-card">
        <div class="card-content">
          <h3 class="headline">{{ $t('records.weeklyBreakdown') }}</h3>
          <div class="weekly-chart">
            <div 
              v-for="(week, index) in weeklyData" 
              :key="index" 
              class="week-bar"
            >
              <div class="week-bar-container">
                <div 
                  class="week-bar-fill"
                  :style="{ height: `${(week.hours / maxWeeklyHours) * 100}%` }"
                ></div>
              </div>
              <div class="week-label">
                <span class="caption2">{{ $t('records.week') }} {{ index + 1 }}</span>
                <span class="caption1">{{ formatHours(week.hours * 60) }}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <Icon name="chart.bar" size="48" />
      <p class="headline">{{ $t('records.noSummaryData') }}</p>
      <p class="subhead">{{ $t('records.noSummaryMessage') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WorkingHoursSummary } from '~/types/attendance'

interface Props {
  summary: WorkingHoursSummary | null
  isLoading?: boolean
  error?: string | null
  selectedMonth?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
  selectedMonth: () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
})

const emit = defineEmits<{
  'update:month': [month: string]
  'refresh': []
}>()

// Computed properties
const { t } = useI18n()
const { formatHours, formatMonth } = useDateTime()

const monthText = computed(() => {
  if (!props.summary) return ''
  return t('records.monthlyOverview', { month: formatMonth(props.selectedMonth) })
})

const isCurrentMonth = computed(() => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return props.selectedMonth === currentMonth
})

const progressPercentage = computed(() => {
  if (!props.summary) return 0
  return (props.summary.totalWorkingMinutes / (props.summary.requiredMonthlyHours * 60)) * 100
})

const progressPercentageText = computed(() => {
  return `${Math.round(progressPercentage.value)}%`
})

const progressFillClass = computed(() => {
  if (progressPercentage.value >= 100) return 'progress-fill--complete'
  if (progressPercentage.value >= 80) return 'progress-fill--good'
  if (progressPercentage.value >= 60) return 'progress-fill--warning'
  return 'progress-fill--low'
})

const overUnderClass = computed(() => {
  if (!props.summary) return ''
  if (props.summary.overUnderHours > 0) return 'summary-card--over'
  if (props.summary.overUnderHours < 0) return 'summary-card--under'
  return 'summary-card--exact'
})

const overUnderIcon = computed(() => {
  if (!props.summary) return 'equal.circle.fill'
  if (props.summary.overUnderHours > 0) return 'arrow.up.circle.fill'
  if (props.summary.overUnderHours < 0) return 'arrow.down.circle.fill'
  return 'equal.circle.fill'
})

const overUnderIconClass = computed(() => {
  if (!props.summary) return 'text-secondary'
  if (props.summary.overUnderHours > 0) return 'text-warning'
  if (props.summary.overUnderHours < 0) return 'text-error'
  return 'text-success'
})

const overUnderTextClass = computed(() => {
  if (!props.summary) return ''
  if (props.summary.overUnderHours > 0) return 'text-warning'
  if (props.summary.overUnderHours < 0) return 'text-error'
  return 'text-success'
})

const overUnderLabel = computed(() => {
  if (!props.summary) return t('records.difference')
  if (props.summary.overUnderHours > 0) return t('records.overtime')
  if (props.summary.overUnderHours < 0) return t('records.shortage')
  return t('records.exact')
})

const overUnderDescription = computed(() => {
  if (!props.summary) return ''
  if (props.summary.overUnderHours > 0) return t('records.overtimeDescription')
  if (props.summary.overUnderHours < 0) return t('records.shortageDescription')
  return t('records.exactDescription')
})

const overUnderIndicatorClass = computed(() => {
  if (!props.summary) return 'detail-indicator--neutral'
  if (props.summary.overUnderHours > 0) return 'detail-indicator--over'
  if (props.summary.overUnderHours < 0) return 'detail-indicator--under'
  return 'detail-indicator--exact'
})

// Weekly breakdown data (mock data for visualization)
const weeklyData = computed(() => {
  if (!props.summary) return []
  
  // This would typically come from the API
  // For now, we'll create a simple breakdown
  const totalHours = props.summary.totalWorkingMinutes / 60
  const weeks = 4
  const avgWeeklyHours = totalHours / weeks
  
  return Array.from({ length: weeks }, (_, index) => ({
    hours: avgWeeklyHours + (Math.random() - 0.5) * 10 // Add some variation
  }))
})

const maxWeeklyHours = computed(() => {
  if (weeklyData.value.length === 0) return 0
  return Math.max(...weeklyData.value.map(week => week.hours))
})

// Methods
const previousMonth = () => {
  const [year, month] = props.selectedMonth.split('-').map(Number)
  const prevDate = new Date(year, month - 2, 1) // month - 2 because month is 1-based
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  emit('update:month', prevMonth)
}

const nextMonth = () => {
  if (isCurrentMonth.value) return
  
  const [year, month] = props.selectedMonth.split('-').map(Number)
  const nextDate = new Date(year, month, 1) // month because we want next month
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
  emit('update:month', nextMonth)
}

const fetchSummary = () => {
  emit('refresh')
}
</script>

<style scoped>
.working-hours-summary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.header-content {
  flex: 1;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm);
}

.current-month {
  min-width: 120px;
  text-align: center;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-surface-secondary);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.summary-card {
  transition: all 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.summary-card--over {
  border-left: 4px solid var(--color-warning);
}

.summary-card--under {
  border-left: 4px solid var(--color-error);
}

.summary-card--exact {
  border-left: 4px solid var(--color-success);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.metric-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.metric-icon {
  flex-shrink: 0;
  margin-top: 4px;
}

.metric-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.metric-detail {
  margin-left: 40px; /* Align with metric info */
}

.progress-card .card-content {
  gap: var(--spacing-lg);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.progress-bar {
  position: relative;
  height: 12px;
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-md);
  transition: width 0.3s ease;
}

.progress-fill--low {
  background-color: var(--color-error);
}

.progress-fill--warning {
  background-color: var(--color-warning);
}

.progress-fill--good {
  background-color: var(--color-primary);
}

.progress-fill--complete {
  background-color: var(--color-success);
}

.progress-overflow {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background-color: var(--color-warning);
  border-radius: var(--radius-md);
  opacity: 0.7;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
}

.progress-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.detail-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.detail-indicator--worked {
  background-color: var(--color-primary);
}

.detail-indicator--required {
  background-color: var(--color-surface-secondary);
  border: 2px solid var(--color-border);
}

.detail-indicator--over {
  background-color: var(--color-warning);
}

.detail-indicator--under {
  background-color: var(--color-error);
}

.detail-indicator--exact {
  background-color: var(--color-success);
}

.detail-indicator--neutral {
  background-color: var(--color-text-tertiary);
}

.weekly-breakdown-card .card-content {
  gap: var(--spacing-lg);
}

.weekly-chart {
  display: flex;
  align-items: end;
  gap: var(--spacing-md);
  height: 120px;
  padding: var(--spacing-md) 0;
}

.week-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.week-bar-container {
  flex: 1;
  width: 100%;
  max-width: 40px;
  display: flex;
  align-items: end;
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.week-bar-fill {
  width: 100%;
  background-color: var(--color-primary);
  border-radius: var(--radius-sm);
  transition: height 0.3s ease;
  min-height: 4px;
}

.week-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .summary-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .month-selector {
    align-self: center;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .progress-details {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .weekly-chart {
    height: 100px;
  }
}
</style>