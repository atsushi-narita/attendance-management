package kiro.attendance.dao;

import java.util.List;
import java.util.Optional;
import kiro.attendance.entity.Employee;

/**
 * 従業員データアクセスオブジェクト
 */
public interface EmployeeDao {

    /**
     * IDで従業員を取得
     */
    Optional<Employee> findById(Long id);

    /**
     * 従業員番号で従業員を取得
     */
    Optional<Employee> findByEmployeeNumber(String employeeNumber);

    /**
     * 全従業員を取得
     */
    List<Employee> findAll();

    /**
     * 従業員を挿入
     */
    Employee insert(Employee employee);

    /**
     * 従業員を更新
     */
    Employee update(Employee employee);

    /**
     * 従業員を削除
     */
    void delete(Long id);
}
