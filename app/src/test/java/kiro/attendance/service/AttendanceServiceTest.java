package kiro.attendance.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.entity.AttendanceStatus;
import kiro.attendance.entity.Employee;
import kiro.attendance.entity.UserRole;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;

/**
 * AttendanceServiceのテスト
 */
class AttendanceServiceTest {

    @Mock
    private AttendanceRecordDao attendanceRecordDao;

    @Mock
    private EmployeeDao employeeDao;

    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        attendanceService = new AttendanceService(attendanceRecordDao, employeeDao);
    }

    @Test
    void clockIn_正常ケース_新規記録作成() {
        // Given
        Long employeeId = 1L;
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(eq(employeeId), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(attendanceRecordDao.insert(any(AttendanceRecord.class))).thenAnswer(invocation -> {
            AttendanceRecord record = invocation.getArgument(0);
            record.setId(1L);
            return record;
        });

        // When
        AttendanceRecord result = attendanceService.clockIn(employeeId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getClockInTime()).isNotNull();
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.PARTIAL);
        verify(attendanceRecordDao).insert(any(AttendanceRecord.class));
    }

    @Test
    void clockIn_従業員が存在しない場合_例外発生() {
        // Given
        Long employeeId = 999L;
        when(employeeDao.findById(employeeId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> attendanceService.clockIn(employeeId))
                .isInstanceOf(AttendanceException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.EMPLOYEE_NOT_FOUND);
    }

    @Test
    void clockIn_既に出勤打刻済み_例外発生() {
        // Given
        Long employeeId = 1L;
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        AttendanceRecord existingRecord = new AttendanceRecord();
        existingRecord.setEmployeeId(employeeId);
        existingRecord.setClockInTime(LocalDateTime.now().minusHours(1));

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(eq(employeeId), any(LocalDate.class)))
                .thenReturn(Optional.of(existingRecord));

        // When & Then
        assertThatThrownBy(() -> attendanceService.clockIn(employeeId))
                .isInstanceOf(AttendanceException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ALREADY_CLOCKED_IN);
    }

    @Test
    void clockOut_正常ケース() {
        // Given
        Long employeeId = 1L;
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        AttendanceRecord existingRecord = new AttendanceRecord();
        existingRecord.setId(1L);
        existingRecord.setEmployeeId(employeeId);
        existingRecord.setClockInTime(LocalDateTime.now().minusHours(8));
        existingRecord.setStatus(AttendanceStatus.PARTIAL);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(eq(employeeId), any(LocalDate.class)))
                .thenReturn(Optional.of(existingRecord));
        when(attendanceRecordDao.update(any(AttendanceRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        AttendanceRecord result = attendanceService.clockOut(employeeId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getClockOutTime()).isNotNull();
        assertThat(result.getWorkingMinutes()).isGreaterThan(0);
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.PRESENT);
        verify(attendanceRecordDao).update(any(AttendanceRecord.class));
    }

    @Test
    void clockOut_出勤打刻されていない場合_例外発生() {
        // Given
        Long employeeId = 1L;
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(eq(employeeId), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> attendanceService.clockOut(employeeId))
                .isInstanceOf(AttendanceException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_CLOCKED_IN);
    }

    @Test
    void getAttendanceStatus_記録が存在する場合() {
        // Given
        Long employeeId = 1L;
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        AttendanceRecord record = new AttendanceRecord();
        record.setEmployeeId(employeeId);
        record.setClockInTime(LocalDateTime.now().minusHours(4));
        record.setStatus(AttendanceStatus.PARTIAL);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(eq(employeeId), any(LocalDate.class)))
                .thenReturn(Optional.of(record));

        // When
        AttendanceRecord result = attendanceService.getAttendanceStatus(employeeId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getClockInTime()).isNotNull();
    }

    @Test
    void getAttendanceStatus_記録が存在しない場合() {
        // Given
        Long employeeId = 1L;
        Employee employee = new Employee("テスト太郎", "EMP001", 160, UserRole.EMPLOYEE);
        employee.setId(employeeId);

        when(employeeDao.findById(employeeId)).thenReturn(Optional.of(employee));
        when(attendanceRecordDao.findByEmployeeIdAndDate(eq(employeeId), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        // When
        AttendanceRecord result = attendanceService.getAttendanceStatus(employeeId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        assertThat(result.getClockInTime()).isNull();
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.ABSENT);
    }
}
