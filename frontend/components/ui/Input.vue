<template>
  <div class="input-wrapper">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="input-required">*</span>
    </label>
    
    <div class="input-container">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <div v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix" />
      </div>
    </div>
    
    <div v-if="error || hint" class="input-message">
      <span v-if="error" class="input-error">{{ error }}</span>
      <span v-else-if="hint" class="input-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'medium'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const inputClasses = computed(() => [
  'input',
  `input--${props.size}`,
  {
    'input--error': props.error,
    'input--disabled': props.disabled,
    'input--readonly': props.readonly
  }
])

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}
</script>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.input-label {
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
  line-height: var(--line-height-subhead);
}

.input-required {
  color: var(--color-error);
  margin-left: 2px;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-family-system);
  transition: all 0.2s ease;
  outline: none;
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

/* Sizes */
.input--small {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-footnote);
  min-height: 32px;
}

.input--medium {
  padding: var(--spacing-md) var(--spacing-md);
  font-size: var(--font-size-body);
  min-height: var(--touch-target-min);
}

.input--large {
  padding: var(--spacing-lg) var(--spacing-md);
  font-size: var(--font-size-headline);
  min-height: 56px;
}

/* States */
.input--error {
  border-color: var(--color-error);
}

.input--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.input--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-surface-secondary);
}

.input--readonly {
  background-color: var(--color-surface-secondary);
  cursor: default;
}

.input-suffix {
  position: absolute;
  right: var(--spacing-md);
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
}

.input-message {
  min-height: 20px;
}

.input-error {
  font-size: var(--font-size-caption1);
  color: var(--color-error);
  line-height: var(--line-height-caption1);
}

.input-hint {
  font-size: var(--font-size-caption1);
  color: var(--color-text-secondary);
  line-height: var(--line-height-caption1);
}

/* Responsive */
@media (max-width: 768px) {
  .input--large {
    padding: var(--spacing-md) var(--spacing-md);
    font-size: var(--font-size-body);
    min-height: var(--touch-target-min);
  }
}
</style>