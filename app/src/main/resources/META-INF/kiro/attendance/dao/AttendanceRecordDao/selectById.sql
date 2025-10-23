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
WHERE id = /* id */1