import { expect, test } from '@playwright/test'

test.describe('勤怠管理システム - 勤務記録', () => {
  const mockRecords = [
    {
      id: 1,
      employeeId: 123,
      date: '2024-01-15',
      clockInTime: '2024-01-15T09:00:00Z',
      clockOutTime: '2024-01-15T18:00:00Z',
      workingMinutes: 480,
      status: 'PRESENT',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T18:00:00Z'
    },
    {
      id: 2,
      employeeId: 123,
      date: '2024-01-16',
      clockInTime: '2024-01-16T09:15:00Z',
      clockOutTime: '2024-01-16T17:45:00Z',
      workingMinutes: 450,
      status: 'PRESENT',
      createdAt: '2024-01-16T09:15:00Z',
      updatedAt: '2024-01-16T17:45:00Z'
    }
  ]

  const mockSummary = {
    employeeId: 123,
    month: '2024-01',
    totalWorkingMinutes: 9600,
    totalWorkingDays: 20,
    averageWorkingMinutes: 480,
    requiredMonthlyHours: 160,
    overUnderHours: 0
  }

  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/records**', async route => {
      const url = route.request().url()
      if (url.includes('/summary')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSummary)
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            records: mockRecords,
            totalCount: mockRecords.length,
            currentPage: 1,
            totalPages: 1
          })
        })
      }
    })

    // Navigate to records page
    await page.goto('/records')
  })

  test('勤務記録一覧が正しく表示される', async ({ page }) => {
    // Check if records table is visible
    await expect(page.locator('[data-testid="records-table"]')).toBeVisible()
    
    // Check if records are displayed
    await expect(page.locator('[data-testid="record-row"]')).toHaveCount(2)
    
    // Check if first record data is correct
    const firstRow = page.locator('[data-testid="record-row"]').first()
    await expect(firstRow.locator('[data-testid="record-date"]')).toContainText('2024年1月15日')
    await expect(firstRow.locator('[data-testid="record-clock-in"]')).toContainText('09:00')
    await expect(firstRow.locator('[data-testid="record-clock-out"]')).toContainText('18:00')
    await expect(firstRow.locator('[data-testid="record-working-time"]')).toContainText('8時間0分')
  })

  test('勤務時間サマリーが正しく表示される', async ({ page }) => {
    // Check if summary card is visible
    await expect(page.locator('[data-testid="working-hours-summary"]')).toBeVisible()
    
    // Check if total working hours is displayed
    await expect(page.locator('[data-testid="total-working-hours"]')).toContainText('160.0時間')
    
    // Check if required hours is displayed
    await expect(page.locator('[data-testid="required-hours"]')).toContainText('160時間')
    
    // Check if over/under hours is displayed
    await expect(page.locator('[data-testid="over-under-hours"]')).toContainText('0.0時間')
    
    // Check if progress bar is displayed
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
  })

  test('フィルター機能が正常に動作する', async ({ page }) => {
    // Open filter panel
    await page.click('[data-testid="filter-button"]')
    
    // Check if filter panel is visible
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible()
    
    // Set date range filter
    await page.fill('[data-testid="start-date-input"]', '2024-01-15')
    await page.fill('[data-testid="end-date-input"]', '2024-01-16')
    
    // Apply filter
    await page.click('[data-testid="apply-filter-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if filtered results are displayed
    await expect(page.locator('[data-testid="record-row"]')).toHaveCount(2)
  })

  test('ソート機能が正常に動作する', async ({ page }) => {
    // Click on date column header to sort
    await page.click('[data-testid="sort-date-header"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if sort indicator is displayed
    await expect(page.locator('[data-testid="sort-indicator"]')).toBeVisible()
    
    // Click again to reverse sort
    await page.click('[data-testid="sort-date-header"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if sort direction changed
    await expect(page.locator('[data-testid="sort-indicator"]')).toHaveClass(/desc/)
  })

  test('月別ナビゲーションが正常に動作する', async ({ page }) => {
    // Check if current month is displayed
    await expect(page.locator('[data-testid="current-month"]')).toContainText('2024年1月')
    
    // Click previous month button
    await page.click('[data-testid="previous-month-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if month changed
    await expect(page.locator('[data-testid="current-month"]')).toContainText('2023年12月')
    
    // Click next month button
    await page.click('[data-testid="next-month-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if month changed back
    await expect(page.locator('[data-testid="current-month"]')).toContainText('2024年1月')
  })

  test('エラー状態が正しく表示される', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/records**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'サーバーエラーが発生しました'
        })
      })
    })
    
    // Reload page to trigger error
    await page.reload()
    
    // Wait for error state
    await page.waitForTimeout(1000)
    
    // Check if error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('サーバーエラーが発生しました')
    
    // Check if retry button is displayed
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })
})