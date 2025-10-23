<template>
  <div class="login-page">
    <div class="login-container">
      <Card variant="elevated" class="login-card">
        <template #header>
          <div class="login-header">
            <Icon name="clock.fill" :size="48" color="var(--color-primary)" />
            <h1 class="title2">{{ t('auth.signIn') }}</h1>
            <p class="subhead">{{ t('auth.pleaseSignIn') }}</p>
          </div>
        </template>

        <form @submit.prevent="handleLogin" class="login-form">
          <Input
            v-model="credentials.email"
            type="email"
            :label="t('auth.email')"
            :placeholder="t('auth.email')"
            :error="emailError"
            required
            size="large"
          />

          <Input
            v-model="credentials.password"
            type="password"
            :label="t('auth.password')"
            :placeholder="t('auth.password')"
            :error="passwordError"
            required
            size="large"
          />

          <div v-if="error" class="error-message">
            <Icon name="exclamationmark.triangle" :size="16" color="var(--color-error)" />
            <span class="footnote text-error">{{ error }}</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            :disabled="isLoading || !isFormValid"
            :loading="isLoading"
            class="login-button"
          >
            {{ t('auth.signIn') }}
          </Button>
        </form>
      </Card>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const { login, isLoading, error, clearError, isAuthenticated } = useAuth()

// Page meta
useHead({
  title: `${t('auth.signIn')} - 勤怠管理システム`
})

// Redirect if already authenticated
watchEffect(() => {
  if (isAuthenticated.value) {
    navigateTo('/')
  }
})

// Form state
const credentials = reactive({
  email: '',
  password: ''
})

const emailError = ref('')
const passwordError = ref('')

// Form validation
const isFormValid = computed(() => {
  return credentials.email.length > 0 && 
         credentials.password.length > 0 &&
         isValidEmail(credentials.email)
})

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Handle form submission
const handleLogin = async () => {
  // Clear previous errors
  clearError()
  emailError.value = ''
  passwordError.value = ''

  // Validate form
  if (!credentials.email) {
    emailError.value = t('validation.required')
    return
  }

  if (!isValidEmail(credentials.email)) {
    emailError.value = t('validation.email')
    return
  }

  if (!credentials.password) {
    passwordError.value = t('validation.required')
    return
  }

  try {
    await login(credentials)
    // Redirect will happen automatically via watchEffect
  } catch (err) {
    // Error is handled by the store
    console.error('Login failed:', err)
  }
}

// Clear errors when user types
watch(() => credentials.email, () => {
  emailError.value = ''
  clearError()
})

watch(() => credentials.password, () => {
  passwordError.value = ''
  clearError()
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  padding: var(--spacing-lg);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  width: 100%;
}

.login-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(255, 59, 48, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-error);
}

.login-button {
  width: 100%;
  margin-top: var(--spacing-md);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .login-page {
    padding: var(--spacing-md);
  }
  
  .login-container {
    max-width: 100%;
  }
}
</style>