package kiro.attendance.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 勤怠記録エンティティ
 */
public class AttendanceRecord {

    private Long id;
    private Long employeeId;
    private LocalDate date;
    private LocalDateTime clockInTime;
    private LocalDateTime clockOutTime;
    private Long workingMinutes;
    private AttendanceStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // デフォルトコンストラクタ
    public AttendanceRecord() {}

    // コンストラクタ
    public AttendanceRecord(Long employeeId, LocalDate date, LocalDateTime clockInTime,
            LocalDateTime clockOutTime, Long workingMinutes, AttendanceStatus status) {
        this.employeeId = employeeId;
        this.date = date;
        this.clockInTime = clockInTime;
        this.clockOutTime = clockOutTime;
        this.workingMinutes = workingMinutes;
        this.status = status;
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

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public LocalDateTime getClockInTime() {
        return clockInTime;
    }

    public void setClockInTime(LocalDateTime clockInTime) {
        this.clockInTime = clockInTime;
    }

    public LocalDateTime getClockOutTime() {
        return clockOutTime;
    }

    public void setClockOutTime(LocalDateTime clockOutTime) {
        this.clockOutTime = clockOutTime;
    }

    public Long getWorkingMinutes() {
        return workingMinutes;
    }

    public void setWorkingMinutes(Long workingMinutes) {
        this.workingMinutes = workingMinutes;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
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
        return "AttendanceRecord{" + "id=" + id + ", employeeId=" + employeeId + ", date=" + date
                + ", clockInTime=" + clockInTime + ", clockOutTime=" + clockOutTime
                + ", workingMinutes=" + workingMinutes + ", status=" + status + ", createdAt="
                + createdAt + ", updatedAt=" + updatedAt + '}';
    }
}
