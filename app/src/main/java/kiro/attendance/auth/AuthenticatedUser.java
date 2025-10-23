package kiro.attendance.auth;

import java.util.List;
import java.util.Objects;

/**
 * 認証済みユーザー情報を表すクラス
 */
public class AuthenticatedUser {
    private final String userId;
    private final String email;
    private final String employeeNumber;
    private final String role;
    private final List<String> groups;

    public AuthenticatedUser(String userId, String email, String employeeNumber, String role,
            List<String> groups) {
        this.userId = userId;
        this.email = email;
        this.employeeNumber = employeeNumber;
        this.role = role;
        this.groups = groups != null ? List.copyOf(groups) : List.of();
    }

    public String getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public String getRole() {
        return role;
    }

    public List<String> getGroups() {
        return groups;
    }

    public boolean isEmployee() {
        return groups.contains("employees");
    }

    public boolean isManager() {
        return groups.contains("managers");
    }

    public boolean isAdmin() {
        return groups.contains("admins");
    }

    /**
     * 従業員IDを取得（実装では従業員番号をIDとして使用）
     */
    public Long getEmployeeId() {
        // 実際の実装では、従業員番号から従業員IDを取得する必要がある
        // ここでは簡単のため、従業員番号の数値部分を抽出してIDとする
        if (employeeNumber != null && employeeNumber.matches(".*\\d+.*")) {
            String numberPart = employeeNumber.replaceAll("\\D+", "");
            if (!numberPart.isEmpty()) {
                return Long.parseLong(numberPart);
            }
        }
        return 1L; // デフォルト値
    }

    /**
     * 指定された役割を持っているかチェック
     */
    public boolean hasRole(kiro.attendance.entity.UserRole userRole) {
        switch (userRole) {
            case EMPLOYEE:
                return isEmployee();
            case MANAGER:
                return isManager();
            case ADMIN:
                return isAdmin();
            default:
                return false;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        AuthenticatedUser that = (AuthenticatedUser) o;
        return Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId);
    }

    @Override
    public String toString() {
        return "AuthenticatedUser{" + "userId='" + userId + '\'' + ", email='" + email + '\''
                + ", employeeNumber='" + employeeNumber + '\'' + ", role='" + role + '\''
                + ", groups=" + groups + '}';
    }
}
