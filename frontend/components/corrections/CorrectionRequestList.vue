<template>
  <div class="correction-list">
    <!-- Header -->
    <div class="list-header">
      <div class="header-content">
        <h2 class="title2">{{ $t('corrections.title') }}</h2>
        <p class="subhead">修正申請の一覧と承認・却下処理</p>
      </div>
      
      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <select
            v-model="filters.status"
            class="filter-select"
            @change="applyFilters"
          >
            <option value="">すべての状態</option>
            <option value="PENDING">{{ $t('corrections.pending') }}</option>
            <option value="APPROVED">{{ $t('corrections.approved') }}</option>
            <option value="REJECTED">{{ $t('corrections.rejected') }}</option>
          </select>
        </div>

        <div class="filter-group">
          <Input
            v-model="filters.employeeName"
            placeholder="従業員名で検索"
            @input="debouncedFilter"
          />
        </div>

        <Button
          variant="secondary"
          @click="resetFilters"
        >
          {{ $t('common.reset') }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="body">{{ $t('common.loading') }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="corrections.length === 0" class="empty-state">
      <Icon name="doc.text" size="48" class="text-secondary" />
      <h3 class="headline">修正申請がありません</h3>
      <p class="body text-secondary">
        {{ hasFilters ? 'フィルター条件に一致する申請が見つかりません' : '修正申請はまだありません' }}
      </p>
      <Button
        v-if="hasFilters"
        variant="secondary"
        @click="resetFilters"
      >
        フィルターをクリア
      </Button>
    </div>

    <!-- Correction List -->
    <div v-else class="corrections-container">
      <div class="list-info">
        <span class="caption1 text-secondary">
          {{ totalCount }}件の申請
        </span>
      </div>

      <div class="corrections-grid">
        <div
          v-for="correction in corrections"
          :key="correction.id"
          class="correction-card"
          :class="{
            'correction-card--pending': correction.status === 'PENDING',
            'correction-card--approved': correction.status === 'APPROVED',
            'correction-card--rejected': correction.status === 'REJECTED'
          }"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="employee-info">
              <h3 class="headline">{{ correction.employeeName || '不明な従業員' }}</h3>
              <span class="caption1 text-secondary">
                {{ formatDate(correction.originalDate) }}の記録
              </span>
            </div>
            <div class="status-badge" :class="`status-badge--${correction.status.toLowerCase()}`">
              {{ getStatusDisplayName(correction.status) }}
            </div>
          </div>

          <!-- Original vs Requested Times -->
          <div class="time-comparison">
            <div class="time-section">
              <h4 class="subhead">修正前</h4>
              <div class="time-details">
                <div class="time-item">
                  <span class="caption1 text-secondary">出勤</span>
                  <span class="body">{{ formatTime(correction.originalClockIn) || '未記録' }}</span>
                </div>
                <div class="time-item">
                  <span class="caption1 text-secondary">退勤</span>
                  <span class="body">{{ formatTime(correction.originalClockOut) || '未記録' }}</span>
                </div>
              </div>
            </div>

            <Icon name="arrow.right" size="20" class="text-secondary" />

            <div class="time-section">
              <h4 class="subhead">修正後</h4>
              <div class="time-details">
                <div class="time-item">
                  <span class="caption1 text-secondary">出勤</span>
                  <span class="body" :class="{ 'text-primary': correction.requestedClockIn }">
                    {{ formatTime(correction.requestedClockIn) || '変更なし' }}
                  </span>
                </div>
                <div class="time-item">
                  <span class="caption1 text-secondary">退勤</span>
                  <span class="body" :class="{ 'text-primary': correction.requestedClockOut }">
                    {{ formatTime(correction.requestedClockOut) || '変更なし' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reason -->
          <div class="reason-section">
            <h4 class="subhead">修正理由</h4>
            <p class="body">{{ correction.reason }}</p>
          </div>

          <!-- Request Info -->
          <div class="request-info">
            <div class="info-item">
              <span class="caption1 text-secondary">申請日時</span>
              <span class="caption1">{{ formatDateTime(correction.requestDate) }}</span>
            </div>
            <div v-if="correction.processedDate" class="info-item">
              <span class="caption1 text-secondary">処理日時</span>
              <span class="caption1">{{ formatDateTime(correction.processedDate) }}</span>
            </div>
          </div>

          <!-- Actions (for pending requests and managers/admins) -->
          <div
            v-if="correction.status === 'PENDING' && canApprove"
            class="card-actions"
          >
            <Button
              variant="secondary"
              size="small"
              @click="handleReject(correction)"
              :disabled="isProcessing"
            >
              <Icon name="xmark.circle" size="16" />
              {{ $t('corrections.reject') }}
            </Button>
            <Button
              variant="primary"
              size="small"
              @click="handleApprove(correction)"
              :disabled="isProcessing"
            >
              <Icon name="checkmark.circle" size="16" />
              {{ $t('corrections.approve') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <Button
          variant="secondary"
          size="small"
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage <= 1"
        >
          {{ $t('common.previous') }}
        </Button>
        
        <span class="pagination-info">
          {{ currentPage }} / {{ totalPages }}
        </span>
        
        <Button
          variant="secondary"
          size="small"
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
        >
          {{ $t('common.next') }}
        </Button>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="dialog-overlay" @click="closeConfirmDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="headline">
            {{ pendingAction === 'approve' ? $t('corrections.confirmApprove') : $t('corrections.confirmReject') }}
          </h3>
        </div>
        
        <div class="dialog-content">
          <p class="body">
            {{ selectedCorrection?.employeeName }}の修正申請を
            {{ pendingAction === 'approve' ? '承認' : '却下' }}しますか？
          </p>
          
          <div class="correction-summary">
            <div class="summary-item">
              <span class="caption1 text-secondary">対象日</span>
              <span class="body">{{ formatDate(selectedCorrection?.originalDate) }}</span>
            </div>
            <div class="summary-item">
              <span class="caption1 text-secondary">理由</span>
              <span class="body">{{ selectedCorrection?.reason }}</span>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <Button
            variant="secondary"
            @click="closeConfirmDialog"
            :disabled="isProcessing"
          >
            {{ $t('common.cancel') }}
          </Button>
          <Button
            :variant="pendingAction === 'approve' ? 'primary' : 'error'"
            @click="confirmAction"
            :loading="isProcessing"
          >
            {{ pendingAction === 'approve' ? $t('corrections.approve') : $t('corrections.reject') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CorrectionRequest, CorrectionRequestsFilter, CorrectionStatus } from '~/types/correction';

interface Props {
  canApprove?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canApprove: false
})

const emit = defineEmits<{
  'approve': [id: number]
  'reject': [id: number]
  'refresh': []
}>()

// Composables
const { t } = useI18n()
const { formatDate, formatTime, formatDateTime } = useDateTime()

// State
const corrections = ref<CorrectionRequest[]>([])
const isLoading = ref(false)
const isProcessing = ref(false)
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const showConfirmDialog = ref(false)
const selectedCorrection = ref<CorrectionRequest | null>(null)
const pendingAction = ref<'approve' | 'reject'>('approve')

const filters = ref<CorrectionRequestsFilter & { employeeName?: string }>({
  status: undefined,
  employeeName: ''
})

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const hasFilters = computed(() => {
  return !!(filters.value.status || filters.value.employeeName)
})

// Methods
const getStatusDisplayName = (status: CorrectionStatus): string => {
  switch (status) {
    case 'PENDING':
      return t('corrections.pending')
    case 'APPROVED':
      return t('corrections.approved')
    case 'REJECTED':
      return t('corrections.rejected')
    default:
      return status
  }
}

const loadCorrections = async (): Promise<void> => {
  isLoading.value = true
  try {
    // This would be implemented in the composable
    // const response = await fetchCorrections({
    //   ...filters.value,
    //   page: currentPage.value,
    //   pageSize: pageSize.value
    // })
    // corrections.value = response.corrections
    // totalCount.value = response.totalCount
    
    // Mock data for now
    corrections.value = []
    totalCount.value = 0
  } catch (error) {
    console.error('Failed to load corrections:', error)
  } finally {
    isLoading.value = false
  }
}

const applyFilters = (): void => {
  currentPage.value = 1
  loadCorrections()
}

const debouncedFilter = debounce(() => {
  applyFilters()
}, 300)

const resetFilters = (): void => {
  filters.value = {
    status: undefined,
    employeeName: ''
  }
  currentPage.value = 1
  loadCorrections()
}

const goToPage = (page: number): void => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadCorrections()
  }
}

const handleApprove = (correction: CorrectionRequest): void => {
  selectedCorrection.value = correction
  pendingAction.value = 'approve'
  showConfirmDialog.value = true
}

const handleReject = (correction: CorrectionRequest): void => {
  selectedCorrection.value = correction
  pendingAction.value = 'reject'
  showConfirmDialog.value = true
}

const confirmAction = async (): Promise<void> => {
  if (!selectedCorrection.value) return

  isProcessing.value = true
  try {
    if (pendingAction.value === 'approve') {
      emit('approve', selectedCorrection.value.id)
    } else {
      emit('reject', selectedCorrection.value.id)
    }
    closeConfirmDialog()
    await loadCorrections()
  } catch (error) {
    console.error('Failed to process correction:', error)
  } finally {
    isProcessing.value = false
  }
}

const closeConfirmDialog = (): void => {
  showConfirmDialog.value = false
  selectedCorrection.value = null
  pendingAction.value = 'approve'
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Initialize
onMounted(() => {
  loadCorrections()
})

// Expose refresh method
defineExpose({
  refresh: loadCorrections
})
</script>

<style scoped>
.correction-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.list-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.header-content {
  text-align: center;
}

.filters {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.corrections-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.list-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.corrections-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.correction-card {
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all 0.2s ease;
}

.correction-card--pending {
  border-left: 4px solid var(--color-warning);
}

.correction-card--approved {
  border-left: 4px solid var(--color-success);
}

.correction-card--rejected {
  border-left: 4px solid var(--color-error);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.employee-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-caption1);
  font-weight: var(--font-weight-headline);
}

.status-badge--pending {
  background-color: rgba(255, 149, 0, 0.1);
  color: var(--color-warning);
}

.status-badge--approved {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--color-success);
}

.status-badge--rejected {
  background-color: rgba(255, 59, 48, 0.1);
  color: var(--color-error);
}

.time-comparison {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.time-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.time-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reason-section {
  margin-bottom: var(--spacing-md);
}

.reason-section h4 {
  margin-bottom: var(--spacing-sm);
}

.request-info {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.card-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
}

.pagination-info {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-header {
  margin-bottom: var(--spacing-md);
}

.dialog-content {
  margin-bottom: var(--spacing-lg);
}

.correction-summary {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.summary-item:last-child {
  border-bottom: none;
}

.dialog-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .correction-list {
    padding: var(--spacing-md);
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .time-comparison {
    flex-direction: column;
    align-items: stretch;
  }

  .request-info {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .card-actions {
    flex-direction: column;
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }
}
</style>