<template>
  <div class="corrections-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="large-title">{{ $t('corrections.title') }}</h1>
        <p class="body text-secondary">修正申請の管理と承認処理</p>
      </div>
      
      <!-- Stats Cards (for managers/admins) -->
      <div v-if="canApprove && stats" class="stats-cards">
        <div class="stat-card stat-card--pending">
          <div class="stat-content">
            <Icon name="clock" size="24" />
            <div class="stat-info">
              <span class="stat-number">{{ stats.pending }}</span>
              <span class="stat-label">承認待ち</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card stat-card--approved">
          <div class="stat-content">
            <Icon name="checkmark.circle" size="24" />
            <div class="stat-info">
              <span class="stat-number">{{ stats.approved }}</span>
              <span class="stat-label">承認済み</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card stat-card--rejected">
          <div class="stat-content">
            <Icon name="xmark.circle" size="24" />
            <div class="stat-info">
              <span class="stat-number">{{ stats.rejected }}</span>
              <span class="stat-label">却下</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="action-left">
        <Button
          v-if="!canApprove"
          variant="primary"
          @click="showRequestForm = true"
        >
          <Icon name="plus" size="16" />
          新しい修正申請
        </Button>
      </div>
      
      <div class="action-right">
        <Button
          variant="secondary"
          @click="refreshData"
          :disabled="isLoading"
        >
          <Icon name="arrow.clockwise" size="16" />
          {{ $t('common.refresh') }}
        </Button>
      </div>
    </div>

    <!-- Correction Request List -->
    <CorrectionRequestList
      ref="correctionListRef"
      :can-approve="canApprove"
      @approve="handleApprove"
      @reject="handleReject"
      @refresh="refreshData"
    />

    <!-- Correction Request Form Modal -->
    <div v-if="showRequestForm" class="modal-overlay" @click="closeRequestForm">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2 class="title2">修正申請の作成</h2>
          <Button
            variant="tertiary"
            size="small"
            @click="closeRequestForm"
          >
            <Icon name="xmark" size="16" />
          </Button>
        </div>
        
        <div class="modal-content">
          <!-- Record Selection -->
          <div v-if="!selectedRecord" class="record-selection">
            <h3 class="headline">修正対象の記録を選択</h3>
            <p class="body text-secondary">修正したい勤務記録を選択してください</p>
            
            <div class="record-list">
              <div
                v-for="record in recentRecords"
                :key="record.id"
                class="record-item"
                @click="selectRecord(record)"
              >
                <div class="record-info">
                  <span class="headline">{{ formatDate(record.date) }}</span>
                  <div class="record-times">
                    <span class="caption1 text-secondary">
                      {{ formatTime(record.clockInTime) || '未記録' }} - 
                      {{ formatTime(record.clockOutTime) || '未記録' }}
                    </span>
                  </div>
                </div>
                <Icon name="chevron.right" size="16" class="text-secondary" />
              </div>
            </div>
          </div>
          
          <!-- Correction Form -->
          <CorrectionRequestForm
            v-else
            :original-record="selectedRecord"
            :is-open="showRequestForm"
            @submit="handleSubmitRequest"
            @cancel="handleCancelRequest"
          />
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="body">{{ $t('common.loading') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AttendanceRecord } from '~/types/attendance'
import type { CorrectionRequestFormData } from '~/types/correction'

// Meta
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// Composables
const { t } = useI18n()
const { formatDate, formatTime } = useDateTime()
const { isManager, isAdmin } = useAuth()
const { corrections, isLoading, submitCorrectionRequest, approveCorrectionRequest, rejectCorrectionRequest, getCorrectionStats } = useCorrections()
const { fetchRecords } = useRecords()

// State
const showRequestForm = ref(false)
const selectedRecord = ref<AttendanceRecord | null>(null)
const recentRecords = ref<AttendanceRecord[]>([])
const stats = ref<{ pending: number; approved: number; rejected: number; total: number } | null>(null)
const correctionListRef = ref()

// Computed
const canApprove = computed(() => isManager.value || isAdmin.value)

// Methods
const loadRecentRecords = async (): Promise<void> => {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Last 30 days
    
    const response = await fetchRecords({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      pageSize: 10
    })
    
    if (response) {
      recentRecords.value = response.records
    }
  } catch (error) {
    console.error('Failed to load recent records:', error)
  }
}

const loadStats = async (): Promise<void> => {
  if (canApprove.value) {
    try {
      stats.value = await getCorrectionStats()
    } catch (error) {
      console.error('Failed to load correction stats:', error)
    }
  }
}

const refreshData = async (): Promise<void> => {
  await Promise.all([
    correctionListRef.value?.refresh(),
    loadStats()
  ])
}

const selectRecord = (record: AttendanceRecord): void => {
  selectedRecord.value = record
}

const handleSubmitRequest = async (data: CorrectionRequestFormData): Promise<void> => {
  try {
    const result = await submitCorrectionRequest(data)
    if (result) {
      closeRequestForm()
      await refreshData()
    }
  } catch (error) {
    console.error('Failed to submit correction request:', error)
  }
}

const handleCancelRequest = (): void => {
  selectedRecord.value = null
}

const closeRequestForm = (): void => {
  showRequestForm.value = false
  selectedRecord.value = null
}

const handleApprove = async (id: number): Promise<void> => {
  try {
    const success = await approveCorrectionRequest(id)
    if (success) {
      await refreshData()
    }
  } catch (error) {
    console.error('Failed to approve correction:', error)
  }
}

const handleReject = async (id: number): Promise<void> => {
  try {
    const success = await rejectCorrectionRequest(id)
    if (success) {
      await refreshData()
    }
  } catch (error) {
    console.error('Failed to reject correction:', error)
  }
}

// Watch for form opening to load recent records
watch(showRequestForm, (isOpen) => {
  if (isOpen && !canApprove.value) {
    loadRecentRecords()
  }
})

// Initialize
onMounted(async () => {
  await Promise.all([
    refreshData(),
    loadStats()
  ])
})
</script>

<style scoped>
.corrections-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.header-content {
  text-align: center;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all 0.2s ease;
}

.stat-card--pending {
  border-left: 4px solid var(--color-warning);
}

.stat-card--approved {
  border-left: 4px solid var(--color-success);
}

.stat-card--rejected {
  border-left: 4px solid var(--color-error);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-number {
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--font-size-caption1);
  color: var(--color-text-secondary);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.action-left,
.action-right {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

/* Modal Styles */
.modal-overlay {
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
  padding: var(--spacing-lg);
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-content {
  padding: var(--spacing-lg);
}

.record-selection {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-surface-secondary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.record-item:hover {
  border-color: var(--color-primary);
  background-color: rgba(0, 122, 255, 0.05);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.record-times {
  display: flex;
  gap: var(--spacing-sm);
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  background-color: var(--color-surface);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

/* Responsive */
@media (max-width: 768px) {
  .corrections-page {
    padding: var(--spacing-md);
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .action-bar {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .action-left,
  .action-right {
    justify-content: center;
  }

  .modal-overlay {
    padding: var(--spacing-md);
  }

  .modal {
    max-height: 95vh;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .record-item:hover {
    background-color: rgba(0, 122, 255, 0.1);
  }
}
</style>