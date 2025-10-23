import { expect, test } from '@playwright/test'

test.describe('勤怠管理システム - 統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication as admin
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'admin-123',
        role: 'ADMIN',
        groups: ['admins'],
        name: '管理者',
        employeeNumber: 'ADMIN001'
      }))
    })

    // Mock all API endpoints
    await page.route('**/api/**', async route => {
      const url = route.request().url()
      const method = route.request().method()
      
      // Attendance API
      if (url.includes('/api/attendance/status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isWorking: false,
            todayRecord: null,
            currentTime: new Date().toISOString()
          })
        })
      } else if (url.includes('/api/attendance/clock-in')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            record: {
              id: 1,
              employeeId: 123,
              date: new Date().toISOString().split('T')[0],
              clockInTime: new Date().toISOString(),
              status: 'PRESENT'
            }
          })
        })
      } else if (url.includes('/api/attendance/clock-out')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            record: {
              id: 1,
              employeeId: 123,
              date: new Date().toISOString().split('T')[0],
              clockInTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
              clockOutTime: new Date().toISOString(),
              workingMinutes: 480,
              status: 'PRESENT'
            }
          })
        })
      }
      
      // Records API
      else if (url.includes('/api/records') && url.includes('/summary')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            employeeId: 123,
            month: '2024-01',
            totalWorkingMinutes: 9600,
            totalWorkingDays: 20,
            averageWorkingMinutes: 480,
            requiredMonthlyHours: 160,
            overUnderHours: 0
          })
        })
      } else if (url.includes('/api/records')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            records: [
              {
                id: 1,
                employeeId: 123,
                date: '2024-01-15',
                clockInTime: '2024-01-15T09:00:00Z',
                clockOutTime: '2024-01-15T18:00:00Z',
                workingMinutes: 480,
                status: 'PRESENT'
              }
            ],
            totalCount: 1,
            currentPage: 1,
            totalPages: 1
          })
        })
      }
      
      // Employees API
      else if (url.includes('/api/employees')) {
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              employees: [
                {
                  id: 1,
                  name: '田中太郎',
                  employeeNumber: 'EMP001',
                  requiredMonthlyHours: 160,
                  role: 'EMPLOYEE'
                }
              ],
              totalCount: 1,
              currentPage: 1,
              totalPages: 1
            })
          })
        } else if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 2,
              name: '新規従業員',
              employeeNumber: 'EMP002',
              requiredMonthlyHours: 160,
              role: 'EMPLOYEE'
            })
          })
        }
      }
      
      // Corrections API
      else if (url.includes('/api/corrections')) {
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              corrections: [
                {
                  id: 1,
                  employeeId: 123,
                  originalRecordId: 1,
                  requestedClockIn: '2024-01-15T08:30:00Z',
                  requestedClockOut: '2024-01-15T17:30:00Z',
                  reason: '電車遅延のため',
                  status: 'PENDING',
                  requestDate: '2024-01-15T20:00:00Z'
                }
              ],
              totalCount: 1,
              currentPage: 1,
              totalPages: 1
            })
          })
        } else if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 2,
              employeeId: 123,
              status: 'PENDING'
            })
          })
        }
      }
      
      // Default fallback
      else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not Found' })
        })
      }
    })
  })

  test('完全なワークフロー: 打刻 → 記録確認 → 修正申請 → 承認', async ({ page }) => {
    // Step 1: Navigate to dashboard and perform clock-in
    await page.goto('/')
    
    // Verify dashboard loads
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    
    // Perform clock-in
    await page.click('[data-testid="clock-in-button"]')
    await page.click('[data-testid="confirm-clock-in"]')
    await page.waitForTimeout(1000)
    
    // Verify clock-in success
    await expect(page.locator('[data-testid="working-status"]')).toContainText('勤務中')
    
    // Step 2: Navigate to records page
    await page.click('[data-testid="nav-records"]')
    await expect(page.url()).toContain('/records')
    
    // Verify records are displayed
    await expect(page.locator('[data-testid="records-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="record-row"]')).toHaveCount(1)
    
    // Step 3: Navigate to corrections page and create correction request
    await page.click('[data-testid="nav-corrections"]')
    await expect(page.url()).toContain('/corrections')
    
    // Create correction request
    await page.click('[data-testid="add-correction-button"]')
    await page.fill('[data-testid="target-date-input"]', '2024-01-15')
    await page.fill('[data-testid="requested-clock-in-input"]', '08:30')
    await page.fill('[data-testid="requested-clock-out-input"]', '17:30')
    await page.fill('[data-testid="correction-reason-input"]', '電車遅延のため')
    await page.click('[data-testid="submit-correction-button"]')
    
    // Verify correction request created
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Step 4: Navigate to employees page (admin function)
    await page.click('[data-testid="nav-employees"]')
    await expect(page.url()).toContain('/admin/employees')
    
    // Verify employees list
    await expect(page.locator('[data-testid="employees-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="employee-row"]')).toHaveCount(1)
    
    // Add new employee
    await page.click('[data-testid="add-employee-button"]')
    await page.fill('[data-testid="employee-name-input"]', '新規従業員')
    await page.fill('[data-testid="employee-number-input"]', 'EMP002')
    await page.fill('[data-testid="required-hours-input"]', '160')
    await page.selectOption('[data-testid="role-select"]', 'EMPLOYEE')
    await page.click('[data-testid="submit-employee-button"]')
    
    // Verify employee created
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Step 5: Return to dashboard
    await page.click('[data-testid="nav-dashboard"]')
    await expect(page.url()).toBe('http://localhost:3000/')
    
    // Verify dashboard still shows working status
    await expect(page.locator('[data-testid="working-status"]')).toContainText('勤務中')
  })

  test('レスポンシブデザインテスト', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check if mobile navigation works
    await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible()
    await page.click('[data-testid="mobile-nav-toggle"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    
    // Check if layout adapts to tablet
    await expect(page.locator('[data-testid="attendance-card"]')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.reload()
    
    // Check if full navigation is visible
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible()
  })

  test('エラー処理とリカバリー', async ({ page }) => {
    // Mock API error
    await page.route('**/api/attendance/clock-in', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'サーバーエラーが発生しました'
        })
      })
    })
    
    await page.goto('/')
    
    // Try to clock in
    await page.click('[data-testid="clock-in-button"]')
    await page.click('[data-testid="confirm-clock-in"]')
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('サーバーエラーが発生しました')
    
    // Verify retry functionality
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Mock successful API response for retry
    await page.route('**/api/attendance/clock-in', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          record: { id: 1, status: 'PRESENT' }
        })
      })
    })
    
    // Retry the operation
    await page.click('[data-testid="retry-button"]')
    
    // Verify success
    await expect(page.locator('[data-testid="working-status"]')).toContainText('勤務中')
  })

  test('パフォーマンステスト', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/')
    
    // Measure page load time
    const navigationTiming = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        firstPaint: timing.responseEnd - timing.requestStart
      }
    })
    
    // Verify reasonable load times (adjust thresholds as needed)
    expect(navigationTiming.domContentLoaded).toBeLessThan(2000) // 2 seconds
    expect(navigationTiming.loadComplete).toBeLessThan(3000) // 3 seconds
    
    // Test navigation performance
    const startTime = Date.now()
    await page.click('[data-testid="nav-records"]')
    await page.waitForLoadState('networkidle')
    const navigationTime = Date.now() - startTime
    
    expect(navigationTime).toBeLessThan(1000) // 1 second for navigation
  })

  test('アクセシビリティテスト', async ({ page }) => {
    await page.goto('/')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    // Test ARIA labels
    await expect(page.locator('[data-testid="clock-in-button"]')).toHaveAttribute('aria-label')
    
    // Test color contrast (basic check)
    const backgroundColor = await page.locator('body').evaluate(el => 
      getComputedStyle(el).backgroundColor
    )
    const textColor = await page.locator('body').evaluate(el => 
      getComputedStyle(el).color
    )
    
    // Verify colors are defined (more detailed contrast testing would require additional tools)
    expect(backgroundColor).toBeTruthy()
    expect(textColor).toBeTruthy()
    
    // Test screen reader compatibility
    await expect(page.locator('h1')).toHaveAttribute('role', 'heading')
  })

  test('データ整合性テスト', async ({ page }) => {
    await page.goto('/')
    
    // Perform clock-in
    await page.click('[data-testid="clock-in-button"]')
    await page.click('[data-testid="confirm-clock-in"]')
    await page.waitForTimeout(1000)
    
    // Navigate to records and verify data consistency
    await page.click('[data-testid="nav-records"]')
    
    // Check if today's record appears in the list
    const today = new Date().toISOString().split('T')[0]
    await expect(page.locator(`[data-testid="record-date"][data-date="${today}"]`)).toBeVisible()
    
    // Navigate to dashboard and verify status consistency
    await page.click('[data-testid="nav-dashboard"]')
    await expect(page.locator('[data-testid="working-status"]')).toContainText('勤務中')
    
    // Perform clock-out
    await page.click('[data-testid="clock-out-button"]')
    await page.click('[data-testid="confirm-clock-out"]')
    await page.waitForTimeout(1000)
    
    // Verify status updated
    await expect(page.locator('[data-testid="working-status"]')).not.toContainText('勤務中')
    
    // Navigate back to records and verify working time is calculated
    await page.click('[data-testid="nav-records"]')
    await expect(page.locator('[data-testid="record-working-time"]')).toContainText('時間')
  })
})