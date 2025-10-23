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
WHERE status = /* status */'PRESENT'
ORDER BY date DESC, employee_id