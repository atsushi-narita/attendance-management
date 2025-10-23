package kiro.attendance.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuthenticatedUserTest {

    @Test
    void testConstructorAndGetters() {
        // Given
        String userId = "user-123";
        String email = "test@example.com";
        String employeeNumber = "EMP001";
        String role = "EMPLOYEE";
        List<String> groups = List.of("employees", "managers");

        // When
        AuthenticatedUser user = new AuthenticatedUser(userId, email, employeeNumber, role, groups);

        // Then
        assertThat(user.getUserId()).isEqualTo(userId);
        assertThat(user.getEmail()).isEqualTo(email);
        assertThat(user.getEmployeeNumber()).isEqualTo(employeeNumber);
        assertThat(user.getRole()).isEqualTo(role);
        assertThat(user.getGroups()).containsExactly("employees", "managers");
    }

    @Test
    void testConstructorWithNullGroups() {
        // Given
        String userId = "user-123";
        String email = "test@example.com";
        String employeeNumber = "EMP001";
        String role = "EMPLOYEE";

        // When
        AuthenticatedUser user = new AuthenticatedUser(userId, email, employeeNumber, role, null);

        // Then
        assertThat(user.getGroups()).isEmpty();
    }

    @Test
    void testIsEmployee() {
        // Given
        AuthenticatedUser employee = new AuthenticatedUser("user-123", "emp@example.com", "EMP001",
                "EMPLOYEE", List.of("employees"));
        AuthenticatedUser nonEmployee = new AuthenticatedUser("user-456", "mgr@example.com",
                "MGR001", "MANAGER", List.of("managers"));

        // When & Then
        assertThat(employee.isEmployee()).isTrue();
        assertThat(nonEmployee.isEmployee()).isFalse();
    }

    @Test
    void testIsManager() {
        // Given
        AuthenticatedUser manager = new AuthenticatedUser("user-123", "mgr@example.com", "MGR001",
                "MANAGER", List.of("managers"));
        AuthenticatedUser nonManager = new AuthenticatedUser("user-456", "emp@example.com",
                "EMP001", "EMPLOYEE", List.of("employees"));

        // When & Then
        assertThat(manager.isManager()).isTrue();
        assertThat(nonManager.isManager()).isFalse();
    }

    @Test
    void testIsAdmin() {
        // Given
        AuthenticatedUser admin = new AuthenticatedUser("user-123", "admin@example.com", "ADM001",
                "ADMIN", List.of("admins"));
        AuthenticatedUser nonAdmin = new AuthenticatedUser("user-456", "emp@example.com", "EMP001",
                "EMPLOYEE", List.of("employees"));

        // When & Then
        assertThat(admin.isAdmin()).isTrue();
        assertThat(nonAdmin.isAdmin()).isFalse();
    }

    @Test
    void testMultipleRoles() {
        // Given
        AuthenticatedUser multiRoleUser = new AuthenticatedUser("user-123", "multi@example.com",
                "MUL001", "MANAGER", List.of("employees", "managers", "admins"));

        // When & Then
        assertThat(multiRoleUser.isEmployee()).isTrue();
        assertThat(multiRoleUser.isManager()).isTrue();
        assertThat(multiRoleUser.isAdmin()).isTrue();
    }

    @Test
    void testEqualsAndHashCode() {
        // Given
        AuthenticatedUser user1 = new AuthenticatedUser("user-123", "test@example.com", "EMP001",
                "EMPLOYEE", List.of("employees"));
        AuthenticatedUser user2 = new AuthenticatedUser("user-123", "different@example.com",
                "EMP002", "MANAGER", List.of("managers"));
        AuthenticatedUser user3 = new AuthenticatedUser("user-456", "test@example.com", "EMP001",
                "EMPLOYEE", List.of("employees"));

        // When & Then
        assertThat(user1).isEqualTo(user2); // 同じuserIdなので等しい
        assertThat(user1).isNotEqualTo(user3); // 異なるuserIdなので等しくない
        assertThat(user1.hashCode()).isEqualTo(user2.hashCode());
        assertThat(user1.hashCode()).isNotEqualTo(user3.hashCode());
    }

    @Test
    void testToString() {
        // Given
        AuthenticatedUser user = new AuthenticatedUser("user-123", "test@example.com", "EMP001",
                "EMPLOYEE", List.of("employees"));

        // When
        String toString = user.toString();

        // Then
        assertThat(toString).contains("user-123");
        assertThat(toString).contains("test@example.com");
        assertThat(toString).contains("EMP001");
        assertThat(toString).contains("EMPLOYEE");
        assertThat(toString).contains("employees");
    }

    @Test
    void testGroupsImmutability() {
        // Given
        List<String> originalGroups = List.of("employees");
        AuthenticatedUser user = new AuthenticatedUser("user-123", "test@example.com", "EMP001",
                "EMPLOYEE", originalGroups);

        // When & Then
        assertThatThrownBy(() -> user.getGroups().add("managers"))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
