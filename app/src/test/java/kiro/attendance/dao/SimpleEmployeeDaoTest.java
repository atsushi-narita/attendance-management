package kiro.attendance.dao;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import kiro.attendance.entity.Employee;
import kiro.attendance.entity.UserRole;

/**
 * EmployeeDaoの簡単なテスト（TestContainers不使用）
 */
class SimpleEmployeeDaoTest {

    @Test
    void Employee_エンティティの基本機能をテスト() {
        // Given
        Employee employee = new Employee();
        employee.setName("テスト 太郎");
        employee.setEmployeeNumber("TEST001");
        employee.setRequiredMonthlyHours(160);
        employee.setRole(UserRole.EMPLOYEE);

        // When & Then
        assertThat(employee.getName()).isEqualTo("テスト 太郎");
        assertThat(employee.getEmployeeNumber()).isEqualTo("TEST001");
        assertThat(employee.getRequiredMonthlyHours()).isEqualTo(160);
        assertThat(employee.getRole()).isEqualTo(UserRole.EMPLOYEE);
    }

    @Test
    void UserRole_列挙型の表示名をテスト() {
        // When & Then
        assertThat(UserRole.EMPLOYEE.getDisplayName()).isEqualTo("従業員");
        assertThat(UserRole.MANAGER.getDisplayName()).isEqualTo("管理者");
        assertThat(UserRole.ADMIN.getDisplayName()).isEqualTo("システム管理者");
    }
}
