SELECT 
    id,
    employee_id,
    original_record_id,
    requested_clock_in,
    requested_clock_out,
    reason,
    status,
    request_date,
    processed_date,
    created_at,
    updated_at
FROM correction_requests 
WHERE request_date >= /* startDate */'2024-01-01 00:00:00'
  AND request_date <= /* endDate */'2024-01-31 23:59:59'
ORDER BY request_date DESC