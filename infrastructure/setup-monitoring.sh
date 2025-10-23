#!/bin/bash

# 勤怠管理ツール - 監視・アラート設定スクリプト

set -e

# 設定
PROJECT_NAME="attendance-management"
REGION="ap-northeast-1"  # 東京リージョン

# 引数チェック
if [ $# -ne 2 ]; then
    echo "使用方法: $0 <environment> <alert-email>"
    echo "環境: dev, staging, prod"
    echo "アラートメール: 通知を受信するメールアドレス"
    exit 1
fi

ENVIRONMENT=$1
ALERT_EMAIL=$2

# 環境の検証
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "エラー: 無効な環境です。dev, staging, prod のいずれかを指定してください。"
    exit 1
fi

# メールアドレスの簡単な検証
if [[ ! "$ALERT_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    echo "エラー: 無効なメールアドレス形式です。"
    exit 1
fi

echo "=== 勤怠管理ツール 監視・アラート設定 ==="
echo "環境: $ENVIRONMENT"
echo "リージョン: $REGION"
echo "プロジェクト: $PROJECT_NAME"
echo "アラート通知先: $ALERT_EMAIL"
echo ""

# CloudFormation テンプレートの検証
echo "1. CloudFormation テンプレートの検証..."
aws cloudformation validate-template --template-body file://cloudformation/monitoring-template.yaml --region $REGION
echo "✓ 監視テンプレート検証完了"

# 前提条件の確認
echo ""
echo "2. 前提条件の確認..."
REQUIRED_STACKS=(
    "${PROJECT_NAME}-${ENVIRONMENT}-main"
    "${PROJECT_NAME}-${ENVIRONMENT}-api"
    "${PROJECT_NAME}-${ENVIRONMENT}-database"
)

for stack in "${REQUIRED_STACKS[@]}"; do
    if ! aws cloudformation describe-stacks --stack-name $stack --region $REGION >/dev/null 2>&1; then
        echo "エラー: 必要なスタック ($stack) が見つかりません。"
        echo "先に基本インフラストラクチャをデプロイしてください。"
        exit 1
    fi
done
echo "✓ 前提条件確認完了"

# 監視・アラート設定のデプロイ
echo ""
echo "3. 監視・アラート設定のデプロイ..."
MONITORING_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-monitoring"

# パラメータの準備
TEMP_PARAM_FILE=$(mktemp)
cat > "$TEMP_PARAM_FILE" << EOF
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "$ENVIRONMENT"
  },
  {
    "ParameterKey": "ProjectName",
    "ParameterValue": "$PROJECT_NAME"
  },
  {
    "ParameterKey": "AlertEmail",
    "ParameterValue": "$ALERT_EMAIL"
  }
]
EOF

aws cloudformation deploy \
    --template-file cloudformation/monitoring-template.yaml \
    --stack-name $MONITORING_STACK_NAME \
    --parameter-overrides file://$TEMP_PARAM_FILE \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --tags Environment=$ENVIRONMENT Project=$PROJECT_NAME

# 一時ファイルの削除
rm "$TEMP_PARAM_FILE"

echo "✓ 監視・アラート設定デプロイ完了"

# デプロイ結果の出力
echo ""
echo "=== 監視・アラート設定完了 ==="
echo ""
echo "スタック情報:"
echo "- 監視スタック: $MONITORING_STACK_NAME"
echo ""

# 重要な出力値の取得
echo "監視・アラート情報:"
DASHBOARD_URL=$(aws cloudformation describe-stacks --stack-name $MONITORING_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' --output text)
ALERT_TOPIC_ARN=$(aws cloudformation describe-stacks --stack-name $MONITORING_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`AlertTopicArn`].OutputValue' --output text)

echo "- CloudWatch ダッシュボード: $DASHBOARD_URL"
echo "- SNS アラートトピック: $ALERT_TOPIC_ARN"
echo "- アラート通知先: $ALERT_EMAIL"
echo ""

# 設定されたアラームの一覧表示
echo "設定されたアラーム:"
aws cloudwatch describe-alarms \
    --alarm-name-prefix "${PROJECT_NAME}-${ENVIRONMENT}" \
    --region $REGION \
    --query 'MetricAlarms[*].[AlarmName,StateValue,AlarmDescription]' \
    --output table

echo ""
echo "=== 次のステップ ==="
echo "1. メールアドレス ($ALERT_EMAIL) に送信された SNS 購読確認メールを確認してください"
echo "2. 確認リンクをクリックしてアラート通知を有効化してください"
echo "3. CloudWatch ダッシュボードでシステムの状態を確認してください: $DASHBOARD_URL"
echo "4. 必要に応じて追加のカスタムメトリクスやアラームを設定してください"
echo ""

# CloudWatch Insights のクエリ例を表示
echo "=== CloudWatch Insights クエリ例 ==="
echo ""
echo "API Gateway エラーログ検索:"
echo "fields @timestamp, @message"
echo "| filter @message like /ERROR/"
echo "| sort @timestamp desc"
echo "| limit 100"
echo ""
echo "Lambda 関数パフォーマンス分析:"
echo "fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed"
echo "| filter @type = \"REPORT\""
echo "| stats avg(@duration), max(@duration), min(@duration) by bin(5m)"
echo ""

echo "監視・アラート設定が正常に完了しました！"