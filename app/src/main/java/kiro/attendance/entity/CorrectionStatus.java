package kiro.attendance.entity;

/**
 * 修正申請状態列挙型
 */
public enum CorrectionStatus {
    PENDING("承認待ち"), APPROVED("承認済み"), REJECTED("却下");

    private final String displayName;

    CorrectionStatus(String displayName) {
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
