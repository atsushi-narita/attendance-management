-- 勤怠管理システム初期スキーマ作成
-- V001__create_initial_schema.sql

-- employees テーブル
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    required_monthly_hours INTEGER NOT NULL CHECK (required_monthly_hours BETWEEN 140 AND 180),
    role VARCHAR(20) NOT NULL CHECK (role IN ('EMPLOYEE', 'MANAGER', 'ADMIN')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- employees テーブルのインデックス
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_employees_role ON employees(role);

-- attendance_records テーブル
CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    working_minutes BIGINT DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'PARTIAL')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- attendance_records テーブルのインデックス
CREATE INDEX idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(date);
CREATE INDEX idx_attendance_records_employee_date ON attendance_records(employee_id, date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- correction_requests テーブル
CREATE TABLE correction_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    original_record_id BIGINT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    requested_clock_in TIMESTAMP,
    requested_clock_out TIMESTAMP,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- correction_requests テーブルのインデックス
CREATE INDEX idx_correction_requests_employee_id ON correction_requests(employee_id);
CREATE INDEX idx_correction_requests_original_record_id ON correction_requests(original_record_id);
CREATE INDEX idx_correction_requests_status ON correction_requests(status);
CREATE INDEX idx_correction_requests_request_date ON correction_requests(request_date);

-- updated_at カラムの自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_at自動更新トリガーを設定
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_correction_requests_updated_at 
    BEFORE UPDATE ON correction_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();