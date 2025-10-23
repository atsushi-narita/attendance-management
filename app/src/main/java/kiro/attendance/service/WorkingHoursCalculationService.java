package kiro.attendance.service;

import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.AttendanceRecord;import kiro.attendance.entity.Employee;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * 勤務時間計算サービス
 */
public class WorkingHoursCalculationService {

    private final AttendanceRecordDao attendanceRecordDao;
    private final EmployeeDao employeeDao;

    public WorkingHoursCalculationService(AttendanceRecordDao attendanceRecordDao, EmployeeDao employeeDao) {
        this.attendanceRecordDao = attendanceRecordDao;
        this.employeeDao = employeeDao;
    }

    /**
     * 日別勤務時間計算
     */
    public DailyWorkingHours calculateDailyWorkingHours(Long employeeId, LocalDate date) {
        // 従業員の存在確認
        Optional<Employee> employee = employeeDao.findById(employeeId);
        if (!employee.isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        Optional<AttendanceRecord> record = attendanceRecordDao.findByEmployeeIdAndDate(employeeId, date);
        
        if (!record.isPresent()) {
            return new DailyWorkingHours(employeeId, date, 0L, false, false);
        }

        AttendanceRecord attendanceRecord = record.get();
        long workingMinutes = attendanceRecord.getWorkingMinutes();
        boolean isClockedIn = attendanceRecord.getClockInTime() != null;
        boolean isClockedOut = attendanceRecord.getClockOutTime() != null;

        return new DailyWorkingHours(employeeId, date, workingMinutes, isClockedIn, isClockedOut);
    }

    /**
     * 月別勤務時間集計
     */
    public MonthlyWorkingHours calculateMonthlyWorkingHours(Long employeeId, YearMonth month) {
        // 従業員の存在確認
        Optional<Employee> employee = employeeDao.findById(employeeId);
        if (!employee.isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        List<AttendanceRecord> records = attendanceRecordDao.findByEmployeeIdAndMonth(employeeId, month);
        
        long totalWorkingMinutes = records.stream()
                .mapToLong(AttendanceRecord::getWorkingMinutes)
                .sum();

        int workingDays = records.size();
        int presentDays = (int) records.stream()
                .filter(record -> record.getClockInTime() != null && record.getClockOutTime() != null)
                .count();
        int absentDays = workingDays - presentDays;

        double averageWorkingHours = workingDays > 0 ? (totalWorkingMinutes / 60.0) / workingDays : 0.0;

        return new MonthlyWorkingHours(
                employeeId,
                month,
                totalWorkingMinutes,
                workingDays,
                presentDays,
                absentDays,
                averageWorkingHours
        );
    }

    /**
     * 規定拘束時間過不足計算
     */
    public RequiredHoursComparison calculateRequiredHoursComparison(Long employeeId, YearMonth month) {
        // 従業員の存在確認
        Optional<Employee> employee = employeeDao.findById(employeeId);
        if (!employee.isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        Employee emp = employee.get();
        int requiredMonthlyHours = emp.getRequiredMonthlyHours();
        long requiredMinutes = requiredMonthlyHours * 60L;

        MonthlyWorkingHours monthlyHours = calculateMonthlyWorkingHours(employeeId, month);
        long actualMinutes = monthlyHours.getTotalWorkingMinutes();
        long differenceMinutes = actualMinutes - requiredMinutes;

        return new RequiredHoursComparison(
                employeeId,
                month,
                actualMinutes,
                requiredMinutes,
                differenceMinutes,
                emp.getName(),
                emp.getEmployeeNumber()
        );
    }

    /**
     * 複数従業員の規定拘束時間過不足計算
     */
    public List<RequiredHoursComparison> calculateAllEmployeesRequiredHoursComparison(YearMonth month) {
        List<Employee> employees = employeeDao.findAll();
        
        return employees.stream()
                .map(employee -> calculateRequiredHoursComparison(employee.getId(), month))
                .toList();
    }

    /**
     * 日別勤務時間クラス
     */
    public static class DailyWorkingHours {
        private final Long employeeId;
        private final LocalDate date;
        private final long workingMinutes;
        private final boolean isClockedIn;
        private final boolean isClockedOut;

        public DailyWorkingHours(Long employeeId, LocalDate date, long workingMinutes, 
                boolean isClockedIn, boolean isClockedOut) {
            this.employeeId = employeeId;
            this.date = date;
            this.workingMinutes = workingMinutes;
            this.isClockedIn = isClockedIn;
            this.isClockedOut = isClockedOut;
        }

        // Getters
        public Long getEmployeeId() { return employeeId; }
        public LocalDate getDate() { return date; }
        public long getWorkingMinutes() { return workingMinutes; }
        public boolean isClockedIn() { return isClockedIn; }
        public boolean isClockedOut() { return isClockedOut; }
        public double getWorkingHours() { return workingMinutes / 60.0; }
        public boolean isCompleteDay() { return isClockedIn && isClockedOut; }
    }

    /**
     * 月別勤務時間クラス
     */
    public static class MonthlyWorkingHours {
        private final Long employeeId;
        private final YearMonth month;
        private final long totalWorkingMinutes;
        private final int workingDays;
        private final int presentDays;
        private final int absentDays;
        private final double averageWorkingHours;

        public MonthlyWorkingHours(Long employeeId, YearMonth month, long totalWorkingMinutes,
                int workingDays, int presentDays, int absentDays, double averageWorkingHours) {
            this.employeeId = employeeId;
            this.month = month;
            this.totalWorkingMinutes = totalWorkingMinutes;
            this.workingDays = workingDays;
            this.presentDays = presentDays;
            this.absentDays = absentDays;
            this.averageWorkingHours = averageWorkingHours;
        }

        // Getters
        public Long getEmployeeId() { return employeeId; }
        public YearMonth getMonth() { return month; }
        public long getTotalWorkingMinutes() { return totalWorkingMinutes; }
        public int getWorkingDays() { return workingDays; }
        public int getPresentDays() { return presentDays; }
        public int getAbsentDays() { return absentDays; }
        public double getAverageWorkingHours() { return averageWorkingHours; }
        public double getTotalWorkingHours() { return totalWorkingMinutes / 60.0; }
    }

    /**
     * 規定拘束時間比較クラス
     */
    public static class RequiredHoursComparison {
        private final Long employeeId;
        private final YearMonth month;
        private final long actualMinutes;
        private final long requiredMinutes;
        private final long differenceMinutes;
        private final String employeeName;
        private final String employeeNumber;

        public RequiredHoursComparison(Long employeeId, YearMonth month, long actualMinutes,
                long requiredMinutes, long differenceMinutes, String employeeName, String employeeNumber) {
            this.employeeId = employeeId;
            this.month = month;
            this.actualMinutes = actualMinutes;
            this.requiredMinutes = requiredMinutes;
            this.differenceMinutes = differenceMinutes;
            this.employeeName = employeeName;
            this.employeeNumber = employeeNumber;
        }

        // Getters
        public Long getEmployeeId() { return employeeId; }
        public YearMonth getMonth() { return month; }
        public long getActualMinutes() { return actualMinutes; }
        public long getRequiredMinutes() { return requiredMinutes; }
        public long getDifferenceMinutes() { return differenceMinutes; }
        public String getEmployeeName() { return employeeName; }
        public String getEmployeeNumber() { return employeeNumber; }

        // 時間単位での取得
        public double getActualHours() { return actualMinutes / 60.0; }
        public double getRequiredHours() { return requiredMinutes / 60.0; }
        public double getDifferenceHours() { return differenceMinutes / 60.0; }

        // 過不足判定
        public boolean isOvertime() { return differenceMinutes > 0; }
        public boolean isUndertime() { return differenceMinutes < 0; }
        public boolean isMeetsRequirement() { return differenceMinutes == 0; }

        // 達成率
        public double getAchievementRate() {
            if (requiredMinutes == 0) return 0.0;
            return (double) actualMinutes / requiredMinutes * 100.0;
        }
    }
}