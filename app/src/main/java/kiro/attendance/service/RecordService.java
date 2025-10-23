package kiro.attendance.service;

import java.time.YearMonth;
import java.util.List;
import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;

/**
 * 勤務記録サービス
 */
public class RecordService {

    private final AttendanceRecordDao attendanceRecordDao;
    private final EmployeeDao employeeDao;

    public RecordService(AttendanceRecordDao attendanceRecordDao, EmployeeDao employeeDao) {
        this.attendanceRecordDao = attendanceRecordDao;
        this.employeeDao = employeeDao;
    }

    /**
     * 勤務記録一覧取得（管理者用）
     */
    public List<AttendanceRecord> getAllRecords(YearMonth month) {
        if (month == null) {
            month = YearMonth.now();
        }
        return attendanceRecordDao.findAllByMonth(month);
    }

    /**
     * 従業員別勤務記録取得
     */
    public List<AttendanceRecord> getEmployeeRecords(Long employeeId, YearMonth month) {
        // 従業員の存在確認
        if (!employeeDao.findById(employeeId).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        if (month == null) {
            return attendanceRecordDao.findByEmployeeId(employeeId);
        } else {
            return attendanceRecordDao.findByEmployeeIdAndMonth(employeeId, month);
        }
    }

    /**
     * 月別勤務時間サマリー取得
     */
    public WorkingHoursSummary getWorkingHoursSummary(Long employeeId, YearMonth month) {
        // 従業員の存在確認
        var employee = employeeDao.findById(employeeId);
        if (!employee.isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        if (month == null) {
            month = YearMonth.now();
        }

        List<AttendanceRecord> records =
                attendanceRecordDao.findByEmployeeIdAndMonth(employeeId, month);

        // 勤務時間の集計
        long totalWorkingMinutes =
                records.stream().mapToLong(AttendanceRecord::getWorkingMinutes).sum();

        int requiredMonthlyHours = employee.get().getRequiredMonthlyHours();
        long requiredMinutes = requiredMonthlyHours * 60L;
        long differenceMinutes = totalWorkingMinutes - requiredMinutes;

        return new WorkingHoursSummary(employeeId, month, totalWorkingMinutes, requiredMinutes,
                differenceMinutes, records.size());
    }

    /**
     * 勤務時間サマリークラス
     */
    public static class WorkingHoursSummary {
        private final Long employeeId;
        private final YearMonth month;
        private final long totalWorkingMinutes;
        private final long requiredMinutes;
        private final long differenceMinutes;
        private final int workingDays;

        public WorkingHoursSummary(Long employeeId, YearMonth month, long totalWorkingMinutes,
                long requiredMinutes, long differenceMinutes, int workingDays) {
            this.employeeId = employeeId;
            this.month = month;
            this.totalWorkingMinutes = totalWorkingMinutes;
            this.requiredMinutes = requiredMinutes;
            this.differenceMinutes = differenceMinutes;
            this.workingDays = workingDays;
        }

        // Getters
        public Long getEmployeeId() {
            return employeeId;
        }

        public YearMonth getMonth() {
            return month;
        }

        public long getTotalWorkingMinutes() {
            return totalWorkingMinutes;
        }

        public long getRequiredMinutes() {
            return requiredMinutes;
        }

        public long getDifferenceMinutes() {
            return differenceMinutes;
        }

        public int getWorkingDays() {
            return workingDays;
        }

        // 時間単位での取得
        public double getTotalWorkingHours() {
            return totalWorkingMinutes / 60.0;
        }

        public double getRequiredHours() {
            return requiredMinutes / 60.0;
        }

        public double getDifferenceHours() {
            return differenceMinutes / 60.0;
        }

        // 過不足判定
        public boolean isOvertime() {
            return differenceMinutes > 0;
        }

        public boolean isUndertime() {
            return differenceMinutes < 0;
        }
    }
}
