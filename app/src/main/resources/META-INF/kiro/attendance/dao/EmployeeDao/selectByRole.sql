SELECT 
    id,
    name,
    employee_number,
    required_monthly_hours,
    role,
    created_at,
    updated_at
FROM employees 
WHERE role = /* role */'EMPLOYEE'
ORDER BY employee_number