#!/bin/bash

# 勤怠管理ツール - CI/CD パイプライン デプロイメントスクリプト

set -e

# 設定
PROJECT_NAME="attendance-management"
REGION="ap-northeast-1"  # 東京リージョン

# 引数チェック
if [ $# -ne 3 ]; then
    echo "使用方法: $0 <environment> <github-repo> <github-token>"
    echo "環境: dev, staging, prod"
    echo "GitHub リポジトリ: owner/repo 形式"
    echo "GitHub トークン: Personal Access Token"
    exit 1
fi

ENVIRONMENT=$1
GITHUB_REPO=$2
GITHUB_TOKEN=$3

# 環境の検証
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "エラー: 無効な環境です。dev, staging, prod のいずれかを指定してください。"
    exit 1
fi

echo "=== 勤怠管理ツール CI/CD パイプライン デプロイメント ==="
echo "環境: $ENVIRONMENT"
echo "リージョン: $REGION"
echo "プロジェクト: $PROJECT_NAME"
echo "GitHub リポジトリ: $GITHUB_REPO"
echo ""

# パラメータファイルの存在確認
PARAM_FILE="parameters/${ENVIRONMENT}-parameters.json"
if [ ! -f "$PARAM_FILE" ]; then
    echo "エラー: パラメータファイルが見つかりません: $PARAM_FILE"
    exit 1
fi

# GitHub トークンをパラメータファイルに追加
echo "GitHub 設定を更新中..."
TEMP_PARAM_FILE=$(mktemp)
jq --arg repo "$GITHUB_REPO" --arg token "$GITHUB_TOKEN" \
   '.Parameters.GitHubRepo = $repo | .Parameters.GitHubToken = $token' \
   "$PARAM_FILE" > "$TEMP_PARAM_FILE"
mv "$TEMP_PARAM_FILE" "$PARAM_FILE"

# CloudFormation テンプレートの検証
echo "1. CloudFormation テンプレートの検証..."
aws cloudformation validate-template --template-body file://cloudformation/cicd-pipeline-template.yaml --region $REGION
echo "✓ CI/CD パイプラインテンプレート検証完了"

# 前提条件の確認（IAM ロールスタックが存在するか）
echo ""
echo "2. 前提条件の確認..."
IAM_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-iam-roles"
if ! aws cloudformation describe-stacks --stack-name $IAM_STACK_NAME --region $REGION >/dev/null 2>&1; then
    echo "エラー: IAM ロールスタック ($IAM_STACK_NAME) が見つかりません。"
    echo "先に基本インフラストラクチャをデプロイしてください: ./deploy.sh $ENVIRONMENT"
    exit 1
fi
echo "✓ 前提条件確認完了"

# CI/CD パイプラインのデプロイ
echo ""
echo "3. CI/CD パイプラインのデプロイ..."
CICD_STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cicd"
aws cloudformation deploy \
    --template-file cloudformation/cicd-pipeline-template.yaml \
    --stack-name $CICD_STACK_NAME \
    --parameter-overrides file://$PARAM_FILE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags Environment=$ENVIRONMENT Project=$PROJECT_NAME

echo "✓ CI/CD パイプラインデプロイ完了"

# デプロイ結果の出力
echo ""
echo "=== CI/CD パイプライン デプロイメント完了 ==="
echo ""
echo "スタック情報:"
echo "- CI/CD スタック: $CICD_STACK_NAME"
echo ""

# 重要な出力値の取得
echo "CI/CD パイプライン情報:"
PIPELINE_NAME=$(aws cloudformation describe-stacks --stack-name $CICD_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PipelineName`].OutputValue' --output text)
PIPELINE_URL=$(aws cloudformation describe-stacks --stack-name $CICD_STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' --output text)

echo "- パイプライン名: $PIPELINE_NAME"
echo "- パイプライン URL: $PIPELINE_URL"
echo ""

# GitHub Webhook の設定確認
echo "GitHub Webhook 設定:"
echo "- リポジトリ: $GITHUB_REPO"
echo "- ブランチ: main (デフォルト)"
echo "- Webhook は自動的に設定されました"
echo ""

# 次のステップの案内
echo "=== 次のステップ ==="
echo "1. GitHub リポジトリにコードをプッシュしてください"
echo "2. パイプラインが自動的に実行されます: $PIPELINE_URL"
echo "3. 各ステージ（Infrastructure → Backend → Frontend）の進行状況を確認してください"
echo ""

# パラメータファイルからトークンを削除（セキュリティのため）
echo "セキュリティのため、パラメータファイルからトークンを削除中..."
jq 'del(.Parameters.GitHubToken)' "$PARAM_FILE" > "$TEMP_PARAM_FILE"
mv "$TEMP_PARAM_FILE" "$PARAM_FILE"

echo "CI/CD パイプラインのデプロイメントが正常に完了しました！"