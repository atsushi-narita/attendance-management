package kiro.attendance.entity;

import java.time.LocalDateTime;

/**
 * 従業員エンティティ
 */
public class Employee {

    private Long id;
    private String name;
    private String employeeNumber;
    private Integer requiredMonthlyHours;
    private UserRole role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // デフォルトコンストラクタ
    public Employee() {}

    // コンストラクタ
    public Employee(String name, String employeeNumber, Integer requiredMonthlyHours,
            UserRole role) {
        this.name = name;
        this.employeeNumber = employeeNumber;
        this.requiredMonthlyHours = requiredMonthlyHours;
        this.role = role;
    }

    // Getter/Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public void setEmployeeNumber(String employeeNumber) {
        this.employeeNumber = employeeNumber;
    }

    public Integer getRequiredMonthlyHours() {
        return requiredMonthlyHours;
    }

    public void setRequiredMonthlyHours(Integer requiredMonthlyHours) {
        this.requiredMonthlyHours = requiredMonthlyHours;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
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
        return "Employee{" + "id=" + id + ", name='" + name + '\'' + ", employeeNumber='"
                + employeeNumber + '\'' + ", requiredMonthlyHours=" + requiredMonthlyHours
                + ", role=" + role + ", createdAt=" + createdAt + ", updatedAt=" + updatedAt + '}';
    }
}
