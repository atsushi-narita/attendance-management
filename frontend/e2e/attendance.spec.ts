import { expect, test } from '@playwright/test'

test.describe('勤怠管理システム - 打刻機能', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for testing
    await page.route('**/api/attendance/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isWorking: false,
          todayRecord: null,
          currentTime: '2024-01-15T09:00:00Z'
        })
      })
    })

    await page.route('**/api/attendance/clock-in', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          record: {
            id: 1,
            employeeId: 123,
            date: '2024-01-15',
            clockInTime: '2024-01-15T09:00:00Z',
            status: 'PRESENT'
          }
        })
      })
    })

    await page.route('**/api/attendance/clock-out', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          record: {
            id: 1,
            employeeId: 123,
            date: '2024-01-15',
            clockInTime: '2024-01-15T09:00:00Z',
            clockOutTime: '2024-01-15T18:00:00Z',
            workingMinutes: 480,
            status: 'PRESENT'
          }
        })
      })
    })

    // Navigate to attendance page
    await page.goto('/')
  })

  test('打刻カードが正しく表示される', async ({ page }) => {
    // Check if attendance card is visible
    await expect(page.locator('[data-testid="attendance-card"]')).toBeVisible()
    
    // Check if current time is displayed
    await expect(page.locator('[data-testid="current-time"]')).toBeVisible()
    
    // Check if clock-in button is visible and enabled
    await expect(page.locator('[data-testid="clock-in-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="clock-in-button"]')).toBeEnabled()
    
    // Check if clock-out button is visible but disabled initially
    await expect(page.locator('[data-testid="clock-out-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="clock-out-button"]')).toBeDisabled()
  })

  test('出勤打刻が正常に動作する', async ({ page }) => {
    // Click clock-in button
    await page.click('[data-testid="clock-in-button"]')
    
    // Check if confirmation dialog appears
    await expect(page.locator('[data-testid="clock-in-dialog"]')).toBeVisible()
    
    // Confirm clock-in
    await page.click('[data-testid="confirm-clock-in"]')
    
    // Wait for API call and UI update
    await page.waitForTimeout(1000)
    
    // Check if clock-in button is now disabled
    await expect(page.locator('[data-testid="clock-in-button"]')).toBeDisabled()
    
    // Check if clock-out button is now enabled
    await expect(page.locator('[data-testid="clock-out-button"]')).toBeEnabled()
    
    // Check if working status is displayed
    await expect(page.locator('[data-testid="working-status"]')).toContainText('勤務中')
  })

  test('退勤打刻が正常に動作する', async ({ page }) => {
    // First clock in
    await page.click('[data-testid="clock-in-button"]')
    await page.click('[data-testid="confirm-clock-in"]')
    await page.waitForTimeout(1000)
    
    // Then clock out
    await page.click('[data-testid="clock-out-button"]')
    
    // Check if confirmation dialog appears
    await expect(page.locator('[data-testid="clock-out-dialog"]')).toBeVisible()
    
    // Confirm clock-out
    await page.click('[data-testid="confirm-clock-out"]')
    
    // Wait for API call and UI update
    await page.waitForTimeout(1000)
    
    // Check if both buttons are disabled
    await expect(page.locator('[data-testid="clock-in-button"]')).toBeDisabled()
    await expect(page.locator('[data-testid="clock-out-button"]')).toBeDisabled()
    
    // Check if working time is displayed
    await expect(page.locator('[data-testid="working-time"]')).toContainText('8時間')
  })

  test('エラーハンドリングが正常に動作する', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/attendance/clock-in', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'ALREADY_CLOCKED_IN',
          message: '既に出勤打刻済みです'
        })
      })
    })
    
    // Try to clock in
    await page.click('[data-testid="clock-in-button"]')
    await page.click('[data-testid="confirm-clock-in"]')
    
    // Wait for error message
    await page.waitForTimeout(1000)
    
    // Check if error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('既に出勤打刻済みです')
  })
})