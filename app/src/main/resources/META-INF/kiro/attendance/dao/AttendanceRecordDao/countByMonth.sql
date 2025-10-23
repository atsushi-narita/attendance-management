SELECT COUNT(*) 
FROM attendance_records 
WHERE date >= /* yearMonth.atDay(1) */'2024-01-01'
  AND date <= /* yearMonth.atEndOfMonth() */'2024-01-31'