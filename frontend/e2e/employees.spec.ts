import { expect, test } from '@playwright/test'

test.describe('勤怠管理システム - 従業員管理', () => {
  const mockEmployees = [
    {
      id: 1,
      name: '田中太郎',
      employeeNumber: 'EMP001',
      requiredMonthlyHours: 160,
      role: 'EMPLOYEE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: '佐藤花子',
      employeeNumber: 'EMP002',
      requiredMonthlyHours: 170,
      role: 'MANAGER',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ]

  test.beforeEach(async ({ page }) => {
    // Mock authentication as admin
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'admin-123',
        role: 'ADMIN',
        groups: ['admins']
      }))
    })

    // Mock API responses
    await page.route('**/api/employees**', async route => {
      const method = route.request().method()
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            employees: mockEmployees,
            totalCount: mockEmployees.length,
            currentPage: 1,
            totalPages: 1
          })
        })
      } else if (method === 'POST') {
        const newEmployee = {
          id: 3,
          name: '新規従業員',
          employeeNumber: 'EMP003',
          requiredMonthlyHours: 160,
          role: 'EMPLOYEE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newEmployee)
        })
      } else if (method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockEmployees[0],
            name: '更新された従業員',
            updatedAt: new Date().toISOString()
          })
        })
      } else if (method === 'DELETE') {
        await route.fulfill({
          status: 204
        })
      }
    })

    // Navigate to employees page
    await page.goto('/admin/employees')
  })

  test('従業員一覧が正しく表示される', async ({ page }) => {
    // Check if employees table is visible
    await expect(page.locator('[data-testid="employees-table"]')).toBeVisible()
    
    // Check if employees are displayed
    await expect(page.locator('[data-testid="employee-row"]')).toHaveCount(2)
    
    // Check if first employee data is correct
    const firstRow = page.locator('[data-testid="employee-row"]').first()
    await expect(firstRow.locator('[data-testid="employee-name"]')).toContainText('田中太郎')
    await expect(firstRow.locator('[data-testid="employee-number"]')).toContainText('EMP001')
    await expect(firstRow.locator('[data-testid="employee-role"]')).toContainText('従業員')
    await expect(firstRow.locator('[data-testid="required-hours"]')).toContainText('160時間')
  })

  test('従業員登録が正常に動作する', async ({ page }) => {
    // Click add employee button
    await page.click('[data-testid="add-employee-button"]')
    
    // Check if employee form modal is visible
    await expect(page.locator('[data-testid="employee-form-modal"]')).toBeVisible()
    
    // Fill in employee form
    await page.fill('[data-testid="employee-name-input"]', '新規従業員')
    await page.fill('[data-testid="employee-number-input"]', 'EMP003')
    await page.fill('[data-testid="required-hours-input"]', '160')
    await page.selectOption('[data-testid="role-select"]', 'EMPLOYEE')
    
    // Submit form
    await page.click('[data-testid="submit-employee-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if modal is closed
    await expect(page.locator('[data-testid="employee-form-modal"]')).not.toBeVisible()
    
    // Check if success message is displayed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('従業員を登録しました')
  })

  test('従業員編集が正常に動作する', async ({ page }) => {
    // Click edit button for first employee
    await page.click('[data-testid="edit-employee-button"]')
    
    // Check if employee form modal is visible
    await expect(page.locator('[data-testid="employee-form-modal"]')).toBeVisible()
    
    // Check if form is pre-filled
    await expect(page.locator('[data-testid="employee-name-input"]')).toHaveValue('田中太郎')
    await expect(page.locator('[data-testid="employee-number-input"]')).toHaveValue('EMP001')
    
    // Update employee name
    await page.fill('[data-testid="employee-name-input"]', '更新された従業員')
    
    // Submit form
    await page.click('[data-testid="submit-employee-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if modal is closed
    await expect(page.locator('[data-testid="employee-form-modal"]')).not.toBeVisible()
    
    // Check if success message is displayed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('従業員情報を更新しました')
  })

  test('従業員削除が正常に動作する', async ({ page }) => {
    // Click delete button for first employee
    await page.click('[data-testid="delete-employee-button"]')
    
    // Check if confirmation dialog is visible
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible()
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Wait for API call
    await page.waitForTimeout(1000)
    
    // Check if dialog is closed
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible()
    
    // Check if success message is displayed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('従業員を削除しました')
  })

  test('フォームバリデーションが正常に動作する', async ({ page }) => {
    // Click add employee button
    await page.click('[data-testid="add-employee-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="submit-employee-button"]')
    
    // Check if validation errors are displayed
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="name-error"]')).toContainText('名前は必須です')
    
    await expect(page.locator('[data-testid="employee-number-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="employee-number-error"]')).toContainText('従業員番号は必須です')
    
    // Fill invalid required hours
    await page.fill('[data-testid="required-hours-input"]', '100')
    await page.blur('[data-testid="required-hours-input"]')
    
    // Check if validation error is displayed
    await expect(page.locator('[data-testid="required-hours-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="required-hours-error"]')).toContainText('140時間から180時間の間で入力してください')
  })

  test('検索・フィルター機能が正常に動作する', async ({ page }) => {
    // Use search input
    await page.fill('[data-testid="search-input"]', '田中')
    
    // Wait for search
    await page.waitForTimeout(500)
    
    // Check if filtered results are displayed
    await expect(page.locator('[data-testid="employee-row"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="employee-name"]')).toContainText('田中太郎')
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '')
    
    // Wait for search clear
    await page.waitForTimeout(500)
    
    // Check if all employees are displayed again
    await expect(page.locator('[data-testid="employee-row"]')).toHaveCount(2)
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
    
    // Navigate to employees page
    await page.goto('/admin/employees')
    
    // Check if access is denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('この機能にアクセスする権限がありません')
  })
})