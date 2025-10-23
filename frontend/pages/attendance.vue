<template>
  <div class="attendance-page">
    <div class="page-header">
      <h1 class="title1">{{ t('attendance.title') }}</h1>
      <p class="subhead">{{ t('dashboard.todayAttendance') }}</p>
    </div>

    <div class="page-content">
      <AttendanceCard />
      
      <!-- Quick Stats -->
      <Card variant="elevated" class="quick-stats">
        <template #header>
          <h3 class="title3">{{ t('time.today') }}</h3>
        </template>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="caption1 text-secondary">{{ t('attendance.status') }}</span>
            <span class="body" :class="statusTextClass">{{ statusMessage }}</span>
          </div>
          <div class="stat-item">
            <span class="caption1 text-secondary">{{ t('attendance.workingTime') }}</span>
            <span class="title3">{{ formatWorkingTime }}</span>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const { isWorking, statusMessage, formatWorkingTime } = useAttendance()

// Page meta
useHead({
  title: `${t('attendance.title')} - 勤怠管理システム`
})

// Status text styling
const statusTextClass = computed(() => ({
  'text-success': isWorking.value,
  'text-secondary': !isWorking.value
}))

// Define page layout
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})
</script>

<style scoped>
.attendance-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.quick-stats {
  max-width: 600px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  text-align: center;
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.text-success {
  color: var(--color-success);
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}
</style>