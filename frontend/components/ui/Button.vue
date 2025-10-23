<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <slot name="icon" />
    <span v-if="$slots.default" class="button-text">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  type: 'button'
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => [
  'button',
  `button--${props.variant}`,
  `button--${props.size}`,
  {
    'button--disabled': props.disabled,
    'button--loading': props.loading
  }
])
</script>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-family-system);
  font-weight: var(--font-weight-headline);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: var(--touch-target-min);
  position: relative;
  text-decoration: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Variants */
.button--primary {
  background-color: var(--color-primary);
  color: white;
}

.button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button--primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.button--secondary {
  background-color: var(--color-surface);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.button--secondary:hover:not(:disabled) {
  background-color: var(--color-surface-secondary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button--tertiary {
  background-color: var(--color-surface-secondary);
  color: var(--color-text-primary);
}

.button--tertiary:hover:not(:disabled) {
  background-color: var(--color-surface-tertiary);
}

.button--destructive {
  background-color: var(--color-error);
  color: white;
}

.button--destructive:hover:not(:disabled) {
  background-color: #d70015;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button--ghost {
  background-color: transparent;
  color: var(--color-primary);
}

.button--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-secondary);
}

/* Sizes */
.button--small {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-footnote);
  min-height: 32px;
}

.button--medium {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-body);
}

.button--large {
  padding: var(--spacing-lg) var(--spacing-xl);
  font-size: var(--font-size-headline);
  min-height: 56px;
}

/* States */
.button--disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.button--loading {
  cursor: wait;
}

.button--loading .button-text {
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .button {
    min-height: var(--touch-target-min);
  }
  
  .button--large {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-body);
  }
}
</style>