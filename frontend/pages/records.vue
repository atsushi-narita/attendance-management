<template>
  <div class="records-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="large-title">{{ $t('records.title') }}</h1>
        <p class="subhead">{{ $t('records.description') }}</p>
      </div>
      
      <div class="header-actions">
        <Button
          variant="secondary"
          @click="refreshAll"
          :disabled="isLoading"
        >
          <Icon name="arrow.clockwise" size="16" />
          {{ $t('common.refresh') }}
        </Button>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="view-toggle">
      <div class="toggle-buttons">
        <button
          :class="['toggle-button', { 'toggle-button--active': currentView === 'records' }]"
          @click="currentView = 'records'"
        >
          <Icon name="list.bullet" size="16" />
          {{ $t('records.daily') }}
        </button>
        <button
          :class="['toggle-button', { 'toggle-button--active': currentView === 'summary' }]"
          @click="currentView = 'summary'"
        >
          <Icon name="chart.bar.fill" size="16" />
          {{ $t('records.summary') }}
        </button>
      </div>
    </div>

    <!-- Records View -->
    <div v-if="currentView === 'records'" class="records-view">
      <RecordTable
        :records="records"
        :is-loading="isLoading"
        :error="error"
        :total-count="totalCount"
        :current-page="currentPage"
        :page-size="pageSize"
        @update:filters="handleFiltersUpdate"
        @update:sort="handleSortUpdate"
        @update:page="handlePageUpdate"
        @refresh="refreshRecords"
      />
    </div>

    <!-- Summary View -->
    <div v-if="currentView === 'summary'" class="summary-view">
      <WorkingHoursSummary
        :summary="summary"
        :is-loading="isLoading"
        :error="error"
        :selected-month="selectedMonth"
        @update:month="handleMonthUpdate"
        @refresh="refreshSummary"
      />
    </div>

    <!-- Quick Stats (always visible) -->
    <div class="quick-stats">
      <Card variant="elevated" class="stats-card">
        <div class="stats-content">
          <div class="stat-item">
            <Icon name="calendar" size="20" class="stat-icon text-primary" />
            <div class="stat-info">
              <span class="caption1 text-secondary">{{ $t('records.thisMonth') }}</span>
              <span class="headline">{{ monthlyRecordsCount }}</span>
            </div>
          </div>
          
          <div class="stat-item">
            <Icon name="clock.fill" size="20" class="stat-icon text-success" />
            <div class="stat-info">
              <span class="caption1 text-secondary">{{ $t('records.totalHours') }}</span>
              <span class="headline">{{ monthlyTotalHours }}</span>
            </div>
          </div>
          
          <div class="stat-item">
            <Icon name="chart.line.uptrend.xyaxis" size="20" class="stat-icon text-warning" />
            <div class="stat-info">
              <span class="caption1 text-secondary">{{ $t('records.progress') }}</span>
              <span class="headline">{{ monthlyProgress }}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RecordsFilter, RecordsSortOptions } from '~/types/attendance'

// Meta
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// Composables
const { t } = useI18n()
const { formatHours } = useDateTime()
const {
  records,
  summary,
  isLoading,
  error,
  totalCount,
  currentPage,
  pageSize,
  selectedMonth,
  hasRecords,
  hasSummary,
  progressPercentage,
  applyFilters,
  sortBy,
  goToPage,
  changeMonth,
  refreshRecords,
  refreshSummary,
  refreshAll,
  clearError
} = useRecords()

// Local state
const currentView = ref<'records' | 'summary'>('records')

// Computed
const monthlyRecordsCount = computed(() => {
  if (!hasRecords.value) return '0'
  return records.value.length.toString()
})

const monthlyTotalHours = computed(() => {
  if (!hasSummary.value || !summary.value) return '0h'
  return formatHours(summary.value.totalWorkingMinutes)
})

const monthlyProgress = computed(() => {
  if (!hasSummary.value) return '0%'
  return `${Math.round(progressPercentage.value)}%`
})

// Event handlers
const handleFiltersUpdate = async (filters: RecordsFilter) => {
  await applyFilters(filters)
}

const handleSortUpdate = async (sort: RecordsSortOptions) => {
  await sortBy(sort.field, sort.direction)
}

const handlePageUpdate = async (page: number) => {
  await goToPage(page)
}

const handleMonthUpdate = async (month: string) => {
  await changeMonth(month)
}

// Initialize data
onMounted(async () => {
  await refreshAll()
})

// Watch for view changes to fetch appropriate data
watch(currentView, async (newView) => {
  if (newView === 'records' && !hasRecords.value) {
    await refreshRecords()
  } else if (newView === 'summary' && !hasSummary.value) {
    await refreshSummary()
  }
})

// Clear errors when component unmounts
onUnmounted(() => {
  clearError()
})
</script>

<style scoped>
.records-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
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

.view-toggle {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md) 0;
}

.toggle-buttons {
  display: flex;
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xs);
  gap: var(--spacing-xs);
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: var(--touch-target-min);
}

.toggle-button:hover {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
}

.toggle-button--active {
  background-color: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.records-view,
.summary-view {
  min-height: 400px;
}

.quick-stats {
  margin-top: var(--spacing-lg);
}

.stats-card {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%);
}

.stats-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
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

/* Responsive */
@media (max-width: 768px) {
  .records-page {
    padding: var(--spacing-md);
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
  
  .toggle-buttons {
    width: 100%;
  }
  
  .toggle-button {
    flex: 1;
    justify-content: center;
  }
  
  .stats-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .stats-card {
    background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%);
  }
  
  .stat-icon {
    background-color: rgba(0, 0, 0, 0.2);
  }
}
</style>