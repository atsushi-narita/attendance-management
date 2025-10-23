# 勤怠管理システム - 本番デプロイメントガイド

## 概要

このガイドでは、勤怠管理システムを本番環境にデプロイするための手順を説明します。システムは AWS クラウド上に構築され、高可用性、セキュリティ、パフォーマンスを重視した設計となっています。

## アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway   │    │   RDS/PostgreSQL│
│   (CDN + WAF)   │◄──►│   + Lambda      │◄──►│   (Database)    │
│                 │    │   Functions     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │   Cognito       │    │   ElastiCache   │
│   (Static)      │    │   (Auth)        │    │   (Cache)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 前提条件

### 必要なツール

- AWS CLI v2.x
- Node.js 18.x+
- Java 17+
- Gradle 7.x+
- Git

### AWS 権限

デプロイには以下の AWS サービスへの権限が必要です：

- CloudFormation
- Lambda
- API Gateway
- RDS
- S3
- CloudFront
- Cognito
- IAM
- CloudWatch
- SNS

### 環境変数

以下の環境変数を設定してください：

```bash
export AWS_REGION=ap-northeast-1
export DB_PASSWORD=your-secure-database-password
export COGNITO_DOMAIN=your-cognito-domain
export ALERT_EMAIL=admin@yourdomain.com
export SLACK_WEBHOOK_URL=https://hooks.slack.com/... # オプション
```

## デプロイメント手順

### 1. セキュリティスキャン実行

```bash
cd infrastructure
chmod +x security-scan.sh
./security-scan.sh
```

セキュリティスキャンが成功することを確認してください。

### 2. 本番デプロイメント実行

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

デプロイメントスクリプトは以下の処理を自動実行します：

1. **前提条件チェック**

   - AWS CLI 設定確認
   - 必要な環境変数確認
   - 権限確認

2. **セキュリティスキャン**

   - インフラストラクチャセキュリティ
   - アプリケーションセキュリティ
   - 依存関係セキュリティ

3. **バックアップ作成**

   - RDS スナップショット
   - CloudFormation テンプレートバックアップ

4. **インフラストラクチャデプロイ**

   - メインスタック（RDS、Lambda、API Gateway、Cognito）
   - CDN・キャッシュスタック（CloudFront、S3、ElastiCache）

5. **アプリケーションデプロイ**

   - バックエンド（Lambda 関数）
   - フロントエンド（S3 + CloudFront）

6. **ヘルスチェック**

   - API エンドポイント確認
   - フロントエンド確認

7. **監視設定**
   - CloudWatch アラーム
   - SNS 通知
   - ダッシュボード

### 3. デプロイメント後の確認

デプロイメント完了後、以下を確認してください：

#### システム URL

- **フロントエンド**: `https://[CloudFront-Domain]`
- **API**: `https://[API-Gateway-Domain]/prod`

#### 監視ダッシュボード

- **CloudWatch**: AWS コンソール > CloudWatch > ダッシュボード
- **アラーム**: 設定したメールアドレスに通知が届くことを確認

#### 機能テスト

1. ユーザー登録・ログイン
2. 打刻機能（出勤・退勤）
3. 勤務記録確認
4. 修正申請（従業員）
5. 従業員管理（管理者）
6. 修正申請承認（管理者）

## パフォーマンス最適化

### フロントエンド最適化

```bash
cd frontend
npm run optimize
```

最適化スクリプトは以下を実行します：

- バンドルサイズ分析
- 画像最適化提案
- Service Worker 生成
- パフォーマンスレポート作成

### バックエンド最適化

- **Lambda コールドスタート対策**: 接続プール事前ウォーミング
- **データベース最適化**: インデックス、クエリ最適化
- **キャッシュ戦略**: ElastiCache Redis クラスター

### CDN 最適化

- **静的アセット**: 長期キャッシュ（1 年）
- **API レスポンス**: キャッシュ無効
- **画像**: 中期キャッシュ（1 ヶ月）
- **圧縮**: Gzip/Brotli 有効

## セキュリティ対策

### 認証・認可

- **AWS Cognito**: ユーザー認証
- **JWT トークン**: API アクセス制御
- **役割ベースアクセス**: 従業員/管理者/システム管理者

### データ保護

- **暗号化（保存時）**: RDS、S3、ElastiCache
- **暗号化（転送時）**: HTTPS/TLS 1.2+
- **データベース**: VPC 内プライベートサブネット

### ネットワークセキュリティ

- **WAF**: CloudFront 統合
- **セキュリティグループ**: 最小権限原則
- **VPC**: ネットワーク分離

### 監査・ログ

- **CloudTrail**: API 呼び出し記録
- **CloudWatch Logs**: アプリケーションログ
- **アクセスログ**: CloudFront、API Gateway

## 監視・アラート

### CloudWatch アラーム

- Lambda エラー率・実行時間
- RDS CPU・接続数
- API Gateway エラー率
- CloudFront エラー率

### 通知設定

- **メール**: 重要なアラート
- **Slack**: リアルタイム通知（オプション）

### ダッシュボード

- システム全体の健全性
- パフォーマンスメトリクス
- エラー率・レスポンス時間

## バックアップ・災害復旧

### 自動バックアップ

- **RDS**: 日次自動バックアップ（7 日間保持）
- **手動スナップショット**: デプロイ前作成

### 復旧手順

1. RDS スナップショットからの復元
2. Lambda 関数の前バージョンへのロールバック
3. CloudFront キャッシュ無効化

## トラブルシューティング

### よくある問題

#### デプロイメント失敗

```bash
# ログ確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/attendance"

# スタック状態確認
aws cloudformation describe-stacks --stack-name attendance-management-prod
```

#### API エラー

```bash
# Lambda ログ確認
aws logs tail /aws/lambda/attendance-management-attendance-prod --follow

# API Gateway ログ確認
aws logs tail /aws/apigateway/attendance-management-api-prod --follow
```

#### データベース接続エラー

```bash
# RDS 状態確認
aws rds describe-db-instances --db-instance-identifier attendance-management-db-prod

# セキュリティグループ確認
aws ec2 describe-security-groups --group-names attendance-management-db-sg-prod
```

### ロールバック手順

緊急時のロールバック：

```bash
# 前回のバックアップから復元
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier attendance-management-db-prod-rollback \
  --db-snapshot-identifier $(cat .last-backup)

# Lambda 関数を前バージョンに戻す
aws lambda update-alias \
  --function-name attendance-management-attendance-prod \
  --name LIVE \
  --function-version $PREVIOUS_VERSION
```

## 運用・保守

### 定期メンテナンス

- **月次**: セキュリティパッチ適用
- **四半期**: パフォーマンス分析・最適化
- **年次**: 災害復旧テスト

### スケーリング

- **Lambda**: 自動スケーリング
- **RDS**: 必要に応じて手動スケールアップ
- **ElastiCache**: クラスター拡張

### コスト最適化

- **Reserved Instances**: RDS 長期利用
- **CloudWatch**: 不要なログ削除
- **S3**: ライフサイクルポリシー

## サポート・連絡先

### 技術サポート

- **システム管理者**: admin@yourdomain.com
- **開発チーム**: dev-team@yourdomain.com

### 緊急時連絡先

- **24 時間サポート**: emergency@yourdomain.com
- **Slack**: #attendance-system-alerts

---

## 付録

### A. 環境変数一覧

| 変数名            | 説明                   | 必須 | デフォルト値   |
| ----------------- | ---------------------- | ---- | -------------- |
| AWS_REGION        | AWS リージョン         | ✅   | ap-northeast-1 |
| DB_PASSWORD       | データベースパスワード | ✅   | -              |
| COGNITO_DOMAIN    | Cognito ドメイン       | ✅   | -              |
| ALERT_EMAIL       | アラート通知メール     | ✅   | -              |
| SLACK_WEBHOOK_URL | Slack 通知 URL         | ❌   | -              |

### B. ポート・プロトコル一覧

| サービス   | ポート | プロトコル | 用途         |
| ---------- | ------ | ---------- | ------------ |
| HTTPS      | 443    | TCP        | Web アクセス |
| PostgreSQL | 5432   | TCP        | データベース |
| Redis      | 6379   | TCP        | キャッシュ   |

### C. 参考リンク

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)
- [Nuxt.js Deployment Guide](https://nuxt.com/docs/getting-started/deployment)
