<template>
  <div class="layout">
    <header class="layout-header">
      <nav class="navigation">
        <div class="nav-container">
          <div class="nav-brand">
            <Icon name="clock.fill" :size="24" />
            <span class="headline">勤怠管理</span>
          </div>

          <div class="nav-items">
            <NuxtLink
              v-for="item in navigationItems"
              :key="item.path"
              :to="item.path"
              class="nav-item"
              :class="{ 'nav-item--active': $route.path === item.path }"
            >
              <Icon :name="item.icon" :size="20" />
              <span class="caption1">{{ item.label }}</span>
            </NuxtLink>
          </div>

          <div class="nav-user">
            <div v-if="user" class="user-info">
              <span class="subhead">{{ user.name || user.email }}</span>
              <Button variant="ghost" size="small" @click="handleLogout">
                {{ t('auth.logout') }}
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <main class="layout-main">
      <slot />
    </main>

    <!-- Global Notifications -->
    <NotificationContainer />
  </div>
</template>

<script setup>
const { t } = useI18n()
const { user, logout } = useAuth()

const handleLogout = async () => {
  try {
    await logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const navigationItems = computed(() => {
  const items = [
    {
      path: '/',
      label: t('navigation.dashboard'),
      icon: 'house.fill'
    },
    {
      path: '/attendance',
      label: t('navigation.attendance'),
      icon: 'clock.fill'
    },
    {
      path: '/records',
      label: t('navigation.records'),
      icon: 'list.bullet'
    }
  ]

  // Add admin-only navigation items
  if (user.value?.groups?.includes('admins')) {
    items.push({
      path: '/admin/employees',
      label: t('navigation.employees'),
      icon: 'person.2.fill'
    })
  }

  items.push({
    path: '/corrections',
    label: t('navigation.corrections'),
    icon: 'pencil'
  })

  return items
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
}

.layout-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.navigation {
  width: 100%;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary);
}

.nav-items {
  display: flex;
  gap: var(--spacing-lg);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  justify-content: center;
}

.nav-item:hover {
  background-color: var(--color-surface-secondary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.nav-item--active {
  color: var(--color-primary);
  background-color: var(--color-surface-secondary);
}

.nav-user {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background-color: var(--color-surface-secondary);
}

.layout-main {
  flex: 1;
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Mobile Navigation */
@media (max-width: 768px) {
  .nav-container {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  
  .nav-items {
    display: none; /* Will implement mobile menu later */
  }
  
  .layout-main {
    padding: var(--spacing-md);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .nav-container {
    padding: var(--spacing-md) var(--spacing-lg);
  }
}
</style>