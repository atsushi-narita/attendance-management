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
WHERE employee_id = /* employeeId */1
ORDER BY request_date DESC