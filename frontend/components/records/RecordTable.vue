<template>
  <div class="record-table">
    <!-- Table Header with Filters -->
    <div class="table-header">
      <div class="table-title">
        <h2 class="title2">{{ $t('records.title') }}</h2>
        <p class="subhead">{{ totalRecordsText }}</p>
      </div>
      
      <div class="table-filters">
        <div class="filter-group">
          <Input
            v-model="filterStartDate"
            type="date"
            :label="$t('common.startDate')"
            size="small"
          />
          <Input
            v-model="filterEndDate"
            type="date"
            :label="$t('common.endDate')"
            size="small"
          />
        </div>
        
        <div class="filter-actions">
          <Button
            variant="secondary"
            size="small"
            @click="resetFilters"
          >
            {{ $t('common.reset') }}
          </Button>
          <Button
            variant="primary"
            size="small"
            @click="applyFilters"
          >
            {{ $t('common.filter') }}
          </Button>
        </div>
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
      <Button variant="secondary" @click="fetchRecords">
        {{ $t('common.retry') }}
      </Button>
    </div>

    <!-- Empty State -->
    <div v-else-if="records.length === 0" class="empty-state">
      <Icon name="calendar" size="48" />
      <p class="headline">{{ $t('records.noRecords') }}</p>
      <p class="subhead">{{ $t('records.noRecordsMessage') }}</p>
    </div>

    <!-- Records Table -->
    <div v-else class="table-container">
      <table class="records-table">
        <thead>
          <tr>
            <th @click="sortBy('date')" class="sortable">
              <div class="header-content">
                {{ $t('records.date') }}
                <Icon 
                  v-if="sortField === 'date'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('clockInTime')" class="sortable">
              <div class="header-content">
                {{ $t('records.clockInTime') }}
                <Icon 
                  v-if="sortField === 'clockInTime'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('clockOutTime')" class="sortable">
              <div class="header-content">
                {{ $t('records.clockOutTime') }}
                <Icon 
                  v-if="sortField === 'clockOutTime'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th @click="sortBy('workingMinutes')" class="sortable">
              <div class="header-content">
                {{ $t('records.workingHours') }}
                <Icon 
                  v-if="sortField === 'workingMinutes'" 
                  :name="sortDirection === 'asc' ? 'chevron.up' : 'chevron.down'" 
                  size="16" 
                />
              </div>
            </th>
            <th>{{ $t('records.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id" class="record-row">
            <td class="date-cell">
              <div class="date-content">
                <span class="body">{{ formatDate(record.date) }}</span>
                <span class="caption1 text-secondary">{{ formatWeekday(record.date) }}</span>
              </div>
            </td>
            <td class="time-cell">
              <span v-if="record.clockInTime" class="body">
                {{ formatTime(record.clockInTime) }}
              </span>
              <span v-else class="caption1 text-tertiary">--</span>
            </td>
            <td class="time-cell">
              <span v-if="record.clockOutTime" class="body">
                {{ formatTime(record.clockOutTime) }}
              </span>
              <span v-else class="caption1 text-tertiary">--</span>
            </td>
            <td class="duration-cell">
              <span class="body">{{ formatDuration(record.workingMinutes) }}</span>
            </td>
            <td class="status-cell">
              <div class="status-badge" :class="`status-badge--${record.status.toLowerCase()}`">
                <Icon :name="getStatusIcon(record.status)" size="16" />
                <span class="caption1">{{ getStatusText(record.status) }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <Button
        variant="ghost"
        size="small"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        <Icon name="chevron.left" size="16" />
        {{ $t('common.previous') }}
      </Button>
      
      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          :class="['page-number', { 'page-number--active': page === currentPage }]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </div>
      
      <Button
        variant="ghost"
        size="small"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        {{ $t('common.next') }}
        <Icon name="chevron.right" size="16" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AttendanceRecord, AttendanceStatus, RecordsFilter, RecordsSortOptions } from '~/types/attendance'

interface Props {
  records: AttendanceRecord[]
  isLoading?: boolean
  error?: string | null
  totalCount?: number
  currentPage?: number
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20
})

const emit = defineEmits<{
  'update:filters': [filters: RecordsFilter]
  'update:sort': [sort: RecordsSortOptions]
  'update:page': [page: number]
  'refresh': []
}>()

// Filter state
const filterStartDate = ref('')
const filterEndDate = ref('')

// Sort state
const sortField = ref<RecordsSortOptions['field']>('date')
const sortDirection = ref<RecordsSortOptions['direction']>('desc')

// Computed properties
const totalPages = computed(() => Math.ceil(props.totalCount / props.pageSize))

const totalRecordsText = computed(() => {
  const { t } = useI18n()
  return t('records.totalRecords', { count: props.totalCount })
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.currentPage - 2)
  const end = Math.min(totalPages.value, props.currentPage + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// Methods
const { formatDate, formatTime, formatDuration, formatWeekday } = useDateTime()
const { t } = useI18n()

const sortBy = (field: RecordsSortOptions['field']) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
  
  emit('update:sort', {
    field: sortField.value,
    direction: sortDirection.value
  })
}

const applyFilters = () => {
  const filters: RecordsFilter = {}
  
  if (filterStartDate.value) {
    filters.startDate = filterStartDate.value
  }
  
  if (filterEndDate.value) {
    filters.endDate = filterEndDate.value
  }
  
  emit('update:filters', filters)
}

const resetFilters = () => {
  filterStartDate.value = ''
  filterEndDate.value = ''
  
  emit('update:filters', {})
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:page', page)
  }
}

const fetchRecords = () => {
  emit('refresh')
}

const getStatusIcon = (status: AttendanceStatus): string => {
  switch (status) {
    case 'PRESENT':
      return 'checkmark.circle.fill'
    case 'ABSENT':
      return 'xmark.circle.fill'
    case 'PARTIAL':
      return 'exclamationmark.circle.fill'
    default:
      return 'questionmark.circle.fill'
  }
}

const getStatusText = (status: AttendanceStatus): string => {
  switch (status) {
    case 'PRESENT':
      return t('records.present')
    case 'ABSENT':
      return t('records.absent')
    case 'PARTIAL':
      return t('records.partial')
    default:
      return status
  }
}

// Initialize filters from current date
onMounted(() => {
  const { getCurrentDate } = useDateTime()
  const now = getCurrentDate()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  filterStartDate.value = firstDayOfMonth.toISOString().split('T')[0]
  filterEndDate.value = now.toISOString().split('T')[0]
  
  applyFilters()
})
</script>

<style scoped>
.record-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.table-title {
  flex: 1;
}

.table-filters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 300px;
}

.filter-group {
  display: flex;
  gap: var(--spacing-md);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
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

.table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-surface);
}

.records-table th {
  background-color: var(--color-surface-secondary);
  padding: var(--spacing-md);
  text-align: left;
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.records-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.records-table th.sortable:hover {
  background-color: var(--color-surface-tertiary);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.records-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.record-row:hover {
  background-color: var(--color-surface-secondary);
}

.date-cell {
  min-width: 120px;
}

.date-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-cell {
  min-width: 100px;
  text-align: center;
}

.duration-cell {
  min-width: 100px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.status-cell {
  min-width: 120px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-headline);
}

.status-badge--present {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--color-success);
}

.status-badge--absent {
  background-color: rgba(255, 59, 48, 0.1);
  color: var(--color-error);
}

.status-badge--partial {
  background-color: rgba(255, 149, 0, 0.1);
  color: var(--color-warning);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) 0;
}

.page-numbers {
  display: flex;
  gap: var(--spacing-sm);
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-subhead);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-number:hover {
  background-color: var(--color-surface-secondary);
  color: var(--color-text-primary);
}

.page-number--active {
  background-color: var(--color-primary);
  color: white;
}

.page-number--active:hover {
  background-color: var(--color-primary-dark);
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-filters {
    min-width: auto;
  }
  
  .filter-group {
    flex-direction: column;
  }
  
  .records-table th,
  .records-table td {
    padding: var(--spacing-sm);
  }
  
  .date-cell,
  .time-cell,
  .duration-cell,
  .status-cell {
    min-width: auto;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
}
</style>