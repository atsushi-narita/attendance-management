# AWS 本番環境デプロイメント手順書

## 📋 目次

1. [事前準備](#事前準備)
2. [AWS 環境セットアップ](#aws環境セットアップ)
3. [セキュリティ設定](#セキュリティ設定)
4. [インフラストラクチャデプロイ](#インフラストラクチャデプロイ)
5. [アプリケーションデプロイ](#アプリケーションデプロイ)
6. [動作確認](#動作確認)
7. [監視設定](#監視設定)
8. [運用開始](#運用開始)

---

## 🚀 事前準備

### 1.1 必要なツールのインストール

```bash
# AWS CLI v2のインストール確認
aws --version
# 出力例: aws-cli/2.x.x Python/3.x.x

# Node.js 18+のインストール確認
node --version
# 出力例: v18.x.x

# Java 17+のインストール確認
java --version
# 出力例: openjdk 17.x.x

# Gradleのインストール確認
./gradlew --version
```

### 1.2 プロジェクトの準備

```bash
# プロジェクトをクローン
git clone <repository-url>
cd attendance-management

# 依存関係のインストール
cd frontend
npm install
cd ../app
./gradlew build
cd ..
```

### 1.3 環境変数の設定

```bash
# 環境変数ファイルを作成
cat > .env.production << EOF
# AWS設定
AWS_REGION=ap-northeast-1
AWS_PROFILE=production

# データベース設定
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=attendance_prod
DB_USERNAME=attendance_admin

# Cognito設定
COGNITO_DOMAIN=attendance-auth-prod
USER_POOL_NAME=AttendanceUserPool-Prod

# 通知設定
ALERT_EMAIL=admin@yourdomain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# ドメイン設定（オプション）
CUSTOM_DOMAIN=attendance.yourdomain.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
EOF

# 環境変数を読み込み
source .env.production
```

---

## 🔧 AWS 環境セットアップ

### 2.1 AWS 認証情報の設定

```bash
# AWS CLIの設定
aws configure --profile production
# AWS Access Key ID: [YOUR_ACCESS_KEY]
# AWS Secret Access Key: [YOUR_SECRET_KEY]
# Default region name: ap-northeast-1
# Default output format: json

# 認証確認
aws sts get-caller-identity --profile production
```

### 2.2 必要な AWS 権限の確認

デプロイに必要な権限を IAM ユーザーまたはロールに付与：

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
        "cognito-identity:*",
        "iam:*",
        "cloudwatch:*",
        "logs:*",
        "sns:*",
        "elasticache:*",
        "ec2:*",
        "route53:*",
        "acm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2.3 S3 バケットの作成（デプロイ用）

```bash
# CloudFormationテンプレート用バケット
aws s3 mb s3://attendance-cloudformation-templates-${AWS_REGION} --region ${AWS_REGION}

# Lambda関数パッケージ用バケット
aws s3 mb s3://attendance-lambda-packages-${AWS_REGION} --region ${AWS_REGION}
```

---

## 🔒 セキュリティ設定

### 3.1 セキュリティスキャンの実行

```bash
cd infrastructure
chmod +x security-scan.sh
./security-scan.sh
```

### 3.2 SSL 証明書の取得（カスタムドメイン使用時）

```bash
# ACMで証明書をリクエスト（us-east-1リージョンでCloudFront用）
aws acm request-certificate \
  --domain-name ${CUSTOM_DOMAIN} \
  --subject-alternative-names "*.${CUSTOM_DOMAIN}" \
  --validation-method DNS \
  --region us-east-1

# 証明書ARNを取得
CERTIFICATE_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='${CUSTOM_DOMAIN}'].CertificateArn" \
  --output text)

echo "Certificate ARN: ${CERTIFICATE_ARN}"
```

### 3.3 KMS キーの作成

```bash
# データベース暗号化用KMSキー
aws kms create-key \
  --description "Attendance Management Database Encryption Key" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT

# キーIDを取得
KMS_KEY_ID=$(aws kms list-keys --query "Keys[0].KeyId" --output text)
echo "KMS Key ID: ${KMS_KEY_ID}"
```

---

## 🏗️ インフラストラクチャデプロイ

### 4.1 CloudFormation テンプレートのアップロード

```bash
# テンプレートをS3にアップロード
aws s3 cp cloudformation/ s3://attendance-cloudformation-templates-${AWS_REGION}/ --recursive
```

### 4.2 VPC とネットワークの作成

```bash
# ネットワークスタックのデプロイ
aws cloudformation deploy \
  --template-file cloudformation/network-stack.yml \
  --stack-name attendance-network-prod \
  --parameter-overrides \
    Environment=prod \
    VpcCidr=10.0.0.0/16 \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION}
```

### 4.3 データベースの作成

```bash
# データベーススタックのデプロイ
aws cloudformation deploy \
  --template-file cloudformation/database-stack.yml \
  --stack-name attendance-database-prod \
  --parameter-overrides \
    Environment=prod \
    DBPassword=${DB_PASSWORD} \
    DBName=${DB_NAME} \
    DBUsername=${DB_USERNAME} \
    KMSKeyId=${KMS_KEY_ID} \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION}

# データベース接続確認
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name attendance-database-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
  --output text)

echo "Database Endpoint: ${DB_ENDPOINT}"
```

### 4.4 Cognito ユーザープールの作成

```bash
# 認証スタックのデプロイ
aws cloudformation deploy \
  --template-file cloudformation/auth-stack.yml \
  --stack-name attendance-auth-prod \
  --parameter-overrides \
    Environment=prod \
    CognitoDomain=${COGNITO_DOMAIN} \
    UserPoolName=${USER_POOL_NAME} \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION}

# Cognito設定を取得
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name attendance-auth-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name attendance-auth-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

echo "User Pool ID: ${USER_POOL_ID}"
echo "User Pool Client ID: ${USER_POOL_CLIENT_ID}"
```

---

## 📱 アプリケーションデプロイ

### 5.1 バックエンドアプリケーションのビルドとデプロイ

```bash
cd app

# アプリケーションのビルド
./gradlew clean build -x test

# Lambda関数パッケージの作成
./gradlew buildZip

# S3にアップロード
aws s3 cp build/distributions/app.zip \
  s3://attendance-lambda-packages-${AWS_REGION}/app-$(date +%Y%m%d-%H%M%S).zip

# Lambda関数スタックのデプロイ
cd ../infrastructure
aws cloudformation deploy \
  --template-file cloudformation/lambda-stack.yml \
  --stack-name attendance-lambda-prod \
  --parameter-overrides \
    Environment=prod \
    S3Bucket=attendance-lambda-packages-${AWS_REGION} \
    S3Key=app-$(date +%Y%m%d-%H%M%S).zip \
    DBEndpoint=${DB_ENDPOINT} \
    UserPoolId=${USER_POOL_ID} \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region ${AWS_REGION}
```

### 5.2 API Gateway の作成

```bash
# API Gatewayスタックのデプロイ
aws cloudformation deploy \
  --template-file cloudformation/api-stack.yml \
  --stack-name attendance-api-prod \
  --parameter-overrides \
    Environment=prod \
    UserPoolId=${USER_POOL_ID} \
    UserPoolClientId=${USER_POOL_CLIENT_ID} \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION}

# API Gateway URLを取得
API_GATEWAY_URL=$(aws cloudformation describe-stacks \
  --stack-name attendance-api-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

echo "API Gateway URL: ${API_GATEWAY_URL}"
```

### 5.3 フロントエンドアプリケーションのビルドとデプロイ

```bash
cd ../frontend

# 環境変数の設定
cat > .env.production << EOF
NUXT_PUBLIC_AWS_REGION=${AWS_REGION}
NUXT_PUBLIC_COGNITO_USER_POOL_ID=${USER_POOL_ID}
NUXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
NUXT_PUBLIC_API_GATEWAY_URL=${API_GATEWAY_URL}
EOF

# アプリケーションのビルド
npm run build

# CDNスタックのデプロイ
cd ../infrastructure
aws cloudformation deploy \
  --template-file cloudformation/cdn-cache-stack.yml \
  --stack-name attendance-cdn-prod \
  --parameter-overrides \
    Environment=prod \
    ApiGatewayId=$(echo ${API_GATEWAY_URL} | cut -d'/' -f3 | cut -d'.' -f1) \
    CertificateArn=${CERTIFICATE_ARN} \
    DomainName=${CUSTOM_DOMAIN} \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION}

# S3バケット名とCloudFront IDを取得
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name attendance-cdn-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucketName`].OutputValue' \
  --output text)

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
  --stack-name attendance-cdn-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

# フロントエンドファイルをS3にアップロード
cd ../frontend
aws s3 sync .output/public/ s3://${S3_BUCKET}/ --delete

# CloudFrontキャッシュを無効化
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_ID} \
  --paths "/*"

echo "S3 Bucket: ${S3_BUCKET}"
echo "CloudFront Distribution ID: ${CLOUDFRONT_ID}"
```

---

## ✅ 動作確認

### 6.1 API エンドポイントのテスト

```bash
# ヘルスチェック
curl -f "${API_GATEWAY_URL}/health"

# 認証なしエンドポイントのテスト
curl -f "${API_GATEWAY_URL}/api/public/status"
```

### 6.2 フロントエンドの確認

```bash
# CloudFront URLを取得
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name attendance-cdn-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
  --output text)

echo "Frontend URL: https://${CLOUDFRONT_URL}"

# フロントエンドアクセステスト
curl -f "https://${CLOUDFRONT_URL}"
```

### 6.3 データベース接続テスト

```bash
# Lambda関数を直接実行してDB接続をテスト
aws lambda invoke \
  --function-name attendance-health-check-prod \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json

cat response.json
```

### 6.4 E2E テストの実行

```bash
cd frontend

# テスト環境変数を設定
export PLAYWRIGHT_BASE_URL=https://${CLOUDFRONT_URL}

# E2Eテストを実行
npm run test:e2e
```

---

## 📊 監視設定

### 7.1 監視スタックのデプロイ

```bash
cd infrastructure

aws cloudformation deploy \
  --template-file cloudformation/monitoring-stack.yml \
  --stack-name attendance-monitoring-prod \
  --parameter-overrides \
    Environment=prod \
    StackName=attendance-management-prod \
    AlertEmail=${ALERT_EMAIL} \
    SlackWebhookUrl=${SLACK_WEBHOOK_URL} \
    CloudFrontDistributionId=${CLOUDFRONT_ID} \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region ${AWS_REGION}
```

### 7.2 ダッシュボードの確認

```bash
# ダッシュボードURLを取得
DASHBOARD_URL=$(aws cloudformation describe-stacks \
  --stack-name attendance-monitoring-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
  --output text)

echo "CloudWatch Dashboard: ${DASHBOARD_URL}"
```

### 7.3 アラートのテスト

```bash
# テストアラームを発生させる
aws cloudwatch put-metric-data \
  --namespace "attendance-management-prod/Application" \
  --metric-data MetricName=ErrorCount,Value=10,Unit=Count

echo "テストアラートを送信しました。メールとSlackを確認してください。"
```

---

## 🎯 運用開始

### 8.1 管理者ユーザーの作成

```bash
# Cognitoで管理者ユーザーを作成
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username admin \
  --user-attributes Name=email,Value=${ALERT_EMAIL} Name=email_verified,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# 管理者グループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id ${USER_POOL_ID} \
  --username admin \
  --group-name admins
```

### 8.2 初期データの投入

```bash
# データベースに初期データを投入するLambda関数を実行
aws lambda invoke \
  --function-name attendance-data-migration-prod \
  --payload '{"action":"initialize"}' \
  response.json

cat response.json
```

### 8.3 バックアップの設定確認

```bash
# RDSの自動バックアップ設定を確認
aws rds describe-db-instances \
  --db-instance-identifier attendance-management-db-prod \
  --query 'DBInstances[0].BackupRetentionPeriod'

# 手動スナップショットを作成
aws rds create-db-snapshot \
  --db-instance-identifier attendance-management-db-prod \
  --db-snapshot-identifier attendance-initial-snapshot-$(date +%Y%m%d)
```

### 8.4 DNS 設定（カスタムドメイン使用時）

```bash
# Route53でCNAMEレコードを作成
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "'${CUSTOM_DOMAIN}'",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'${CLOUDFRONT_URL}'"}]
      }
    }]
  }'
```

---

## 📝 デプロイメント完了チェックリスト

### ✅ インフラストラクチャ

- [ ] VPC とサブネットの作成完了
- [ ] RDS データベースの作成と接続確認
- [ ] Cognito ユーザープールの設定完了
- [ ] Lambda 関数のデプロイ完了
- [ ] API Gateway の設定完了
- [ ] S3 バケットと CloudFront の設定完了

### ✅ アプリケーション

- [ ] バックエンド API の動作確認
- [ ] フロントエンドの表示確認
- [ ] 認証機能の動作確認
- [ ] データベース操作の確認

### ✅ セキュリティ

- [ ] SSL 証明書の設定完了
- [ ] セキュリティグループの設定確認
- [ ] IAM ロールと権限の確認
- [ ] データ暗号化の確認

### ✅ 監視・運用

- [ ] CloudWatch ダッシュボードの確認
- [ ] アラート通知の動作確認
- [ ] ログ出力の確認
- [ ] バックアップ設定の確認

### ✅ 動作テスト

- [ ] ユーザー登録・ログイン
- [ ] 打刻機能（出勤・退勤）
- [ ] 勤務記録の表示
- [ ] 修正申請機能
- [ ] 管理者機能

---

## 🆘 トラブルシューティング

### よくある問題と解決方法

#### 1. CloudFormation デプロイエラー

```bash
# スタックイベントを確認
aws cloudformation describe-stack-events \
  --stack-name attendance-management-prod \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'

# ロールバック
aws cloudformation cancel-update-stack \
  --stack-name attendance-management-prod
```

#### 2. Lambda 関数エラー

```bash
# ログを確認
aws logs tail /aws/lambda/attendance-management-attendance-prod --follow

# 関数を再デプロイ
aws lambda update-function-code \
  --function-name attendance-management-attendance-prod \
  --s3-bucket attendance-lambda-packages-${AWS_REGION} \
  --s3-key app-latest.zip
```

#### 3. データベース接続エラー

```bash
# セキュリティグループを確認
aws ec2 describe-security-groups \
  --group-names attendance-management-db-sg-prod

# RDS状態を確認
aws rds describe-db-instances \
  --db-instance-identifier attendance-management-db-prod
```

---

## 📞 サポート情報

### 緊急時連絡先

- **システム管理者**: admin@yourdomain.com
- **開発チーム**: dev-team@yourdomain.com
- **24 時間サポート**: emergency@yourdomain.com

### 有用なリンク

- [AWS CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
- [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
- [AWS RDS Console](https://console.aws.amazon.com/rds/)
- [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/)

---

**🎉 デプロイメント完了！**

システムが正常にデプロイされ、本番環境で稼働開始しました。
定期的な監視とメンテナンスを実施し、安定した運用を継続してください。
