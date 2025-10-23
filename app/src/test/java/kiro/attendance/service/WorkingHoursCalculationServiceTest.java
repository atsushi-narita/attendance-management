package kiro.attendance.service;

import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.entity.AttendanceStatus;
import kiro.attendance.entity.Employee;
import kiro.attendance.entity.UserRole;
import kiro.attendance.exception.AttendanceException;import kiro.attendance.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * WorkingHoursCalculationServiceのテスト
 */
class WorkingHoursCalculationServiceTest {

    @Mock
    private AttendanceRecordDao attendanceRecordDao;

    @Mock
    private EmployeeDao employeeDao;

    private WorkingHoursCalculationService calculationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        calculationService = new WorkingHoursCalculationService(attendanceRecordDao, employeeDao);
    }

    @Test
    void calculateDailyWorkingHours_記録が存在する場合() {
        // Given
        Long employeeId = 1L;
        LocalDate date = LocalDate.now();
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        AttendanceRecord record = new AttendanceRecord();
        record.setEmployeeId(employeeId);
        record.setDate(date);
        record.setClockInTime(LocalDateTime.of(date, java.time.LocalTime.of(9, 0)));
        record.setClockOutTime(LocalDateTime.of(date, java.time.LocalTime.of(18, 0)));
        record.setWorkingMinutes(480L); // 8時間
        record.setStatus(AttendanceStatus.PRESENT);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(employeeId, date))
                .thenReturn(Optional.of(record));

        // When
        WorkingHoursCalculationService.DailyWorkingHours result = 
                calculationService.calculateDailyWorkingHours(employeeId, date);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getDate()).isEqualTo(date);
        assertThat(result.getWorkingMinutes()).isEqualTo(480L);
        assertThat(result.getWorkingHours()).isEqualTo(8.0);
        assertThat(result.isClockedIn()).isTrue();
        assertThat(result.isClockedOut()).isTrue();
        assertThat(result.isCompleteDay()).isTrue();
    }

    @Test
    void calculateDailyWorkingHours_記録が存在しない場合() {
        // Given
        Long employeeId = 1L;
        LocalDate date = LocalDate.now();
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(employeeId, date))
                .thenReturn(Optional.empty());

        // When
        WorkingHoursCalculationService.DailyWorkingHours result = 
                calculationService.calculateDailyWorkingHours(employeeId, date);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getDate()).isEqualTo(date);
        assertThat(result.getWorkingMinutes()).isEqualTo(0L);
        assertThat(result.getWorkingHours()).isEqualTo(0.0);
        assertThat(result.isClockedIn()).isFalse();
        assertThat(result.isClockedOut()).isFalse();
        assertThat(result.isCompleteDay()).isFalse();
    }

    @Test
    void calculateMonthlyWorkingHours_正常ケース() {
        // Given
        Long employeeId = 1L;
        YearMonth month = YearMonth.now();
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        List<AttendanceRecord> records = Arrays.asList(
                createAttendanceRecord(employeeId, month.atDay(1), 480L), // 8時間
                createAttendanceRecord(employeeId, month.atDay(2), 450L), // 7.5時間
                createAttendanceRecord(employeeId, month.atDay(3), 510L)  // 8.5時間
        );

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndMonth(employeeId, month))
                .thenReturn(records);

        // When
        WorkingHoursCalculationService.MonthlyWorkingHours result = 
                calculationService.calculateMonthlyWorkingHours(employeeId, month);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getMonth()).isEqualTo(month);
        assertThat(result.getTotalWorkingMinutes()).isEqualTo(1440L); // 24時間
        assertThat(result.getTotalWorkingHours()).isEqualTo(24.0);
        assertThat(result.getWorkingDays()).isEqualTo(3);
        assertThat(result.getPresentDays()).isEqualTo(3);
        assertThat(result.getAbsentDays()).isEqualTo(0);
        assertThat(result.getAverageWorkingHours()).isEqualTo(8.0);
    }

    @Test
    void calculateRequiredHoursComparison_過不足計算() {
        // Given
        Long employeeId = 1L;
        YearMonth month = YearMonth.now();
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        List<AttendanceRecord> records = Arrays.asList(
                createAttendanceRecord(employeeId, month.atDay(1), 480L), // 8時間
                createAttendanceRecord(employeeId, month.atDay(2), 480L), // 8時間
                createAttendanceRecord(employeeId, month.atDay(3), 480L)  // 8時間
        );
        // 合計24時間 = 1440分

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndMonth(employeeId, month))
                .thenReturn(records);

        // When
        WorkingHoursCalculationService.RequiredHoursComparison result = 
                calculationService.calculateRequiredHoursComparison(employeeId, month);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getMonth()).isEqualTo(month);
        assertThat(result.getActualMinutes()).isEqualTo(1440L); // 24時間
        assertThat(result.getRequiredMinutes()).isEqualTo(9600L); // 160時間
        assertThat(result.getDifferenceMinutes()).isEqualTo(-8160L); // -136時間
        assertThat(result.getActualHours()).isEqualTo(24.0);
        assertThat(result.getRequiredHours()).isEqualTo(160.0);
        assertThat(result.getDifferenceHours()).isEqualTo(-136.0);
        assertThat(result.isUndertime()).isTrue();
        assertThat(result.isOvertime()).isFalse();
        assertThat(result.isMeetsRequirement()).isFalse();
        assertThat(result.getAchievementRate()).isEqualTo(15.0); // 24/160 * 100
    }

    @Test
    void calculateDailyWorkingHours_従業員が存在しない場合_例外発生() {
        // Given
        Long employeeId = 999L;
        LocalDate date = LocalDate.now();

        when(employeeDao.findById(employeeId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> calculationService.calculateDailyWorkingHours(employeeId, date))
                .isInstanceOf(AttendanceException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.EMPLOYEE_NOT_FOUND);
    }

    private AttendanceRecord createAttendanceRecord(Long employeeId, LocalDate date, Long workingMinutes) {
        AttendanceRecord record = new AttendanceRecord();
        record.setEmployeeId(employeeId);
        record.setDate(date);
        record.setClockInTime(LocalDateTime.of(date, java.time.LocalTime.of(9, 0)));
        record.setClockOutTime(LocalDateTime.of(date, java.time.LocalTime.of(9, 0)).plusMinutes(workingMinutes));
        record.setWorkingMinutes(workingMinutes);
        record.setStatus(AttendanceStatus.PRESENT);
        return record;
    }
}