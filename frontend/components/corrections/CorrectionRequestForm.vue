<template>
  <div class="correction-form">
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Form Header -->
      <div class="form-header">
        <h2 class="title2">{{ $t('corrections.requestCorrection') }}</h2>
        <p class="subhead">勤務記録の修正を申請します</p>
      </div>

      <!-- Original Record Display -->
      <div v-if="originalRecord" class="original-record">
        <h3 class="headline">修正対象の記録</h3>
        <div class="record-card">
          <div class="record-info">
            <div class="info-item">
              <span class="caption1 text-secondary">日付</span>
              <span class="body">{{ formatDate(originalRecord.date) }}</span>
            </div>
            <div class="info-item">
              <span class="caption1 text-secondary">出勤時刻</span>
              <span class="body">{{ formatTime(originalRecord.clockInTime) || '未記録' }}</span>
            </div>
            <div class="info-item">
              <span class="caption1 text-secondary">退勤時刻</span>
              <span class="body">{{ formatTime(originalRecord.clockOutTime) || '未記録' }}</span>
            </div>
            <div class="info-item">
              <span class="caption1 text-secondary">勤務時間</span>
              <span class="body">{{ formatWorkingHours(originalRecord.workingMinutes) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Fields -->
      <div class="form-fields">
        <!-- Requested Clock In Time -->
        <div class="field-group">
          <Input
            v-model="formData.requestedClockIn"
            type="datetime-local"
            :label="$t('corrections.requestedClockIn')"
            :error="validationErrors.requestedClockIn"
            @blur="validateField('requestedClockIn')"
          />
          <p class="caption1 text-secondary field-hint">
            修正後の出勤時刻を入力してください（変更しない場合は空欄）
          </p>
        </div>

        <!-- Requested Clock Out Time -->
        <div class="field-group">
          <Input
            v-model="formData.requestedClockOut"
            type="datetime-local"
            :label="$t('corrections.requestedClockOut')"
            :error="validationErrors.requestedClockOut"
            @blur="validateField('requestedClockOut')"
          />
          <p class="caption1 text-secondary field-hint">
            修正後の退勤時刻を入力してください（変更しない場合は空欄）
          </p>
        </div>

        <!-- Reason Field -->
        <div class="field-group">
          <label class="field-label">
            {{ $t('corrections.reason') }}
            <span class="required-indicator">*</span>
          </label>
          <textarea
            v-model="formData.reason"
            class="reason-textarea"
            :class="{ 'error': validationErrors.reason }"
            placeholder="修正が必要な理由を詳しく入力してください"
            rows="4"
            @blur="validateField('reason')"
          />
          <p v-if="validationErrors.reason" class="field-error">
            {{ validationErrors.reason }}
          </p>
          <p class="caption1 text-secondary field-hint">
            修正理由は承認者が確認します。詳細に記載してください。
          </p>
        </div>
      </div>

      <!-- Confirmation Section -->
      <div v-if="showConfirmation" class="confirmation-section">
        <h3 class="headline">申請内容の確認</h3>
        <div class="confirmation-card">
          <div class="confirmation-item">
            <span class="caption1 text-secondary">対象日</span>
            <span class="body">{{ formatDate(originalRecord?.date) }}</span>
          </div>
          <div v-if="formData.requestedClockIn" class="confirmation-item">
            <span class="caption1 text-secondary">修正後出勤時刻</span>
            <span class="body">{{ formatDateTime(formData.requestedClockIn) }}</span>
          </div>
          <div v-if="formData.requestedClockOut" class="confirmation-item">
            <span class="caption1 text-secondary">修正後退勤時刻</span>
            <span class="body">{{ formatDateTime(formData.requestedClockOut) }}</span>
          </div>
          <div class="confirmation-item">
            <span class="caption1 text-secondary">理由</span>
            <span class="body">{{ formData.reason }}</span>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <Button
          variant="secondary"
          type="button"
          @click="handleCancel"
          :disabled="isSubmitting"
        >
          {{ $t('common.cancel') }}
        </Button>
        
        <Button
          v-if="!showConfirmation"
          variant="primary"
          type="button"
          @click="showConfirmationDialog"
          :disabled="!isFormValid || isSubmitting"
        >
          {{ $t('common.confirm') }}
        </Button>

        <Button
          v-else
          variant="primary"
          type="submit"
          :disabled="!isFormValid || isSubmitting"
          :loading="isSubmitting"
        >
          {{ $t('corrections.submitRequest') }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { AttendanceRecord } from '~/types/attendance';
import type { CorrectionRequestFormData, CorrectionRequestValidationErrors } from '~/types/correction';

interface Props {
  originalRecord?: AttendanceRecord | null
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  originalRecord: null,
  isOpen: false
})

const emit = defineEmits<{
  'submit': [data: CorrectionRequestFormData]
  'cancel': []
  'close': []
}>()

// Composables
const { t } = useI18n()
const { formatDate, formatTime, formatDateTime } = useDateTime()

// State
const formData = ref<CorrectionRequestFormData>({
  originalRecordId: 0,
  requestedClockIn: null,
  requestedClockOut: null,
  reason: ''
})

const validationErrors = ref<CorrectionRequestValidationErrors>({})
const isSubmitting = ref(false)
const showConfirmation = ref(false)

// Computed
const isFormValid = computed(() => {
  return (
    formData.value.originalRecordId > 0 &&
    formData.value.reason.trim() !== '' &&
    (formData.value.requestedClockIn || formData.value.requestedClockOut) &&
    Object.keys(validationErrors.value).length === 0
  )
})

// Methods
const formatWorkingHours = (minutes: number | null): string => {
  if (!minutes) return '0時間0分'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}時間${mins}分`
}

const validateField = (field: keyof CorrectionRequestFormData): void => {
  const errors: CorrectionRequestValidationErrors = { ...validationErrors.value }

  switch (field) {
    case 'requestedClockIn':
      if (formData.value.requestedClockIn) {
        const clockInTime = new Date(formData.value.requestedClockIn)
        if (isNaN(clockInTime.getTime())) {
          errors.requestedClockIn = '有効な日時を入力してください'
        } else if (formData.value.requestedClockOut) {
          const clockOutTime = new Date(formData.value.requestedClockOut)
          if (clockInTime >= clockOutTime) {
            errors.requestedClockIn = '出勤時刻は退勤時刻より前である必要があります'
          } else {
            delete errors.requestedClockIn
          }
        } else {
          delete errors.requestedClockIn
        }
      } else {
        delete errors.requestedClockIn
      }
      break

    case 'requestedClockOut':
      if (formData.value.requestedClockOut) {
        const clockOutTime = new Date(formData.value.requestedClockOut)
        if (isNaN(clockOutTime.getTime())) {
          errors.requestedClockOut = '有効な日時を入力してください'
        } else if (formData.value.requestedClockIn) {
          const clockInTime = new Date(formData.value.requestedClockIn)
          if (clockOutTime <= clockInTime) {
            errors.requestedClockOut = '退勤時刻は出勤時刻より後である必要があります'
          } else {
            delete errors.requestedClockOut
          }
        } else {
          delete errors.requestedClockOut
        }
      } else {
        delete errors.requestedClockOut
      }
      break

    case 'reason':
      if (!formData.value.reason.trim()) {
        errors.reason = '修正理由は必須です'
      } else if (formData.value.reason.trim().length < 10) {
        errors.reason = '修正理由は10文字以上で入力してください'
      } else if (formData.value.reason.trim().length > 500) {
        errors.reason = '修正理由は500文字以内で入力してください'
      } else {
        delete errors.reason
      }
      break
  }

  validationErrors.value = errors
}

const validateAllFields = (): boolean => {
  // Check if at least one time field is provided
  if (!formData.value.requestedClockIn && !formData.value.requestedClockOut) {
    validationErrors.value.requestedClockIn = '出勤時刻または退勤時刻のいずれかは必須です'
    return false
  }

  const fields: (keyof CorrectionRequestFormData)[] = ['requestedClockIn', 'requestedClockOut', 'reason']
  fields.forEach(field => validateField(field))
  return Object.keys(validationErrors.value).length === 0
}

const resetForm = (): void => {
  formData.value = {
    originalRecordId: 0,
    requestedClockIn: null,
    requestedClockOut: null,
    reason: ''
  }
  validationErrors.value = {}
  showConfirmation.value = false
}

const loadRecordData = (): void => {
  if (props.originalRecord) {
    formData.value.originalRecordId = props.originalRecord.id
    // Pre-fill with current times if available
    if (props.originalRecord.clockInTime) {
      formData.value.requestedClockIn = new Date(props.originalRecord.clockInTime).toISOString().slice(0, 16)
    }
    if (props.originalRecord.clockOutTime) {
      formData.value.requestedClockOut = new Date(props.originalRecord.clockOutTime).toISOString().slice(0, 16)
    }
  } else {
    resetForm()
  }
  validationErrors.value = {}
}

const showConfirmationDialog = (): void => {
  if (!validateAllFields()) {
    return
  }
  showConfirmation.value = true
}

const handleSubmit = async (): Promise<void> => {
  if (!validateAllFields()) {
    return
  }

  isSubmitting.value = true

  try {
    emit('submit', { ...formData.value })
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = (): void => {
  if (showConfirmation.value) {
    showConfirmation.value = false
  } else {
    resetForm()
    emit('cancel')
  }
}

// Watch for record changes
watch(() => props.originalRecord, loadRecordData, { immediate: true })

// Watch for form open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadRecordData()
  }
})
</script>

<style scoped>
.correction-form {
  max-width: 700px;
  margin: 0 auto;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.form-header {
  text-align: center;
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.original-record {
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.record-card {
  margin-top: var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.record-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.field-label {
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.required-indicator {
  color: var(--color-error);
  font-size: var(--font-size-caption1);
}

.field-hint {
  margin-top: var(--spacing-xs);
}

.field-error {
  color: var(--color-error);
  font-size: var(--font-size-caption1);
  margin-top: var(--spacing-xs);
}

.reason-textarea {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s ease;
}

.reason-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.reason-textarea.error {
  border-color: var(--color-error);
}

.confirmation-section {
  background-color: var(--color-surface-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.confirmation-card {
  margin-top: var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.confirmation-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.confirmation-item:last-child {
  border-bottom: none;
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .correction-form {
    max-width: none;
    margin: 0;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .form-actions button {
    width: 100%;
  }

  .record-info {
    grid-template-columns: 1fr;
  }

  .confirmation-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .reason-textarea {
    background-color: var(--color-surface-secondary);
  }
}
</style>