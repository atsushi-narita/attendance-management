package kiro.attendance.dao.impl;

import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.entity.AttendanceRecord;import kiro.attendance.entity.AttendanceStatus;

import java.sql.*;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 勤怠記録DAO実装
 */
public class AttendanceRecordDaoImpl implements AttendanceRecordDao {

    private final Connection connection;

    public AttendanceRecordDaoImpl(Connection connection) {
        this.connection = connection;
    }

    @Override
    public Optional<AttendanceRecord> findById(Long id) {
        String sql = "SELECT * FROM attendance_records WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find attendance record by id", e);
        }
        return Optional.empty();
    }

    @Override
    public Optional<AttendanceRecord> findByEmployeeIdAndDate(Long employeeId, LocalDate date) {
        String sql = "SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, employeeId);
            stmt.setDate(2, Date.valueOf(date));
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find attendance record by employee and date", e);
        }
        return Optional.empty();
    }

    @Override
    public List<AttendanceRecord> findByEmployeeIdAndMonth(Long employeeId, YearMonth month) {
        String sql = "SELECT * FROM attendance_records WHERE employee_id = ? AND date >= ? AND date < ? ORDER BY date";
        List<AttendanceRecord> records = new ArrayList<>();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, employeeId);
            stmt.setDate(2, Date.valueOf(month.atDay(1)));
            stmt.setDate(3, Date.valueOf(month.plusMonths(1).atDay(1)));
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    records.add(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find attendance records by employee and month", e);
        }
        return records;
    }

    @Override
    public List<AttendanceRecord> findAllByMonth(YearMonth month) {
        String sql = "SELECT * FROM attendance_records WHERE date >= ? AND date < ? ORDER BY employee_id, date";
        List<AttendanceRecord> records = new ArrayList<>();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setDate(1, Date.valueOf(month.atDay(1)));
            stmt.setDate(2, Date.valueOf(month.plusMonths(1).atDay(1)));
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    records.add(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find attendance records by month", e);
        }
        return records;
    }

    @Override
    public List<AttendanceRecord> findByEmployeeId(Long employeeId) {
        String sql = "SELECT * FROM attendance_records WHERE employee_id = ? ORDER BY date DESC";
        List<AttendanceRecord> records = new ArrayList<>();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, employeeId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    records.add(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find attendance records by employee", e);
        }
        return records;
    }

    @Override
    public AttendanceRecord insert(AttendanceRecord record) {
        String sql = "INSERT INTO attendance_records (employee_id, date, clock_in_time, clock_out_time, working_minutes, status) " +
                     "VALUES (?, ?, ?, ?, ?, ?) RETURNING *";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, record.getEmployeeId());
            stmt.setDate(2, Date.valueOf(record.getDate()));
            stmt.setTimestamp(3, record.getClockInTime() != null ? Timestamp.valueOf(record.getClockInTime()) : null);
            stmt.setTimestamp(4, record.getClockOutTime() != null ? Timestamp.valueOf(record.getClockOutTime()) : null);
            stmt.setLong(5, record.getWorkingMinutes());
            stmt.setString(6, record.getStatus().name());
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToEntity(rs);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to insert attendance record", e);
        }
        throw new RuntimeException("Failed to insert attendance record");
    }

    @Override
    public AttendanceRecord update(AttendanceRecord record) {
        String sql = "UPDATE attendance_records SET clock_in_time = ?, clock_out_time = ?, working_minutes = ?, status = ? " +
                     "WHERE id = ? RETURNING *";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setTimestamp(1, record.getClockInTime() != null ? Timestamp.valueOf(record.getClockInTime()) : null);
            stmt.setTimestamp(2, record.getClockOutTime() != null ? Timestamp.valueOf(record.getClockOutTime()) : null);
            stmt.setLong(3, record.getWorkingMinutes());
            stmt.setString(4, record.getStatus().name());
            stmt.setLong(5, record.getId());
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToEntity(rs);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to update attendance record", e);
        }
        throw new RuntimeException("Failed to update attendance record");
    }

    @Override
    public void delete(Long id) {
        String sql = "DELETE FROM attendance_records WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete attendance record", e);
        }
    }

    private AttendanceRecord mapResultSetToEntity(ResultSet rs) throws SQLException {
        AttendanceRecord record = new AttendanceRecord();
        record.setId(rs.getLong("id"));
        record.setEmployeeId(rs.getLong("employee_id"));
        record.setDate(rs.getDate("date").toLocalDate());
        
        Timestamp clockInTimestamp = rs.getTimestamp("clock_in_time");
        if (clockInTimestamp != null) {
            record.setClockInTime(clockInTimestamp.toLocalDateTime());
        }
        
        Timestamp clockOutTimestamp = rs.getTimestamp("clock_out_time");
        if (clockOutTimestamp != null) {
            record.setClockOutTime(clockOutTimestamp.toLocalDateTime());
        }
        
        record.setWorkingMinutes(rs.getLong("working_minutes"));
        record.setStatus(AttendanceStatus.valueOf(rs.getString("status")));
        record.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        record.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        
        return record;
    }
}