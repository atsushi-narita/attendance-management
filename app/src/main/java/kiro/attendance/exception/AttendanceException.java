package kiro.attendance.exception;

/**
 * 勤怠管理システム例外
 */
public class AttendanceException extends RuntimeException {

    private final kiro.attendance.exception.ErrorCode errorCode;

    public AttendanceException(kiro.attendance.exception.ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AttendanceException(kiro.attendance.exception.ErrorCode errorCode, String message,
            Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public kiro.attendance.exception.ErrorCode getErrorCode() {
        return errorCode;
    }
}
