<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    
    <div class="card-content">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'medium'
})

const cardClasses = computed(() => [
  'card',
  `card--${props.variant}`,
  `card--padding-${props.padding}`
])
</script>

<style scoped>
.card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.2s ease;
}

.card--default {
  border: 1px solid var(--color-border);
}

.card--elevated {
  box-shadow: var(--shadow-md);
  border: none;
}

.card--outlined {
  border: 2px solid var(--color-border);
}

.card-header {
  padding: var(--spacing-lg) var(--spacing-lg) 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-lg);
}

.card-content {
  flex: 1;
}

.card-footer {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-lg);
}

/* Padding variants */
.card--padding-none .card-content {
  padding: 0;
}

.card--padding-small .card-content {
  padding: var(--spacing-md);
}

.card--padding-medium .card-content {
  padding: var(--spacing-lg);
}

.card--padding-large .card-content {
  padding: var(--spacing-xl);
}

/* Responsive */
@media (max-width: 768px) {
  .card {
    border-radius: var(--radius-md);
  }
  
  .card--padding-medium .card-content {
    padding: var(--spacing-md);
  }
  
  .card--padding-large .card-content {
    padding: var(--spacing-lg);
  }
}
</style>