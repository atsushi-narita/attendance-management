<template>
  <span :class="iconClasses" :style="iconStyles">
    {{ iconSymbol }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  name: string
  size?: number | string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 20
})

// SF Symbols mapping to Unicode characters
const iconMap: Record<string, string> = {
  // Clock icons
  'clock': '🕐',
  'clock.fill': '🕐',
  'clock.arrow.2.circlepath': '🔄',
  'clock.arrow.circlepath': '🔄',
  
  // Navigation icons
  'house': '🏠',
  'house.fill': '🏠',
  'person': '👤',
  'person.fill': '👤',
  'list.bullet': '📋',
  'chart.bar': '📊',
  'gear': '⚙️',
  'gear.fill': '⚙️',
  
  // Action icons
  'plus': '➕',
  'minus': '➖',
  'checkmark': '✓',
  'xmark': '✕',
  'pencil': '✏️',
  'trash': '🗑️',
  'arrow.right': '→',
  'arrow.left': '←',
  'arrow.up': '↑',
  'arrow.down': '↓',
  
  // Status icons
  'checkmark.circle': '✅',
  'checkmark.circle.fill': '✅',
  'xmark.circle': '❌',
  'xmark.circle.fill': '❌',
  'exclamationmark.triangle': '⚠️',
  'info.circle': 'ℹ️',
  
  // Time icons
  'calendar': '📅',
  'calendar.fill': '📅',
  'timer': '⏱️',
  
  // User icons
  'person.crop.circle': '👤',
  'person.crop.circle.fill': '👤',
  'person.2': '👥',
  'person.2.fill': '👥'
}

const iconSymbol = computed(() => {
  return iconMap[props.name] || '?'
})

const iconClasses = computed(() => [
  'icon'
])

const iconStyles = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
  color: props.color || 'currentColor'
}))
</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  user-select: none;
  flex-shrink: 0;
}
</style>