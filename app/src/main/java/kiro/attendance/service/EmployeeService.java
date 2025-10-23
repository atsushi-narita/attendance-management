package kiro.attendance.service;

import java.util.List;
import java.util.Optional;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.entity.Employee;
import kiro.attendance.entity.UserRole;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;

/**
 * 従業員管理サービス
 */
public class EmployeeService {

    private final EmployeeDao employeeDao;

    public EmployeeService(EmployeeDao employeeDao) {
        this.employeeDao = employeeDao;
    }

    /**
     * 従業員一覧取得
     */
    public List<Employee> getAllEmployees() {
        return employeeDao.findAll();
    }

    /**
     * 従業員取得
     */
    public Employee getEmployee(Long id) {
        Optional<Employee> employee = employeeDao.findById(id);
        if (!employee.isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }
        return employee.get();
    }

    /**
     * 従業員登録
     */
    public Employee createEmployee(EmployeeCreateRequest request) {
        // バリデーション
        validateEmployeeRequest(request.getName(), request.getEmployeeNumber(),
                request.getRequiredMonthlyHours());

        // 従業員番号の重複チェック
        if (employeeDao.findByEmployeeNumber(request.getEmployeeNumber()).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NUMBER_DUPLICATE, "従業員番号が既に存在します");
        }

        Employee employee = new Employee(request.getName(), request.getEmployeeNumber(),
                request.getRequiredMonthlyHours(), request.getRole());

        return employeeDao.insert(employee);
    }

    /**
     * 従業員更新
     */
    public Employee updateEmployee(Long id, EmployeeUpdateRequest request) {
        // 既存従業員の取得
        Optional<Employee> existingEmployee = employeeDao.findById(id);
        if (!existingEmployee.isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        Employee employee = existingEmployee.get();

        // バリデーション
        validateEmployeeRequest(request.getName(), request.getEmployeeNumber(),
                request.getRequiredMonthlyHours());

        // 従業員番号の重複チェック（自分以外）
        Optional<Employee> duplicateEmployee =
                employeeDao.findByEmployeeNumber(request.getEmployeeNumber());
        if (duplicateEmployee.isPresent() && !duplicateEmployee.get().getId().equals(id)) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NUMBER_DUPLICATE, "従業員番号が既に存在します");
        }

        // 更新
        employee.setName(request.getName());
        employee.setEmployeeNumber(request.getEmployeeNumber());
        employee.setRequiredMonthlyHours(request.getRequiredMonthlyHours());
        employee.setRole(request.getRole());

        return employeeDao.update(employee);
    }

    /**
     * 従業員削除
     */
    public void deleteEmployee(Long id) {
        // 存在確認
        if (!employeeDao.findById(id).isPresent()) {
            throw new AttendanceException(ErrorCode.EMPLOYEE_NOT_FOUND, "従業員が見つかりません");
        }

        employeeDao.delete(id);
    }

    /**
     * 従業員リクエストのバリデーション
     */
    private void validateEmployeeRequest(String name, String employeeNumber,
            Integer requiredMonthlyHours) {
        if (name == null || name.trim().isEmpty()) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員名は必須です");
        }

        if (employeeNumber == null || employeeNumber.trim().isEmpty()) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員番号は必須です");
        }

        if (requiredMonthlyHours == null || requiredMonthlyHours < 140
                || requiredMonthlyHours > 180) {
            throw new AttendanceException(ErrorCode.INVALID_REQUIRED_HOURS,
                    "規定拘束時間は140-180時間の範囲で設定してください");
        }
    }

    /**
     * 従業員作成リクエスト
     */
    public static class EmployeeCreateRequest {
        private String name;
        private String employeeNumber;
        private Integer requiredMonthlyHours;
        private UserRole role;

        public EmployeeCreateRequest() {}

        public EmployeeCreateRequest(String name, String employeeNumber,
                Integer requiredMonthlyHours, UserRole role) {
            this.name = name;
            this.employeeNumber = employeeNumber;
            this.requiredMonthlyHours = requiredMonthlyHours;
            this.role = role;
        }

        // Getters and Setters
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
    }

    /**
     * 従業員更新リクエスト
     */
    public static class EmployeeUpdateRequest {
        private String name;
        private String employeeNumber;
        private Integer requiredMonthlyHours;
        private UserRole role;

        public EmployeeUpdateRequest() {}

        public EmployeeUpdateRequest(String name, String employeeNumber,
                Integer requiredMonthlyHours, UserRole role) {
            this.name = name;
            this.employeeNumber = employeeNumber;
            this.requiredMonthlyHours = requiredMonthlyHours;
            this.role = role;
        }

        // Getters and Setters
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
    }
}
