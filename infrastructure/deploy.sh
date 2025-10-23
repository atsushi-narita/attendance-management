#!/bin/bash

# 勤怠管理ツール - CloudFormation デプロイメントスクリプト

set -e

# 設定
PROJECT_NAME="attendance-management"
REGION="ap-northeast-1"  # 東京リージョン

# 引数チェック
if [ $# -ne 1 ]; then
    echo "使用方法: $0 <environment>"
    echo "環境: dev, staging, prod"
    exit 1
fi

ENVIRONMENT=$1

# 環境の検証
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "エラー: 無効な環境です。dev, staging, prod のいずれかを指定してください。"
    exit 1
fi

echo "=== 勤怠管理ツール インフラストラクチャデプロイメント ==="
echo "環境: $ENVIRONMENT"
echo "リージョン: $REGION"
echo "プロジェクト: $PROJECT_NAME"
echo ""

# パラメータファイルの存在確認
PARAM_FILE="parameters/${ENVIRONMENT}-parameters.json"
if [ ! -f "$PARAM_FILE" ]; then
    echo "エラー: パラメータファイルが見つかりません: $PARAM_FILE"
    exit 1
fi

# CloudFormation テンプレートの検証
echo "1. CloudFormation テンプレートの検証..."
aws cloudformation validate-template --template-body file://cloudformation/main-template.yaml --region $REGION
aws cloudformation validate-template --template-body file://cloudformation/cognito-template.yaml --region $REGION
aws cloudformation validate-template --template-body file://cloudformation/database-template.yaml --region $REGION
aws cloudformation validate-template --template-body file://cloudformation/api-gateway-template.yaml --region $REGION
echo "✓ テンプレート検証完了"

# メインインフラストラクチャのデプロイ
echo ""
echo "2. メインインフラストラクチャのデプロイ..."
MAIN_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-main"
aws cloudformation deploy \
    --template-file cloudformation/main-template.yaml \
    --stack-name $MAIN_STACK_NAME \
    --parameter-overrides file://$PARAM_FILE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags Environment=$ENVIRONMENT Project=$PROJECT_NAME

echo "✓ メインインフラストラクチャデプロイ完了"

# Cognito認証システムのデプロイ
echo ""
echo "3. Cognito認証システムのデプロイ..."
COGNITO_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cognito"
aws cloudformation deploy \
    --template-file cloudformation/cognito-template.yaml \
    --stack-name $COGNITO_STACK_NAME \
    --parameter-overrides file://$PARAM_FILE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags Environment=$ENVIRONMENT Project=$PROJECT_NAME

echo "✓ Cognito認証システムデプロイ完了"

# データベースのデプロイ
echo ""
echo "4. データベースのデプロイ..."
DATABASE_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-database"
aws cloudformation deploy \
    --template-file cloudformation/database-template.yaml \
    --stack-name $DATABASE_STACK_NAME \
    --parameter-overrides file://$PARAM_FILE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags Environment=$ENVIRONMENT Project=$PROJECT_NAME

echo "✓ データベースデプロイ完了"

# API Gateway と Lambda のデプロイ
echo ""
echo "5. API Gateway と Lambda のデプロイ..."
API_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-api"
aws cloudformation deploy \
    --template-file cloudformation/api-gateway-template.yaml \
    --stack-name $API_STACK_NAME \
    --parameter-overrides file://$PARAM_FILE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags Environment=$ENVIRONMENT Project=$PROJECT_NAME

echo "✓ API Gateway と Lambda デプロイ完了"

# デプロイ結果の出力
echo ""
echo "=== デプロイメント完了 ==="
echo ""
echo "スタック情報:"
echo "- メインスタック: $MAIN_STACK_NAME"
echo "- Cognitoスタック: $COGNITO_STACK_NAME"
echo "- データベーススタック: $DATABASE_STACK_NAME"
echo "- APIスタック: $API_STACK_NAME"
echo ""

# 重要な出力値の取得
echo "重要な設定値:"
API_URL=$(aws cloudformation describe-stacks --stack-name $API_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $COGNITO_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $COGNITO_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $DATABASE_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text)

echo "- API Gateway URL: $API_URL"
echo "- Cognito User Pool ID: $USER_POOL_ID"
echo "- Cognito User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "- Database Endpoint: $DB_ENDPOINT"
echo ""
echo "フロントエンド設定用の環境変数:"
echo "NUXT_PUBLIC_API_URL=$API_URL"
echo "NUXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID"
echo "NUXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
echo "NUXT_PUBLIC_REGION=$REGION"
echo ""
echo "デプロイメントが正常に完了しました！"