# 勤怠管理ツール - 監視・アラート設定

このディレクトリには、勤怠管理ツールの包括的な監視・アラート設定が含まれています。

## 概要

監視システムは以下の要素で構成されています：

- **CloudWatch メトリクス**: AWS サービスの標準メトリクス
- **カスタムメトリクス**: アプリケーション固有のビジネスメトリクス
- **ログ監視**: エラーパターンとパフォーマンス指標の監視
- **アラート**: 重要度別の通知システム
- **ダッシュボード**: リアルタイム監視画面
- **自動復旧**: 一部の問題に対する自動対応

## ファイル構成

```
monitoring/
├── README.md                    # このファイル
├── custom-metrics.yaml          # カスタムメトリクス定義
└── setup-custom-monitoring.py   # カスタム監視設定スクリプト
```

## セットアップ手順

### 1. 基本監視の設定

```bash
# 基本的な監視・アラート設定をデプロイ
cd infrastructure
./setup-monitoring.sh <environment> <alert-email>

# 例：
./setup-monitoring.sh dev admin@example.com
```

### 2. カスタム監視の設定

```bash
# Python 依存関係のインストール
pip install boto3 pyyaml

# カスタム監視設定の実行
cd monitoring
python setup-custom-monitoring.py <environment>

# 例：
python setup-custom-monitoring.py dev
```

### 3. SNS 通知の確認

1. 指定したメールアドレスに SNS 購読確認メールが送信されます
2. メール内の確認リンクをクリックして通知を有効化してください

## 監視項目

### AWS サービスメトリクス

#### API Gateway

- **リクエスト数**: 総リクエスト数の監視
- **エラー率**: 4xx/5xx エラーの監視
- **レスポンス時間**: API のパフォーマンス監視

#### Lambda 関数

- **実行回数**: 関数の呼び出し頻度
- **エラー数**: 実行エラーの監視
- **実行時間**: パフォーマンス監視
- **スロットリング**: 同時実行制限の監視

#### RDS データベース

- **CPU 使用率**: データベースの負荷監視
- **接続数**: 同時接続数の監視
- **ストレージ容量**: 空き容量の監視

### カスタムメトリクス

#### 勤怠関連

- `clock_in_success/failure`: 出勤打刻の成功/失敗数
- `clock_out_success/failure`: 退勤打刻の成功/失敗数
- `working_hours_daily/monthly`: 日別/月別勤務時間

#### 修正申請関連

- `correction_request_submitted`: 修正申請提出数
- `correction_request_approved/rejected`: 承認/却下数
- `correction_processing_time`: 処理時間

#### システムパフォーマンス

- `database_query_duration`: データベースクエリ実行時間
- `api_response_time`: API レスポンス時間
- `concurrent_users`: 同時接続ユーザー数

#### ビジネスメトリクス

- `daily_active_users`: 日別アクティブユーザー数
- `monthly_active_users`: 月別アクティブユーザー数
- `attendance_rate`: 出勤率
- `overtime_hours`: 残業時間

## アラート設定

### 重要度レベル

#### Critical（緊急）

- 出勤/退勤打刻の大量失敗
- データベースクエリの重大な遅延（5 秒以上）
- API レスポンス時間の重大な遅延（10 秒以上）

#### Warning（警告）

- 修正申請の処理遅延（24 時間以上）
- データベースクエリの軽微な遅延（2 秒以上）
- API レスポンス時間の軽微な遅延（5 秒以上）

#### Info（情報）

- 日別アクティブユーザー数の低下
- 出勤率の低下（80%未満）

### 通知チャネル

1. **Email**: 全レベルのアラート
2. **Slack**: Critical レベルのみ（設定が必要）
3. **SMS**: Critical レベルのみ（設定が必要）

## ダッシュボード

### メインダッシュボード

CloudWatch コンソールで以下の情報を確認できます：

- API Gateway のリクエスト数とエラー率
- Lambda 関数のパフォーマンス
- データベースの状態
- カスタムメトリクスの状況

### アクセス方法

```
https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=attendance-management-<environment>-dashboard
```

## ログ監視

### 監視パターン

1. **勤怠エラー**: `ATTENDANCE_*` パターンのエラーログ
2. **データベースエラー**: `DATABASE_*` パターンのエラーログ
3. **認証失敗**: `AUTH_FAILURE` パターンの警告ログ
4. **スロークエリ**: 2 秒以上のクエリ実行時間

### CloudWatch Insights クエリ

#### 勤怠分析

```sql
fields @timestamp, @message, employee_id, action
| filter @message like /ATTENDANCE/
| stats count() by action, bin(1h)
| sort @timestamp desc
```

#### エラー分析

```sql
fields @timestamp, @message, @requestId
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
```

#### パフォーマンス分析

```sql
fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| filter @type = "REPORT"
| stats avg(@duration), max(@duration), min(@duration) by bin(5m)
```

## 自動復旧

### 対応可能な問題

1. **Lambda スロットリング**: 同時実行数の自動増加
2. **データベース接続過多**: Lambda 関数の再起動
3. **API エラー急増**: ステージング環境での自動ロールバック

### 設定の変更

`custom-metrics.yaml` の `auto_recovery` セクションで自動復旧の動作を設定できます。

## トラブルシューティング

### よくある問題

#### 1. メトリクスが表示されない

- Lambda 関数でカスタムメトリクスを送信しているか確認
- CloudWatch エージェントが正しく設定されているか確認

#### 2. アラートが送信されない

- SNS 購読が確認されているか確認
- アラームの閾値設定が適切か確認

#### 3. ダッシュボードが空白

- メトリクスの名前空間が正しいか確認
- 適切な権限が設定されているか確認

### ログの確認

```bash
# CloudWatch Logs の確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/attendance-management"

# 最新のログイベントを取得
aws logs describe-log-streams --log-group-name "/aws/lambda/attendance-management-dev" --order-by LastEventTime --descending
```

## カスタマイズ

### メトリクスの追加

1. `custom-metrics.yaml` にメトリクス定義を追加
2. アプリケーションコードでメトリクスを送信
3. `setup-custom-monitoring.py` を再実行

### アラート閾値の調整

1. `custom-metrics.yaml` の `alert_thresholds` セクションを編集
2. `setup-custom-monitoring.py` を再実行

### ダッシュボードのカスタマイズ

1. `custom-metrics.yaml` の `dashboard_widgets` セクションを編集
2. `setup-custom-monitoring.py` を再実行

## 運用ガイドライン

### 日次チェック項目

- [ ] ダッシュボードで異常値がないか確認
- [ ] アラート通知の内容を確認
- [ ] エラーログの内容を確認

### 週次チェック項目

- [ ] パフォーマンストレンドの確認
- [ ] 容量使用状況の確認
- [ ] アラート閾値の見直し

### 月次チェック項目

- [ ] ビジネスメトリクスの分析
- [ ] 監視設定の最適化
- [ ] コスト分析と最適化

## サポート

監視設定に関する問題や質問がある場合は、以下の情報を含めて報告してください：

- 環境名（dev/staging/prod）
- エラーメッセージ
- 実行したコマンド
- CloudWatch ログの関連部分
