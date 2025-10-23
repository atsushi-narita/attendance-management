SELECT COALESCE(SUM(working_minutes), 0) 
FROM attendance_records 
WHERE employee_id = /* employeeId */1
  AND date >= /* yearMonth.atDay(1) */'2024-01-01'
  AND date <= /* yearMonth.atEndOfMonth() */'2024-01-31'
  AND status = 'PRESENT'