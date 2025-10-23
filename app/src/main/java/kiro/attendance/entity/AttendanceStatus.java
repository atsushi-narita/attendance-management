package kiro.attendance.entity;

/**
 * 勤怠状態列挙型
 */
public enum AttendanceStatus {
    PRESENT("出勤"), ABSENT("欠勤"), PARTIAL("部分出勤");

    private final String displayName;

    AttendanceStatus(String displayName) {
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
