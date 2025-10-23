<template>
  <Card variant="elevated" class="attendance-card">
    <template #header>
      <div class="card-header-content">
        <Icon name="clock.fill" :size="32" color="var(--color-primary)" />
        <div class="header-text">
          <h2 class="title2">{{ t('attendance.title') }}</h2>
          <p class="caption1 current-time">{{ currentTime }}</p>
        </div>
      </div>
    </template>

    <div class="attendance-content">
      <!-- Status Display -->
      <div class="status-section">
        <div class="status-indicator" :class="statusIndicatorClass">
          <Icon :name="statusIcon" :size="24" />
        </div>
        <div class="status-text">
          <p class="headline">{{ statusMessage }}</p>
          <p class="caption1 text-secondary">{{ workingTimeDisplay }}</p>
        </div>
      </div>

      <!-- Time Display -->
      <div v-if="currentRecord" class="time-display">
        <div v-if="clockInTimeFormatted" class="time-item">
          <span class="caption1 text-secondary">{{ t('records.clockInTime') }}</span>
          <span class="title3">{{ clockInTimeFormatted }}</span>
        </div>
        <div v-if="clockOutTimeFormatted" class="time-item">
          <span class="caption1 text-secondary">{{ t('records.clockOutTime') }}</span>
          <span class="title3">{{ clockOutTimeFormatted }}</span>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-message">
        <Icon name="exclamationmark.triangle.fill" :size="16" color="var(--color-error)" />
        <span class="footnote">{{ error }}</span>
        <Button variant="ghost" size="small" @click="clearError">
          <Icon name="xmark" :size="14" />
        </Button>
      </div>
    </div>

    <template #footer>
      <div class="action-buttons">
        <Button
          :variant="canClockIn ? 'primary' : 'tertiary'"
          size="large"
          :disabled="!canClockIn || isLoading"
          :loading="isLoading && lastClockAction === 'clock-in'"
          @click="handleClockIn"
          class="clock-button"
        >
          <Icon name="clock.arrow.2.circlepath" />
          {{ t('attendance.clockIn') }}
        </Button>

        <Button
          :variant="canClockOut ? 'secondary' : 'tertiary'"
          size="large"
          :disabled="!canClockOut || isLoading"
          :loading="isLoading && lastClockAction === 'clock-out'"
          @click="handleClockOut"
          class="clock-button"
        >
          <Icon name="clock.arrow.circlepath" />
          {{ t('attendance.clockOut') }}
        </Button>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { getCurrentTimeString } = useDateTime()
const {
  currentRecord,
  isLoading,
  error,
  isWorking,
  canClockIn,
  canClockOut,
  statusMessage,
  lastClockAction,
  formatWorkingTime,
  clockInTimeFormatted,
  clockOutTimeFormatted,
  clockIn,
  clockOut,
  clearError
} = useAttendance()

// Real-time clock display
const currentTime = ref(getCurrentTimeString())
const { pause: pauseClock, resume: resumeClock } = useIntervalFn(
  () => {
    currentTime.value = getCurrentTimeString()
  },
  1000,
  { immediate: true }
)

// Status indicator styling
const statusIndicatorClass = computed(() => ({
  'status-indicator--working': isWorking.value,
  'status-indicator--not-working': !isWorking.value,
  'status-indicator--loading': isLoading.value
}))

// Status icon
const statusIcon = computed(() => {
  if (isLoading.value) return 'clock.arrow.2.circlepath'
  if (isWorking.value) return 'checkmark.circle.fill'
  return 'clock.fill'
})

// Working time display
const workingTimeDisplay = computed(() => {
  if (isWorking.value) {
    return `${t('attendance.workingTime')}: ${formatWorkingTime.value}`
  } else if (currentRecord.value?.clockOutTime) {
    return `${t('attendance.workingTime')}: ${formatWorkingTime.value}`
  } else {
    return t('attendance.status')
  }
})

// Action handlers
const handleClockIn = async () => {
  try {
    await clockIn()
  } catch (error) {
    // Error is handled by the store
    console.error('Clock in failed:', error)
  }
}

const handleClockOut = async () => {
  try {
    await clockOut()
  } catch (error) {
    // Error is handled by the store
    console.error('Clock out failed:', error)
  }
}

// Cleanup on unmount
onUnmounted(() => {
  pauseClock()
})
</script>

<style scoped>
.attendance-card {
  max-width: 600px;
  margin: 0 auto;
}

.card-header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-text {
  flex: 1;
}

.current-time {
  font-family: var(--font-family-mono, 'SF Mono', monospace);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.attendance-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.status-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.status-indicator {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.status-indicator--working {
  background-color: var(--color-success);
  color: white;
  animation: pulse 2s infinite;
}

.status-indicator--not-working {
  background-color: var(--color-text-tertiary);
  color: white;
}

.status-indicator--loading {
  background-color: var(--color-primary);
  color: white;
  animation: spin 1s linear infinite;
}

.status-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.time-display {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.time-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  text-align: center;
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(255, 59, 48, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  color: var(--color-error);
}

.error-message .footnote {
  flex: 1;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.clock-button {
  min-height: 56px;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .time-display {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .clock-button {
    min-height: 48px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .status-indicator--not-working {
    background-color: var(--color-text-secondary);
  }
  
  .error-message {
    background-color: rgba(255, 59, 48, 0.2);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .status-indicator {
    border: 2px solid currentColor;
  }
  
  .error-message {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .status-indicator--working {
    animation: none;
  }
  
  .status-indicator--loading {
    animation: none;
  }
  
  .status-indicator,
  .clock-button {
    transition: none;
  }
}
</style>