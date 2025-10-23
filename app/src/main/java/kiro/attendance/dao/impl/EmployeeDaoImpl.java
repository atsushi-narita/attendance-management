package kiro.attendance.dao.impl;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.Employee;
import kiro.attendance.entity.UserRole;

/**
 * 従業員DAO実装
 */
public class EmployeeDaoImpl implements EmployeeDao {

    private final Connection connection;

    public EmployeeDaoImpl(Connection connection) {
        this.connection = connection;
    }

    @Override
    public Optional<Employee> findById(Long id) {
        String sql = "SELECT * FROM employees WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find employee by id", e);
        }
        return Optional.empty();
    }

    @Override
    public Optional<Employee> findByEmployeeNumber(String employeeNumber) {
        String sql = "SELECT * FROM employees WHERE employee_number = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, employeeNumber);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToEntity(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find employee by employee number", e);
        }
        return Optional.empty();
    }

    @Override
    public List<Employee> findAll() {
        String sql = "SELECT * FROM employees ORDER BY employee_number";
        List<Employee> employees = new ArrayList<>();

        try (PreparedStatement stmt = connection.prepareStatement(sql);
                ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                employees.add(mapResultSetToEntity(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find all employees", e);
        }
        return employees;
    }

    @Override
    public Employee insert(Employee employee) {
        String sql = "INSERT INTO employees (name, employee_number, required_monthly_hours, role) "
                + "VALUES (?, ?, ?, ?) RETURNING *";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, employee.getName());
            stmt.setString(2, employee.getEmployeeNumber());
            stmt.setInt(3, employee.getRequiredMonthlyHours());
            stmt.setString(4, employee.getRole().name());

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToEntity(rs);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to insert employee", e);
        }
        throw new RuntimeException("Failed to insert employee");
    }

    @Override
    public Employee update(Employee employee) {
        String sql =
                "UPDATE employees SET name = ?, employee_number = ?, required_monthly_hours = ?, role = ? "
                        + "WHERE id = ? RETURNING *";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, employee.getName());
            stmt.setString(2, employee.getEmployeeNumber());
            stmt.setInt(3, employee.getRequiredMonthlyHours());
            stmt.setString(4, employee.getRole().name());
            stmt.setLong(5, employee.getId());

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToEntity(rs);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to update employee", e);
        }
        throw new RuntimeException("Failed to update employee");
    }

    @Override
    public void delete(Long id) {
        String sql = "DELETE FROM employees WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete employee", e);
        }
    }

    private Employee mapResultSetToEntity(ResultSet rs) throws SQLException {
        Employee employee = new Employee();
        employee.setId(rs.getLong("id"));
        employee.setName(rs.getString("name"));
        employee.setEmployeeNumber(rs.getString("employee_number"));
        employee.setRequiredMonthlyHours(rs.getInt("required_monthly_hours"));
        employee.setRole(UserRole.valueOf(rs.getString("role")));
        employee.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        employee.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());

        return employee;
    }
}
