package kiro.attendance.dao;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import kiro.attendance.entity.AttendanceRecord;

/**
 * 勤怠記録データアクセスオブジェクト
 */
public interface AttendanceRecordDao {

    /**
     * IDで勤怠記録を取得
     */
    Optional<AttendanceRecord> findById(Long id);

    /**
     * 従業員IDと日付で勤怠記録を取得
     */
    Optional<AttendanceRecord> findByEmployeeIdAndDate(Long employeeId, LocalDate date);

    /**
     * 従業員IDと月で勤怠記録一覧を取得
     */
    List<AttendanceRecord> findByEmployeeIdAndMonth(Long employeeId, YearMonth month);

    /**
     * 月で全従業員の勤怠記録一覧を取得
     */
    List<AttendanceRecord> findAllByMonth(YearMonth month);

    /**
     * 従業員IDで勤怠記録一覧を取得
     */
    List<AttendanceRecord> findByEmployeeId(Long employeeId);

    /**
     * 勤怠記録を挿入
     */
    AttendanceRecord insert(AttendanceRecord record);

    /**
     * 勤怠記録を更新
     */
    AttendanceRecord update(AttendanceRecord record);

    /**
     * 勤怠記録を削除
     */
    void delete(Long id);
}
