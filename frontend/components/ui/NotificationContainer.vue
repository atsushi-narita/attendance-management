<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="notificationClasses(notification)"
          @click="remove(notification.id)"
        >
          <div class="notification-icon">
            <Icon :name="getIcon(notification.type)" :size="20" />
          </div>
          <div class="notification-content">
            <h4 v-if="notification.title" class="notification-title">
              {{ notification.title }}
            </h4>
            <p class="notification-message">{{ notification.message }}</p>
          </div>
          <button class="notification-close" @click.stop="remove(notification.id)">
            <Icon name="xmark" :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Notification } from '~/composables/useNotification'

const { notifications, remove } = useGlobalNotification()

const notificationClasses = (notification: Notification) => [
  'notification',
  `notification--${notification.type}`
]

const getIcon = (type: string): string => {
  switch (type) {
    case 'success':
      return 'checkmark.circle.fill'
    case 'error':
      return 'exclamationmark.triangle.fill'
    case 'warning':
      return 'exclamationmark.triangle'
    case 'info':
      return 'info.circle'
    default:
      return 'info.circle'
  }
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-width: 400px;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.notification:hover {
  transform: translateX(-4px);
  box-shadow: var(--shadow-xl);
}

.notification--success {
  border-left-color: var(--color-success);
}

.notification--success .notification-icon {
  color: var(--color-success);
}

.notification--error {
  border-left-color: var(--color-error);
}

.notification--error .notification-icon {
  color: var(--color-error);
}

.notification--warning {
  border-left-color: var(--color-warning);
}

.notification--warning .notification-icon {
  color: var(--color-warning);
}

.notification--info {
  border-left-color: var(--color-primary);
}

.notification--info .notification-icon {
  color: var(--color-primary);
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-headline);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.notification-message {
  font-size: var(--font-size-caption1);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.notification-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.notification-close:hover {
  background-color: var(--color-surface-secondary);
  color: var(--color-text-secondary);
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Responsive */
@media (max-width: 768px) {
  .notification-container {
    top: var(--spacing-md);
    right: var(--spacing-md);
    left: var(--spacing-md);
    max-width: none;
  }
  
  .notification {
    padding: var(--spacing-sm);
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .notification {
    background-color: var(--color-surface-secondary);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .notification-enter-active,
  .notification-leave-active,
  .notification-move,
  .notification {
    transition: none;
  }
  
  .notification:hover {
    transform: none;
  }
}
</style>