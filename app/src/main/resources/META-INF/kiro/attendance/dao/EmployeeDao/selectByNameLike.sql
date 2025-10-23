SELECT 
    id,
    name,
    employee_number,
    required_monthly_hours,
    role,
    created_at,
    updated_at
FROM employees 
WHERE name LIKE /* namePattern */'%田中%'
ORDER BY name