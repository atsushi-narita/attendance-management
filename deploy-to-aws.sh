#!/bin/bash

# AWS本番環境デプロイメント実行スクリプト
# 使用方法: ./deploy-to-aws.sh

set -e

# 設定
ENVIRONMENT="prod"
REGION="ap-northeast-1"
STACK_PREFIX="attendance-management"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェック中..."
    
    # AWS CLI確認
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLIがインストールされていません"
        exit 1
    fi
    
    # AWS認証確認
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS認証が設定されていません"
        exit 1
    fi
    
    # 必要な環境変数確認
    if [ -z "$DB_PASSWORD" ]; then
        log_warning "DB_PASSWORDが設定されていません。ランダムパスワードを生成します。"
        export DB_PASSWORD=$(openssl rand -base64 32)
        log_info "生成されたパスワード: $DB_PASSWORD"
    fi
    
    log_success "前提条件チェック完了"
}

# 環境変数設定
setup_environment() {
    log_info "環境変数を設定中..."
    
    # デフォルト値設定
    export AWS_REGION=${AWS_REGION:-$REGION}
    export DB_NAME=${DB_NAME:-"attendance_prod"}
    export DB_USERNAME=${DB_USERNAME:-"attendance_admin"}
    export COGNITO_DOMAIN=${COGNITO_DOMAIN:-"attendance-auth-prod"}
    export ALERT_EMAIL=${ALERT_EMAIL:-"admin@example.com"}
    
    log_success "環境変数設定完了"
}

# ネットワークスタックデプロイ
deploy_network() {
    log_info "ネットワークスタックをデプロイ中..."
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/network-stack.yml \
        --stack-name "${STACK_PREFIX}-network-${ENVIRONMENT}" \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --no-fail-on-empty-changeset
    
    log_success "ネットワークスタックデプロイ完了"
}

# データベーススタックデプロイ
deploy_database() {
    log_info "データベーススタックをデプロイ中..."
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/database-stack.yml \
        --stack-name "${STACK_PREFIX}-database-${ENVIRONMENT}" \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            DBPassword=$DB_PASSWORD \
            DBName=$DB_NAME \
            DBUsername=$DB_USERNAME \
            NetworkStackName="${STACK_PREFIX}-network-${ENVIRONMENT}" \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --no-fail-on-empty-changeset
    
    log_success "データベーススタックデプロイ完了"
}

# デプロイメント情報表示
show_deployment_info() {
    log_info "デプロイメント情報を取得中..."
    
    # データベースエンドポイント取得
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-database-${ENVIRONMENT}" \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
        --output text 2>/dev/null || echo "取得できませんでした")
    
    echo ""
    echo "🎉 デプロイメント完了情報"
    echo "========================"
    echo "環境: $ENVIRONMENT"
    echo "リージョン: $AWS_REGION"
    echo "データベースエンドポイント: $DB_ENDPOINT"
    echo "データベース名: $DB_NAME"
    echo "データベースユーザー: $DB_USERNAME"
    echo ""
    echo "⚠️  重要: データベースパスワードを安全に保管してください"
    echo "パスワード: $DB_PASSWORD"
    echo ""
}

# メイン実行関数
main() {
    echo "🚀 AWS本番環境デプロイメント開始"
    echo "================================="
    echo "スタック: ${STACK_PREFIX}-${ENVIRONMENT}"
    echo "リージョン: $REGION"
    echo "タイムスタンプ: $(date)"
    echo ""
    
    # 確認プロンプト
    read -p "本番環境にデプロイしますか？ (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "デプロイメントをキャンセルしました"
        exit 0
    fi
    
    # 実行
    check_prerequisites
    setup_environment
    deploy_network
    deploy_database
    show_deployment_info
    
    log_success "🎉 デプロイメント完了！"
    echo ""
    echo "次のステップ:"
    echo "1. 認証スタック（Cognito）のデプロイ"
    echo "2. Lambda関数のデプロイ"
    echo "3. API Gatewayのデプロイ"
    echo "4. フロントエンドのデプロイ"
    echo "5. 監視設定"
    echo ""
    echo "詳細な手順は AWS-PRODUCTION-DEPLOYMENT.md を参照してください。"
}

# エラーハンドリング
trap 'log_error "デプロイメント中にエラーが発生しました"; exit 1' ERR

# メイン実行
main "$@"