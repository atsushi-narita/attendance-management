# 🚀 AWS 本番環境 クイックデプロイガイド

## 📋 概要

勤怠管理システムを AWS 本番環境に迅速にデプロイするための簡潔な手順書です。

## ⚡ クイックスタート（5 分で開始）

### 1. 環境準備

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd attendance-management

# 2. 環境変数設定
export AWS_REGION=ap-northeast-1
export DB_PASSWORD=$(openssl rand -base64 32)
export ALERT_EMAIL=admin@yourdomain.com

# 3. AWS認証確認
aws sts get-caller-identity
```

### 2. 基本インフラデプロイ

```bash
# 簡単デプロイスクリプト実行
./deploy-to-aws.sh
```

### 3. 完全デプロイ（詳細版）

詳細な手順は `AWS-PRODUCTION-DEPLOYMENT.md` を参照してください。

## 📁 作成されたファイル一覧

### デプロイメント関連

- `AWS-PRODUCTION-DEPLOYMENT.md` - 詳細なデプロイ手順書
- `deploy-to-aws.sh` - 簡単デプロイスクリプト
- `infrastructure/deploy-production.sh` - 完全自動デプロイスクリプト
- `infrastructure/security-scan.sh` - セキュリティスキャンスクリプト

### CloudFormation テンプレート

- `infrastructure/cloudformation/network-stack.yml` - VPC・ネットワーク
- `infrastructure/cloudformation/database-stack.yml` - RDS・データベース
- `infrastructure/cloudformation/cdn-cache-stack.yml` - CloudFront・キャッシュ
- `infrastructure/cloudformation/monitoring-stack.yml` - 監視・アラート

### パフォーマンス最適化

- `frontend/nuxt.config.ts` - Nuxt.js 最適化設定
- `frontend/scripts/performance-optimization.js` - パフォーマンス分析
- `app/src/main/java/com/attendance/config/PerformanceConfig.java` - Lambda 最適化

### テスト・品質保証

- `frontend/e2e/` - E2E テストスイート（5 ファイル）
- `frontend/playwright.config.ts` - Playwright テスト設定
- `frontend/test-integration-report.md` - 統合テストレポート

## 🎯 デプロイメント段階

### Phase 1: 基本インフラ（必須）

1. ✅ ネットワーク（VPC、サブネット）
2. ✅ データベース（RDS PostgreSQL）
3. ⏳ 認証（Cognito）
4. ⏳ Lambda 関数
5. ⏳ API Gateway

### Phase 2: フロントエンド（必須）

1. ⏳ S3 バケット
2. ⏳ CloudFront CDN
3. ⏳ フロントエンドビルド・デプロイ

### Phase 3: 監視・運用（推奨）

1. ⏳ CloudWatch 監視
2. ⏳ SNS 通知
3. ⏳ セキュリティスキャン

## 🔧 必要な権限

### AWS IAM ポリシー（最小権限）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "apigateway:*",
        "rds:*",
        "s3:*",
        "cloudfront:*",
        "cognito-idp:*",
        "iam:*",
        "cloudwatch:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## 💰 コスト見積もり（月額）

### 最小構成

- RDS t3.micro: $15
- Lambda: $5
- S3 + CloudFront: $10
- **合計: 約$30/月**

### 本番推奨構成

- RDS t3.small + Multi-AZ: $50
- Lambda + API Gateway: $20
- S3 + CloudFront: $15
- ElastiCache: $15
- **合計: 約$100/月**

## 🆘 トラブルシューティング

### よくある問題

1. **AWS 認証エラー**

   ```bash
   aws configure
   aws sts get-caller-identity
   ```

2. **CloudFormation エラー**

   ```bash
   aws cloudformation describe-stack-events --stack-name attendance-network-prod
   ```

3. **権限エラー**
   - IAM ポリシーを確認
   - 必要な権限を追加

### サポート

- 📧 技術サポート: admin@yourdomain.com
- 📖 詳細ドキュメント: `AWS-PRODUCTION-DEPLOYMENT.md`
- 🔍 セキュリティ: `infrastructure/security-scan.sh`

## ✅ デプロイ完了チェックリスト

### 基本機能

- [ ] データベース接続確認
- [ ] API エンドポイント動作確認
- [ ] フロントエンド表示確認
- [ ] ユーザー認証動作確認

### セキュリティ

- [ ] HTTPS 通信確認
- [ ] データベース暗号化確認
- [ ] セキュリティグループ設定確認
- [ ] IAM 権限最小化確認

### 監視・運用

- [ ] CloudWatch 監視設定
- [ ] アラート通知設定
- [ ] バックアップ設定確認
- [ ] ログ出力確認

---

## 🎉 次のステップ

1. **完全デプロイ**: `AWS-PRODUCTION-DEPLOYMENT.md` の手順に従って全機能をデプロイ
2. **テスト実行**: E2E テストで動作確認
3. **監視設定**: CloudWatch・SNS 通知の設定
4. **運用開始**: ユーザー登録・システム利用開始

**成功をお祈りします！** 🚀
