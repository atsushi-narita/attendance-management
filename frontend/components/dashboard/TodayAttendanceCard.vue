<template>
  <Card variant="elevated" class="today-attendance-card">
    <template #header>
      <div class="card-header-content">
        <Icon name="clock.fill" :size="32" color="var(--color-primary)" />
        <div class="header-info">
          <h2 class="title3">{{ t('dashboard.todayAttendance') }}</h2>
          <p class="caption1 text-secondary">{{ currentDateFormatted }}</p>
        </div>
        <div class="current-time">
          <span class="title2">{{ currentTime }}</span>
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <Icon name="arrow.clockwise" size="24" class="loading-spinner" />
      <span class="body">{{ t('common.loading') }}</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <Icon name="exclamationmark.triangle" size="24" color="var(--color-error)" />
      <span class="body text-error">{{ error }}</span>
    </div>

    <!-- Attendance Content -->
    <div v-else class="attendance-content">
      <!-- Status Display -->
      <div class="status-section">
        <div class="status-indicator" :class="statusIndicatorClass">
          <Icon :name="statusIcon" size="24" />
        </div>
        <div class="status-info">
          <span class="headline">{{ statusMessage }}</span>
          <span v-if="workingTimeDisplay" class="caption1 text-secondary">
            {{ workingTimeDisplay }}
          </span>
        </div>
      </div>

      <!-- Clock Times Display -->
      <div v-if="currentRecord" class="times-display">
        <div v-if="currentRecord.clockInTime" class="time-item">
          <Icon name="sunrise" size="16" color="var(--color-success)" />
          <div class="time-info">
            <span class="caption2 text-secondary">{{ t('attendance.clockIn') }}</span>
            <span class="body">{{ formatTime(currentRecord.clockInTime) }}</span>
          </div>
        </div>
        
        <div v-if="currentRecord.clockOutTime" class="time-item">
          <Icon name="sunset" size="16" color="var(--color-warning)" />
          <div class="time-info">
            <span class="caption2 text-secondary">{{ t('attendance.clockOut') }}</span>
            <span class="body">{{ formatTime(currentRecord.clockOutTime) }}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <Button
          :variant="canClockIn ? 'primary' : 'disabled'"
          size="large"
          @click="handleClockIn"
          :disabled="!canClockIn || isLoading"
          class="clock-button"
        >
          <Icon name="clock.arrow.2.circlepath" />
          {{ t('attendance.clockIn') }}
        </Button>

        <Button
          :variant="canClockOut ? 'secondary' : 'disabled'"
          size="large"
          @click="handleClockOut"
          :disabled="!canClockOut || isLoading"
          class="clock-button"
        >
          <Icon name="clock.arrow.circlepath" />
          {{ t('attendance.clockOut') }}
        </Button>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import type { AttendanceRecord } from '~/types/attendance'

// Props
interface Props {
  currentRecord: AttendanceRecord | null
  isLoading: boolean
  error: string | null
  isWorking: boolean
  workingMinutes: number
  statusMessage: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'clock-in': []
  'clock-out': []
}>()

// Composables
const { t } = useI18n()
const { formatTime, formatDuration, getCurrentDateString } = useDateTime()

// Current time (updates every second)
const currentTime = ref('')
const currentDateFormatted = ref('')

// Update current time
const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const updateCurrentDate = () => {
  currentDateFormatted.value = getCurrentDateString()
}

// Computed
const canClockIn = computed(() => {
  return !props.isLoading && (
    props.currentRecord == null || 
    props.currentRecord.clockOutTime != null
  )
})

const canClockOut = computed(() => {
  return !props.isLoading && 
    props.currentRecord?.clockInTime != null && 
    props.currentRecord?.clockOutTime == null
})

const statusIcon = computed(() => {
  if (props.isWorking) {
    return 'clock.fill'
  } else if (props.currentRecord?.clockOutTime) {
    return 'checkmark.circle.fill'
  } else {
    return 'clock'
  }
})

const statusIndicatorClass = computed(() => {
  if (props.isWorking) {
    return 'status-working'
  } else if (props.currentRecord?.clockOutTime) {
    return 'status-finished'
  } else {
    return 'status-not-working'
  }
})

const workingTimeDisplay = computed(() => {
  if (props.workingMinutes > 0) {
    return `${t('attendance.workingTime')}: ${formatDuration(props.workingMinutes)}`
  }
  return null
})

// Methods
const handleClockIn = () => {
  emit('clock-in')
}

const handleClockOut = () => {
  emit('clock-out')
}

// Initialize and start time updates
onMounted(() => {
  updateCurrentTime()
  updateCurrentDate()
  
  // Update time every second
  const timeInterval = setInterval(updateCurrentTime, 1000)
  
  // Update date every minute (in case it changes at midnight)
  const dateInterval = setInterval(updateCurrentDate, 60000)
  
  // Cleanup intervals
  onUnmounted(() => {
    clearInterval(timeInterval)
    clearInterval(dateInterval)
  })
})
</script>

<style scoped>
.today-attendance-card {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%);
  border: 1px solid var(--color-primary-light);
}

.card-header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  width: 100%;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.current-time {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-headline);
}

.loading-state,
.error-state {
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

.attendance-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.status-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-lg);
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  color: white;
}

.status-working {
  background-color: var(--color-success);
}

.status-finished {
  background-color: var(--color-primary);
}

.status-not-working {
  background-color: var(--color-text-tertiary);
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.times-display {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.time-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.clock-button {
  min-height: 56px;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-headline);
}

.text-error {
  color: var(--color-error);
}

.text-secondary {
  color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .card-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .current-time {
    align-self: flex-end;
  }

  .status-section {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-md);
  }

  .times-display {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .today-attendance-card {
    background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%);
  }
}
</style>