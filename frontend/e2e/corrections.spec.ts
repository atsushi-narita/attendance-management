import { expect, test } from '@playwright/test'

test.describe('勤怠管理システム - 修正申請', () => {
  const mockCorrections = [
    {
      id: 1,
      employeeId: 123,
      originalRecordId: 1,
      requestedClockIn: '2024-01-15T08:30:00Z',
      requestedClockOut: '2024-01-15T17:30:00Z',
      reason: '電車遅延のため遅刻しました',
      status: 'PENDING',
      requestDate: '2024-01-15T20:00:00Z',
      processedDate: null,
      employee: {
        name: '田中太郎',
        employeeNumber: 'EMP001'
      },
      originalRecord: {
        date: '2024-01-15',
        clockInTime: '2024-01-15T09:00:00Z',
        clockOutTime: '2024-01-15T18:00:00Z'
      }
    }
  ]

  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/corrections**', async route => {
      const method = route.request().method()
      const url = route.request().url()
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            corrections: mockCorrections,
            totalCount: mockCorrections.length,
            currentPage: 1,
            totalPages: 1
          })
        })
      } else if (method === 'POST') {
        const newCorrection = {
          id: 2,
          employeeId: 123,
          originalRecordId: 2,
          requestedClockIn: '2024-01-16T09:00:00Z',
          requestedClockOut: '2024-01-16T18:00:00Z',
          reason: '修正理由',
          status: 'PENDING',
          requestDate: new Date().toISOString(),
          processedDate: null
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newCorrection)
        })
      } else if (method === 'PUT' && url.includes('/approve')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockCorrections[0],
            status: 'APPROVED',
            processedDate: new Date().toISOString()
          })
        })
      } else if (method === 'PUT' && url.includes('/reject')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockCorrections[0],
            status: 'REJECTED',
            processedDate: new Date().toISOString()
          })
        })
      }
    })

    // Mock records API for correction form
    await page.route('**/api/records**', async route => {
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
          ]
        })
      })
    })

    // Navigate to corrections page
    await page.goto('/corrections')
  })

  test('修正申請一覧が正しく表示される', async ({ page }) => {
    // Check if corrections table is visible
    await expect(page.locator('[data-testid="corrections-table"]')).toBeVisible()
    
    // Check if corrections are displayed
    await expect(page.locator('[data-testid="correction-row"]')).toHaveCount(1)
    
    // Check if correction data is correct
    const firstRow = page.locator('[data-testid="correction-row"]').first()
    await expect(firstRow.locator('[data-testid="correction-date"]')).toContainText('2024年1月15日')
    await expect(firstRow.locator('[data-testid="correction-employee"]')).toContainText('田中太郎')
    await expect(firstRow.locator('[data-testid="correction-status"]')).toContainText('承認待ち')
    await expect(firstRow.locator('[data-testid="correction-reason"]')).toContainText('電車遅延のため遅刻しました')
  })

  test('修正申請フォームが正常に動作する', async ({ page }) => {
    // Click add correction button
    await page.click('[data-testid="add-correction-button"]')
    
    // Check if correction form modal is visible
    await expect(page.locator('[data-testid="correction-form-modal"]')).toBeVisible()
    
    // Select target date
    await page.fill('[data-testid="target-date-input"]', '2024-01-16')
    
    // Wait for record to load
    await page.waitForTimeout(1000)
    
    // Fill in correction details
    await page.fill('[data-testid="requested-clock-in-input"]', '09:00')
    await page.fill('[data-testid="requested-clock-out-input"]', '18:00')
    await page.fill('[data-testid="correction-reason-input"]', '修正理由')
    
    // Submit form
    await page.click('[data-testid="submit-correction-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if modal is closed
    await expect(page.locator('[data-testid="correction-form-modal"]')).not.toBeVisible()
    
    // Check if success message is displayed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('修正申請を提出しました')
  })

  test('修正申請承認が正常に動作する（管理者）', async ({ page }) => {
    // Mock authentication as manager
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'manager-123',
        role: 'MANAGER',
        groups: ['managers']
      }))
    })
    
    // Reload page to apply auth
    await page.reload()
    
    // Check if approve button is visible
    await expect(page.locator('[data-testid="approve-correction-button"]')).toBeVisible()
    
    // Click approve button
    await page.click('[data-testid="approve-correction-button"]')
    
    // Check if confirmation dialog is visible
    await expect(page.locator('[data-testid="approve-confirmation-dialog"]')).toBeVisible()
    
    // Confirm approval
    await page.click('[data-testid="confirm-approve-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if dialog is closed
    await expect(page.locator('[data-testid="approve-confirmation-dialog"]')).not.toBeVisible()
    
    // Check if success message is displayed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('修正申請を承認しました')
  })

  test('修正申請却下が正常に動作する（管理者）', async ({ page }) => {
    // Mock authentication as manager
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'manager-123',
        role: 'MANAGER',
        groups: ['managers']
      }))
    })
    
    // Reload page to apply auth
    await page.reload()
    
    // Check if reject button is visible
    await expect(page.locator('[data-testid="reject-correction-button"]')).toBeVisible()
    
    // Click reject button
    await page.click('[data-testid="reject-correction-button"]')
    
    // Check if confirmation dialog is visible
    await expect(page.locator('[data-testid="reject-confirmation-dialog"]')).toBeVisible()
    
    // Fill rejection reason
    await page.fill('[data-testid="rejection-reason-input"]', '承認できない理由')
    
    // Confirm rejection
    await page.click('[data-testid="confirm-reject-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if dialog is closed
    await expect(page.locator('[data-testid="reject-confirmation-dialog"]')).not.toBeVisible()
    
    // Check if success message is displayed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('修正申請を却下しました')
  })

  test('フォームバリデーションが正常に動作する', async ({ page }) => {
    // Click add correction button
    await page.click('[data-testid="add-correction-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="submit-correction-button"]')
    
    // Check if validation errors are displayed
    await expect(page.locator('[data-testid="target-date-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="target-date-error"]')).toContainText('対象日は必須です')
    
    await expect(page.locator('[data-testid="reason-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="reason-error"]')).toContainText('修正理由は必須です')
    
    // Fill target date
    await page.fill('[data-testid="target-date-input"]', '2024-01-16')
    
    // Fill invalid time
    await page.fill('[data-testid="requested-clock-in-input"]', '25:00')
    await page.blur('[data-testid="requested-clock-in-input"]')
    
    // Check if validation error is displayed
    await expect(page.locator('[data-testid="clock-in-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="clock-in-error"]')).toContainText('正しい時刻を入力してください')
  })

  test('権限制御が正常に動作する', async ({ page }) => {
    // Mock authentication as regular employee
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'employee-123',
        role: 'EMPLOYEE',
        groups: ['employees']
      }))
    })
    
    // Reload page to apply auth
    await page.reload()
    
    // Check if approve/reject buttons are not visible for employees
    await expect(page.locator('[data-testid="approve-correction-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="reject-correction-button"]')).not.toBeVisible()
    
    // Check if only own corrections are visible
    await expect(page.locator('[data-testid="correction-row"]')).toHaveCount(1)
  })

  test('修正申請詳細が正しく表示される', async ({ page }) => {
    // Click on correction row to view details
    await page.click('[data-testid="correction-row"]')
    
    // Check if detail modal is visible
    await expect(page.locator('[data-testid="correction-detail-modal"]')).toBeVisible()
    
    // Check if original and requested times are displayed
    await expect(page.locator('[data-testid="original-clock-in"]')).toContainText('09:00')
    await expect(page.locator('[data-testid="original-clock-out"]')).toContainText('18:00')
    await expect(page.locator('[data-testid="requested-clock-in"]')).toContainText('08:30')
    await expect(page.locator('[data-testid="requested-clock-out"]')).toContainText('17:30')
    
    // Check if reason is displayed
    await expect(page.locator('[data-testid="correction-reason"]')).toContainText('電車遅延のため遅刻しました')
    
    // Check if request date is displayed
    await expect(page.locator('[data-testid="request-date"]')).toContainText('2024年1月15日')
  })
})