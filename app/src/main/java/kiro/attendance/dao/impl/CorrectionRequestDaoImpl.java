package kiro.attendance.dao.impl;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import kiro.attendance.dao.CorrectionRequestDao;
import kiro.attendance.entity.CorrectionRequest;
import kiro.attendance.entity.CorrectionStatus;

/**
 * 修正申請DAO実装
 */
public class CorrectionRequestDaoImpl implements CorrectionRequestDao {

    private final Connection connection;

    public CorrectionRequestDaoImpl(Connection connection) {
        this.connection = connection;
    }

    @Override
    public Optional<CorrectionRequest> findById(Long id) {
        String sql = "SELECT * FROM correction_requests WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find correction request by id", e);
        }
        return Optional.empty();
    }

    @Override
    public List<CorrectionRequest> findPendingRequests() {
        return findByStatus(CorrectionStatus.PENDING);
    }

    @Override
    public List<CorrectionRequest> findByEmployeeId(Long employeeId) {
        String sql =
                "SELECT * FROM correction_requests WHERE employee_id = ? ORDER BY request_date DESC";
        List<CorrectionRequest> requests = new ArrayList<>();

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, employeeId);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    requests.add(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find correction requests by employee", e);
        }
        return requests;
    }

    @Override
    public List<CorrectionRequest> findByStatus(CorrectionStatus status) {
        String sql =
                "SELECT * FROM correction_requests WHERE status = ? ORDER BY request_date DESC";
        List<CorrectionRequest> requests = new ArrayList<>();

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, status.name());

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    requests.add(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find correction requests by status", e);
        }
        return requests;
    }

    @Override
    public CorrectionRequest insert(CorrectionRequest request) {
        String sql =
                "INSERT INTO correction_requests (employee_id, original_record_id, requested_clock_in, "
                        + "requested_clock_out, reason, status, request_date) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, request.getEmployeeId());
            stmt.setLong(2, request.getOriginalRecordId());
            stmt.setTimestamp(3,
                    request.getRequestedClockIn() != null
                            ? Timestamp.valueOf(request.getRequestedClockIn())
                            : null);
            stmt.setTimestamp(4,
                    request.getRequestedClockOut() != null
                            ? Timestamp.valueOf(request.getRequestedClockOut())
                            : null);
            stmt.setString(5, request.getReason());
            stmt.setString(6, request.getStatus().name());
            stmt.setTimestamp(7, Timestamp.valueOf(request.getRequestDate()));

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToEntity(rs);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to insert correction request", e);
        }
        throw new RuntimeException("Failed to insert correction request");
    }

    @Override
    public CorrectionRequest update(CorrectionRequest request) {
        String sql =
                "UPDATE correction_requests SET requested_clock_in = ?, requested_clock_out = ?, "
                        + "reason = ?, status = ?, processed_date = ? WHERE id = ? RETURNING *";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setTimestamp(1,
                    request.getRequestedClockIn() != null
                            ? Timestamp.valueOf(request.getRequestedClockIn())
                            : null);
            stmt.setTimestamp(2,
                    request.getRequestedClockOut() != null
                            ? Timestamp.valueOf(request.getRequestedClockOut())
                            : null);
            stmt.setString(3, request.getReason());
            stmt.setString(4, request.getStatus().name());
            stmt.setTimestamp(5,
                    request.getProcessedDate() != null
                            ? Timestamp.valueOf(request.getProcessedDate())
                            : null);
            stmt.setLong(6, request.getId());

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToEntity(rs);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to update correction request", e);
        }
        throw new RuntimeException("Failed to update correction request");
    }

    @Override
    public void delete(Long id) {
        String sql = "DELETE FROM correction_requests WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete correction request", e);
        }
    }

    private CorrectionRequest mapResultSetToEntity(ResultSet rs) throws SQLException {
        CorrectionRequest request = new CorrectionRequest();
        request.setId(rs.getLong("id"));
        request.setEmployeeId(rs.getLong("employee_id"));
        request.setOriginalRecordId(rs.getLong("original_record_id"));

        Timestamp requestedClockIn = rs.getTimestamp("requested_clock_in");
        if (requestedClockIn != null) {
            request.setRequestedClockIn(requestedClockIn.toLocalDateTime());
        }

        Timestamp requestedClockOut = rs.getTimestamp("requested_clock_out");
        if (requestedClockOut != null) {
            request.setRequestedClockOut(requestedClockOut.toLocalDateTime());
        }

        request.setReason(rs.getString("reason"));
        request.setStatus(CorrectionStatus.valueOf(rs.getString("status")));
        request.setRequestDate(rs.getTimestamp("request_date").toLocalDateTime());

        Timestamp processedDate = rs.getTimestamp("processed_date");
        if (processedDate != null) {
            request.setProcessedDate(processedDate.toLocalDateTime());
        }

        request.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        request.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());

        return request;
    }
}
