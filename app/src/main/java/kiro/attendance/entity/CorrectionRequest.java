package kiro.attendance.entity;

import java.time.LocalDateTime;

/**
 * 修正申請エンティティ
 */
public class CorrectionRequest {

    private Long id;
    private Long employeeId;
    private Long originalRecordId;
    private LocalDateTime requestedClockIn;
    private LocalDateTime requestedClockOut;
    private String reason;
    private CorrectionStatus status;
    private LocalDateTime requestDate;
    private LocalDateTime processedDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // デフォルトコンストラクタ
    public CorrectionRequest() {}

    // コンストラクタ
    public CorrectionRequest(Long employeeId, Long originalRecordId, LocalDateTime requestedClockIn,
            LocalDateTime requestedClockOut, String reason) {
        this.employeeId = employeeId;
        this.originalRecordId = originalRecordId;
        this.requestedClockIn = requestedClockIn;
        this.requestedClockOut = requestedClockOut;
        this.reason = reason;
        this.status = CorrectionStatus.PENDING;
        this.requestDate = LocalDateTime.now();
    }

    // Getter/Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public Long getOriginalRecordId() {
        return originalRecordId;
    }

    public void setOriginalRecordId(Long originalRecordId) {
        this.originalRecordId = originalRecordId;
    }

    public LocalDateTime getRequestedClockIn() {
        return requestedClockIn;
    }

    public void setRequestedClockIn(LocalDateTime requestedClockIn) {
        this.requestedClockIn = requestedClockIn;
    }

    public LocalDateTime getRequestedClockOut() {
        return requestedClockOut;
    }

    public void setRequestedClockOut(LocalDateTime requestedClockOut) {
        this.requestedClockOut = requestedClockOut;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public CorrectionStatus getStatus() {
        return status;
    }

    public void setStatus(CorrectionStatus status) {
        this.status = status;
    }

    public LocalDateTime getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(LocalDateTime requestDate) {
        this.requestDate = requestDate;
    }

    public LocalDateTime getProcessedDate() {
        return processedDate;
    }

    public void setProcessedDate(LocalDateTime processedDate) {
        this.processedDate = processedDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public String toString() {
        return "CorrectionRequest{" + "id=" + id + ", employeeId=" + employeeId
                + ", originalRecordId=" + originalRecordId + ", requestedClockIn="
                + requestedClockIn + ", requestedClockOut=" + requestedClockOut + ", reason='"
                + reason + '\'' + ", status=" + status + ", requestDate=" + requestDate
                + ", processedDate=" + processedDate + ", createdAt=" + createdAt + ", updatedAt="
                + updatedAt + '}';
    }
}
