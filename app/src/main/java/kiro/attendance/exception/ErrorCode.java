package kiro.attendance.exception;

/**
 * エラーコード列挙型
 */
public enum ErrorCode {
    // 打刻関連エラー
    ALREADY_CLOCKED_IN("ATTENDANCE_001", "既に出勤打刻済みです", 400), NOT_CLOCKED_IN("ATTENDANCE_002",
            "出勤打刻されていません", 400), ALREADY_CLOCKED_OUT("ATTENDANCE_003", "既に退勤打刻済みです",
                    400), INVALID_TIME_RANGE("ATTENDANCE_004", "無効な時間範囲です", 400),

    // 従業員関連エラー
    EMPLOYEE_NOT_FOUND("EMPLOYEE_001", "従業員が見つかりません", 404), EMPLOYEE_NUMBER_DUPLICATE(
            "EMPLOYEE_002", "従業員番号が重複しています",
            400), INVALID_REQUIRED_HOURS("EMPLOYEE_003", "規定拘束時間は140-180時間の範囲で設定してください", 400),

    // 認証関連エラー
    UNAUTHORIZED("AUTH_001", "認証が必要です", 401), FORBIDDEN("AUTH_002", "権限がありません",
            403), INVALID_TOKEN("AUTH_003", "無効なトークンです", 401),

    // 修正申請関連エラー
    CORRECTION_REQUEST_NOT_FOUND("CORRECTION_001", "修正申請が見つかりません",
            404), CORRECTION_ALREADY_PROCESSED("CORRECTION_002", "修正申請は既に処理済みです", 400),

    // システムエラー
    LAMBDA_TIMEOUT("AWS_001", "処理がタイムアウトしました", 500), DATABASE_CONNECTION_ERROR("DB_001",
            "データベース接続エラー", 500), INTERNAL_SERVER_ERROR("SYS_001", "内部サーバーエラー", 500);

    private final String code;
    private final String message;
    private final int httpStatus;

    ErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
