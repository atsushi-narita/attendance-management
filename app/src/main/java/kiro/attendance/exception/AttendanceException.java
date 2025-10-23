package kiro.attendance.exception;

import software.amazon.awssdk.services.cognitoidentity.model.ErrorCode;

/**
 * 勤怠管理システム例外
 */
public class AttendanceException extends RuntimeException {

    private final ErrorCode errorCode;

    public AttendanceException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AttendanceException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
