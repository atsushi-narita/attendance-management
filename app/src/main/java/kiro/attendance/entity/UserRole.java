package kiro.attendance.entity;

/**
 * ユーザー役割列挙型
 */
public enum UserRole {
    EMPLOYEE("従業員"), MANAGER("管理者"), ADMIN("システム管理者");

    private final String displayName;

    UserRole(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
