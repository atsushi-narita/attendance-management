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
WHERE date >= /* yearMonth.atDay(1) */'2024-01-01'
  AND date <= /* yearMonth.atEndOfMonth() */'2024-01-31'
ORDER BY employee_id, date