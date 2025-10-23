package kiro.attendance.auth;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;

@ExtendWith(MockitoExtension.class)
class CognitoAuthServiceTest {

    @Mock
    private CognitoIdentityProviderClient cognitoClient;

    private CognitoAuthService authService;
    private final String userPoolId = "us-east-1_TestPool";
    private final String clientId = "test-client-id";
    private final String region = "us-east-1";

    @BeforeEach
    void setUp() {
        // テスト用のCognitoAuthServiceを作成（実際のHTTP呼び出しを避けるため）
        authService = new CognitoAuthService(userPoolId, clientId, region);
    }

    @Test
    void testHasPermission_EmployeeRole() {
        // Given
        AuthenticatedUser employee = new AuthenticatedUser("user-123", "employee@example.com",
                "EMP001", "EMPLOYEE", List.of("employees"));

        // When & Then
        assertThat(authService.hasPermission(employee, "ATTENDANCE_MANAGE")).isTrue();
        assertThat(authService.hasPermission(employee, "EMPLOYEE_MANAGE")).isFalse();
        assertThat(authService.hasPermission(employee, "CORRECTION_APPROVE")).isFalse();
        assertThat(authService.hasPermission(employee, "RECORDS_VIEW_ALL")).isFalse();
    }

    @Test
    void testHasPermission_ManagerRole() {
        // Given
        AuthenticatedUser manager = new AuthenticatedUser("user-456", "manager@example.com",
                "MGR001", "MANAGER", List.of("managers"));

        // When & Then
        assertThat(authService.hasPermission(manager, "ATTENDANCE_MANAGE")).isTrue();
        assertThat(authService.hasPermission(manager, "EMPLOYEE_MANAGE")).isFalse();
        assertThat(authService.hasPermission(manager, "CORRECTION_APPROVE")).isTrue();
        assertThat(authService.hasPermission(manager, "RECORDS_VIEW_ALL")).isTrue();
    }

    @Test
    void testHasPermission_AdminRole() {
        // Given
        AuthenticatedUser admin = new AuthenticatedUser("user-789", "admin@example.com", "ADM001",
                "ADMIN", List.of("admins"));

        // When & Then
        assertThat(authService.hasPermission(admin, "ATTENDANCE_MANAGE")).isTrue();
        assertThat(authService.hasPermission(admin, "EMPLOYEE_MANAGE")).isTrue();
        assertThat(authService.hasPermission(admin, "CORRECTION_APPROVE")).isTrue();
        assertThat(authService.hasPermission(admin, "RECORDS_VIEW_ALL")).isTrue();
    }

    @Test
    void testHasPermission_MultipleGroups() {
        // Given
        AuthenticatedUser userWithMultipleRoles = new AuthenticatedUser("user-multi",
                "multi@example.com", "MUL001", "MANAGER", List.of("employees", "managers"));

        // When & Then
        assertThat(authService.hasPermission(userWithMultipleRoles, "ATTENDANCE_MANAGE")).isTrue();
        assertThat(authService.hasPermission(userWithMultipleRoles, "CORRECTION_APPROVE")).isTrue();
        assertThat(authService.hasPermission(userWithMultipleRoles, "RECORDS_VIEW_ALL")).isTrue();
        assertThat(authService.hasPermission(userWithMultipleRoles, "EMPLOYEE_MANAGE")).isFalse();
    }

    @Test
    void testHasPermission_InvalidPermission() {
        // Given
        AuthenticatedUser user = new AuthenticatedUser("user-123", "user@example.com", "USR001",
                "EMPLOYEE", List.of("employees"));

        // When & Then
        assertThat(authService.hasPermission(user, "INVALID_PERMISSION")).isFalse();
    }

    @Test
    void testHasPermission_NoGroups() {
        // Given
        AuthenticatedUser userWithNoGroups = new AuthenticatedUser("user-no-groups",
                "nogroups@example.com", "NOG001", "EMPLOYEE", List.of());

        // When & Then
        assertThat(authService.hasPermission(userWithNoGroups, "ATTENDANCE_MANAGE")).isFalse();
        assertThat(authService.hasPermission(userWithNoGroups, "EMPLOYEE_MANAGE")).isFalse();
        assertThat(authService.hasPermission(userWithNoGroups, "CORRECTION_APPROVE")).isFalse();
        assertThat(authService.hasPermission(userWithNoGroups, "RECORDS_VIEW_ALL")).isFalse();
    }
}
