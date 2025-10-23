export interface NotificationOptions {
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  persistent?: boolean
}

export interface Notification extends NotificationOptions {
  id: string
  timestamp: number
}

export const useNotification = () => {
  const notifications = ref<Notification[]>([])

  const show = (options: NotificationOptions): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const notification: Notification = {
      id,
      timestamp: Date.now(),
      duration: 5000, // Default 5 seconds
      persistent: false,
      ...options
    }

    notifications.value.push(notification)

    // Auto-remove notification after duration (unless persistent)
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        remove(id)
      }, notification.duration)
    }

    return id
  }

  const remove = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clear = (): void => {
    notifications.value = []
  }

  const success = (message: string, title?: string, duration?: number): string => {
    return show({ type: 'success', message, title, duration })
  }

  const error = (message: string, title?: string, persistent = false): string => {
    return show({ type: 'error', message, title, persistent })
  }

  const warning = (message: string, title?: string, duration?: number): string => {
    return show({ type: 'warning', message, title, duration })
  }

  const info = (message: string, title?: string, duration?: number): string => {
    return show({ type: 'info', message, title, duration })
  }

  return {
    notifications: readonly(notifications),
    show,
    remove,
    clear,
    success,
    error,
    warning,
    info
  }
}

// Global notification state
const globalNotifications = ref<Notification[]>([])

export const useGlobalNotification = () => {
  const show = (options: NotificationOptions): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const notification: Notification = {
      id,
      timestamp: Date.now(),
      duration: 5000,
      persistent: false,
      ...options
    }

    globalNotifications.value.push(notification)

    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        remove(id)
      }, notification.duration)
    }

    return id
  }

  const remove = (id: string): void => {
    const index = globalNotifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      globalNotifications.value.splice(index, 1)
    }
  }

  const clear = (): void => {
    globalNotifications.value = []
  }

  const success = (message: string, title?: string, duration?: number): string => {
    return show({ type: 'success', message, title, duration })
  }

  const error = (message: string, title?: string, persistent = false): string => {
    return show({ type: 'error', message, title, persistent })
  }

  const warning = (message: string, title?: string, duration?: number): string => {
    return show({ type: 'warning', message, title, duration })
  }

  const info = (message: string, title?: string, duration?: number): string => {
    return show({ type: 'info', message, title, duration })
  }

  return {
    notifications: readonly(globalNotifications),
    show,
    remove,
    clear,
    success,
    error,
    warning,
    info
  }
}