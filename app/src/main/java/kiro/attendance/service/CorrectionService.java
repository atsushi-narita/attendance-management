package kiro.attendance.service;

import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.CorrectionRequestDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.entity.CorrectionRequest;
import kiro.attendance.entity.CorrectionStatus;import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * 修正申請サービス
 */
public class CorrectionService {

    private final CorrectionRequestDao correctionRequestDao;
    private final AttendanceRecordDao attendanceRecordDao;
    private final EmployeeDao employeeDao;

    public CorrectionService(CorrectionRequestDao correctionRequestDao, 
            AttendanceRecordDao attendanceRecordDao, EmployeeDao employeeDao) {
        this.correctionRequestDao = correctionRequestDao;
        this.attendanceRecordDao = attendanceRecordDao;
        this.employeeDao = employeeDao;
    }

    /**
     * 修正申請提出
     */
    public CorrectionRequest submitCorrectionRequest(CorrectionRequestSubmission submission) {
        // 従業員の存在確認
        if (!employeeDao.findById(submission.getEmployeeId()).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        // 元の勤怠記録の存在確認
        Optional<AttendanceRecord> originalRecord = attendanceRecordDao.findById(submission.getOriginalRecordId());
        if (!originalRecord.isPresent()) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "修正対象の勤怠記録が見つかりません");
        }

        // 権限チェック（自分の記録のみ修正申請可能）
        if (!originalRecord.get().getEmployeeId().equals(submission.getEmployeeId())) {
            throw new AttendanceException(ErrorCode.FORBIDDEN, "他の従業員の記録は修正申請できません");
        }

        // 時間の妥当性チェック
        if (submission.getRequestedClockIn() != null && submission.getRequestedClockOut() != null) {
            if (submission.getRequestedClockIn().isAfter(submission.getRequestedClockOut())) {
                throw new AttendanceException(ErrorCode.INVALID_TIME_RANGE, "出勤時刻は退勤時刻より前である必要があります");
            }
        }

        CorrectionRequest request = new CorrectionRequest(
                submission.getEmployeeId(),
                submission.getOriginalRecordId(),
                submission.getRequestedClockIn(),
                submission.getRequestedClockOut(),
                submission.getReason()
        );

        return correctionRequestDao.insert(request);
    }

    /**
     * 修正申請一覧取得
     */
    public List<CorrectionRequest> getCorrectionRequests(Long employeeId, CorrectionStatus status) {
        if (employeeId != null) {
            return correctionRequestDao.findByEmployeeId(employeeId);
        } else if (status != null) {
            return correctionRequestDao.findByStatus(status);
        } else {
            return correctionRequestDao.findPendingRequests();
        }
    }

    /**
     * 修正申請承認
     */
    public CorrectionRequest approveCorrectionRequest(Long requestId) {
        // 修正申請の取得
        Optional<CorrectionRequest> optionalRequest = correctionRequestDao.findById(requestId);
        if (!optionalRequest.isPresent()) {
            throw new AttendanceException(ErrorCode.CORRECTION_REQUEST_NOT_FOUND, "修正申請が見つかりません");
        }

        CorrectionRequest request = optionalRequest.get();

        // 既に処理済みかチェック
        if (request.getStatus() != CorrectionStatus.PENDING) {
            throw new AttendanceException(ErrorCode.CORRECTION_ALREADY_PROCESSED, "修正申請は既に処理済みです");
        }

        // 元の勤怠記録を更新
        Optional<AttendanceRecord> optionalRecord = attendanceRecordDao.findById(request.getOriginalRecordId());
        if (optionalRecord.isPresent()) {
            AttendanceRecord record = optionalRecord.get();
            
            if (request.getRequestedClockIn() != null) {
                record.setClockInTime(request.getRequestedClockIn());
            }
            if (request.getRequestedClockOut() != null) {
                record.setClockOutTime(request.getRequestedClockOut());
            }

            // 勤務時間を再計算
            if (record.getClockInTime() != null && record.getClockOutTime() != null) {
                long workingMinutes = ChronoUnit.MINUTES.between(record.getClockInTime(), record.getClockOutTime());
                record.setWorkingMinutes(workingMinutes);
            }

            attendanceRecordDao.update(record);
        }

        // 修正申請のステータスを更新
        request.setStatus(CorrectionStatus.APPROVED);
        request.setProcessedDate(LocalDateTime.now());

        return correctionRequestDao.update(request);
    }

    /**
     * 修正申請却下
     */
    public CorrectionRequest rejectCorrectionRequest(Long requestId, String rejectionReason) {
        // 修正申請の取得
        Optional<CorrectionRequest> optionalRequest = correctionRequestDao.findById(requestId);
        if (!optionalRequest.isPresent()) {
            throw new AttendanceException(ErrorCode.CORRECTION_REQUEST_NOT_FOUND, "修正申請が見つかりません");
        }

        CorrectionRequest request = optionalRequest.get();

        // 既に処理済みかチェック
        if (request.getStatus() != CorrectionStatus.PENDING) {
            throw new AttendanceException(ErrorCode.CORRECTION_ALREADY_PROCESSED, "修正申請は既に処理済みです");
        }

        // 修正申請のステータスを更新
        request.setStatus(CorrectionStatus.REJECTED);
        request.setProcessedDate(LocalDateTime.now());
        
        // 却下理由があれば追記
        if (rejectionReason != null && !rejectionReason.trim().isEmpty()) {
            request.setReason(request.getReason() + "\n[却下理由] " + rejectionReason);
        }

        return correctionRequestDao.update(request);
    }

    /**
     * 修正申請提出リクエスト
     */
    public static class CorrectionRequestSubmission {
        private Long employeeId;
        private Long originalRecordId;
        private LocalDateTime requestedClockIn;
        private LocalDateTime requestedClockOut;
        private String reason;

        public CorrectionRequestSubmission() {}

        public CorrectionRequestSubmission(Long employeeId, Long originalRecordId,
                LocalDateTime requestedClockIn, LocalDateTime requestedClockOut, String reason) {
            this.employeeId = employeeId;
            this.originalRecordId = originalRecordId;
            this.requestedClockIn = requestedClockIn;
            this.requestedClockOut = requestedClockOut;
            this.reason = reason;
        }

        // Getters and Setters
        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
        public Long getOriginalRecordId() { return originalRecordId; }
        public void setOriginalRecordId(Long originalRecordId) { this.originalRecordId = originalRecordId; }
        public LocalDateTime getRequestedClockIn() { return requestedClockIn; }
        public void setRequestedClockIn(LocalDateTime requestedClockIn) { this.requestedClockIn = requestedClockIn; }
        public LocalDateTime getRequestedClockOut() { return requestedClockOut; }
        public void setRequestedClockOut(LocalDateTime requestedClockOut) { this.requestedClockOut = requestedClockOut; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    /**
     * 修正申請却下リクエスト
     */
    public static class CorrectionRejectionRequest {
        private String rejectionReason;

        public CorrectionRejectionRequest() {}

        public CorrectionRejectionRequest(String rejectionReason) {
            this.rejectionReason = rejectionReason;
        }

        public String getRejectionReason() { return rejectionReason; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    }
}