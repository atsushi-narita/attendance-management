package kiro.attendance.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.entity.AttendanceStatus;
import kiro.attendance.exception.AttendanceException;
import software.amazon.awssdk.services.cognitoidentity.model.ErrorCode;

/**
 * 打刻サービス
 */
public class AttendanceService {

    private final AttendanceRecordDao attendanceRecordDao;
    private final EmployeeDao employeeDao;

    public AttendanceService(AttendanceRecordDao attendanceRecordDao, EmployeeDao employeeDao) {
        this.attendanceRecordDao = attendanceRecordDao;
        this.employeeDao = employeeDao;
    }

    /**
     * 出勤打刻
     */
    public AttendanceRecord clockIn(Long employeeId) {
        // 従業員の存在確認
        if (!employeeDao.findById(employeeId).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // 既に出勤打刻済みかチェック
        Optional<AttendanceRecord> existingRecord =
                attendanceRecordDao.findByEmployeeIdAndDate(employeeId, today);
        if (existingRecord.isPresent() && existingRecord.get().getClockInTime() != null) {
            throw new AttendanceException(ErrorCode.ALREADY_CLOCKED_IN, "既に出勤打刻済みです");
        }

        AttendanceRecord record;
        if (existingRecord.isPresent()) {
            // 既存レコードを更新
            record = existingRecord.get();
            record.setClockInTime(now);
            record.setStatus(AttendanceStatus.PARTIAL);
            record = attendanceRecordDao.update(record);
        } else {
            // 新規レコードを作成
            record = new AttendanceRecord(employeeId, today, now, null, 0L,
                    AttendanceStatus.PARTIAL);
            record = attendanceRecordDao.insert(record);
        }

        return record;
    }

    /**
     * 退勤打刻
     */
    public AttendanceRecord clockOut(Long employeeId) {
        // 従業員の存在確認
        if (!employeeDao.findById(employeeId).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // 出勤打刻済みかチェック
        Optional<AttendanceRecord> existingRecord =
                attendanceRecordDao.findByEmployeeIdAndDate(employeeId, today);
        if (!existingRecord.isPresent() || existingRecord.get().getClockInTime() == null) {
            throw new AttendanceException(ErrorCode.NOT_CLOCKED_IN, "出勤打刻されていません");
        }

        AttendanceRecord record = existingRecord.get();
        if (record.getClockOutTime() != null) {
            throw new AttendanceException(ErrorCode.ALREADY_CLOCKED_OUT, "既に退勤打刻済みです");
        }

        // 退勤時刻と勤務時間を設定
        record.setClockOutTime(now);
        long workingMinutes = ChronoUnit.MINUTES.between(record.getClockInTime(), now);
        record.setWorkingMinutes(workingMinutes);
        record.setStatus(AttendanceStatus.PRESENT);

        return attendanceRecordDao.update(record);
    }

    /**
     * 打刻状態取得
     */
    public AttendanceRecord getAttendanceStatus(Long employeeId) {
        // 従業員の存在確認
        if (!employeeDao.findById(employeeId).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        LocalDate today = LocalDate.now();
        Optional<AttendanceRecord> record =
                attendanceRecordDao.findByEmployeeIdAndDate(employeeId, today);

        if (!record.isPresent()) {
            // 今日の記録がない場合は空のレコードを返す
            return new AttendanceRecord(employeeId, today, null, null, 0L, AttendanceStatus.ABSENT);
        }

        return record.get();
    }
}
