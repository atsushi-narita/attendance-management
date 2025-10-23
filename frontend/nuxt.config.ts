// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // Performance optimizations
  experimental: {
    payloadExtraction: false,
    inlineSSRStyles: false,
  },
  
  // Build optimizations
  build: {
    transpile: ['@aws-amplify/ui-vue']
  },
  
  // Vite optimizations
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'aws-amplify': ['aws-amplify'],
            'vue-vendor': ['vue', 'vue-router'],
            'ui-vendor': ['@aws-amplify/ui-vue'],
            'utils': ['dayjs', 'pinia']
          }
        }
      },
      // Enable compression
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['aws-amplify', 'dayjs', 'pinia']
    }
  },
  
  // CSS optimizations
  css: [
    '~/assets/css/main.css'
  ],
  
  // Runtime config for environment variables
  runtimeConfig: {
    public: {
      awsRegion: process.env.AWS_REGION || 'ap-northeast-1',
      cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
      cognitoUserPoolClientId: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
      cognitoIdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || '',
      apiGatewayUrl: process.env.API_GATEWAY_URL || ''
    }
  },
  
  // Modules
  modules: [
    '@pinia/nuxt'
  ],
  
  // App configuration
  app: {
    head: {
      title: '勤怠管理システム',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '効率的な勤怠管理を実現するWebアプリケーション' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // Preload critical fonts
        { rel: 'preload', href: '/fonts/sf-pro-display.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/sf-pro-text.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
      ]
    }
  },
  
  // SSR optimizations
  ssr: true,
  
  // Nitro optimizations for production
  nitro: {
    compressPublicAssets: true,
    minify: true,
    // Enable experimental features for better performance
    experimental: {
      wasm: true
    }
  },
  
  // Route rules for caching
  routeRules: {
    // Static pages - cache for 1 hour
    '/': { prerender: true, headers: { 'cache-control': 's-maxage=3600' } },
    
    // API routes - no cache for dynamic data
    '/api/**': { headers: { 'cache-control': 'no-cache' } },
    
    // Admin pages - require authentication, no cache
    '/admin/**': { ssr: false, headers: { 'cache-control': 'no-cache' } },
    
    // Static assets - cache for 1 year
    '/assets/**': { headers: { 'cache-control': 's-maxage=31536000' } }
  }
})