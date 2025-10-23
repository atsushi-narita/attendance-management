<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
const { checkAuthState } = useAuth()

// Global app configuration
useHead({
  title: '勤怠管理システム',
  meta: [
    { name: 'description', content: '従業員の勤怠を管理するシステム' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})

// Check authentication state on app initialization
onMounted(async () => {
  await checkAuthState()
})
</script>