SELECT 
    id,
    employee_id,
    date,
    clock_in_time,
    clock_out_time,
    working_minutes,
    status,
    created_at,
    updated_at
FROM attendance_records 
WHERE employee_id = /* employeeId */1 
  AND date = /* date */'2024-01-01'