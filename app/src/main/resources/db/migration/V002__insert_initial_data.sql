-- 勤怠管理システム初期データ投入
-- V002__insert_initial_data.sql

-- 管理者ユーザーの作成
INSERT INTO employees (name, employee_number, required_monthly_hours, role) VALUES
('システム管理者', 'ADMIN001', 160, 'ADMIN'),
('田中 太郎', 'MGR001', 170, 'MANAGER'),
('佐藤 花子', 'EMP001', 160, 'EMPLOYEE'),
('鈴木 次郎', 'EMP002', 150, 'EMPLOYEE'),
('高橋 美咲', 'EMP003', 160, 'EMPLOYEE');

-- サンプル勤怠記録の作成（過去1週間分）
INSERT INTO attendance_records (employee_id, date, clock_in_time, clock_out_time, working_minutes, status) VALUES
-- 田中 太郎 (MGR001) の勤怠記録
(2, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '7 days' + TIME '18:00:00', 480, 'PRESENT'),
(2, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '6 days' + TIME '09:15:00', CURRENT_DATE - INTERVAL '6 days' + TIME '18:30:00', 495, 'PRESENT'),
(2, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days' + TIME '08:45:00', CURRENT_DATE - INTERVAL '5 days' + TIME '17:45:00', 480, 'PRESENT'),
(2, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '4 days' + TIME '18:15:00', 495, 'PRESENT'),
(2, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days' + TIME '09:30:00', CURRENT_DATE - INTERVAL '3 days' + TIME '18:30:00', 480, 'PRESENT'),

-- 佐藤 花子 (EMP001) の勤怠記録
(3, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '7 days' + TIME '17:30:00', 450, 'PRESENT'),
(3, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '6 days' + TIME '09:10:00', CURRENT_DATE - INTERVAL '6 days' + TIME '17:40:00', 450, 'PRESENT'),
(3, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days' + TIME '09:05:00', CURRENT_DATE - INTERVAL '5 days' + TIME '17:35:00', 450, 'PRESENT'),
(3, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '4 days' + TIME '17:30:00', 450, 'PRESENT'),
(3, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days' + TIME '09:15:00', CURRENT_DATE - INTERVAL '3 days' + TIME '17:45:00', 450, 'PRESENT'),

-- 鈴木 次郎 (EMP002) の勤怠記録
(4, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days' + TIME '08:30:00', CURRENT_DATE - INTERVAL '7 days' + TIME '17:00:00', 450, 'PRESENT'),
(4, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '6 days' + TIME '08:45:00', CURRENT_DATE - INTERVAL '6 days' + TIME '17:15:00', 450, 'PRESENT'),
(4, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days' + TIME '08:30:00', CURRENT_DATE - INTERVAL '5 days' + TIME '17:00:00', 450, 'PRESENT'),
(4, CURRENT_DATE - INTERVAL '4 days', NULL, NULL, 0, 'ABSENT'),
(4, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days' + TIME '08:30:00', CURRENT_DATE - INTERVAL '3 days' + TIME '17:00:00', 450, 'PRESENT'),

-- 高橋 美咲 (EMP003) の勤怠記録
(5, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '7 days' + TIME '18:00:00', 480, 'PRESENT'),
(5, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '6 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '6 days' + TIME '18:00:00', 480, 'PRESENT'),
(5, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '5 days' + TIME '18:00:00', 480, 'PRESENT'),
(5, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '4 days' + TIME '18:00:00', 480, 'PRESENT'),
(5, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days' + TIME '09:00:00', CURRENT_DATE - INTERVAL '3 days' + TIME '18:00:00', 480, 'PRESENT');

-- サンプル修正申請の作成
INSERT INTO correction_requests (employee_id, original_record_id, requested_clock_in, requested_clock_out, reason, status) VALUES
(4, (SELECT id FROM attendance_records WHERE employee_id = 4 AND date = CURRENT_DATE - INTERVAL '6 days'), 
 CURRENT_DATE - INTERVAL '6 days' + TIME '08:30:00', 
 CURRENT_DATE - INTERVAL '6 days' + TIME '17:30:00', 
 '実際の出勤時間と退勤時間の修正をお願いします。', 
 'PENDING'),
(3, (SELECT id FROM attendance_records WHERE employee_id = 3 AND date = CURRENT_DATE - INTERVAL '5 days'), 
 CURRENT_DATE - INTERVAL '5 days' + TIME '09:00:00', 
 CURRENT_DATE - INTERVAL '5 days' + TIME '17:30:00', 
 '打刻忘れのため、実際の勤務時間で修正をお願いします。', 
 'APPROVED');