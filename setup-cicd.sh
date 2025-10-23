#!/bin/bash

# CI/CD パイプライン セットアップスクリプト
# =========================================

set -e

# 設定
STACK_NAME="attendance-management-cicd"
REGION="ap-northeast-1"
ENVIRONMENT="prod"

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

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  -e, --environment ENV    環境名 (dev, staging, prod) [デフォルト: prod]"
    echo "  -r, --region REGION      AWSリージョン [デフォルト: ap-northeast-1]"
    echo "  -g, --github-repo REPO   GitHubリポジトリ (owner/repo)"
    echo "  -b, --github-branch BRANCH GitHubブランチ [デフォルト: main]"
    echo "  -t, --github-token TOKEN GitHubアクセストークン"
    echo "  -h, --help              このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 -g your-org/attendance-management -t ghp_xxxx"
}

# パラメータ解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -g|--github-repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        -b|--github-branch)
            GITHUB_BRANCH="$2"
            shift 2
            ;;
        -t|--github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
done

# デフォルト値設定
GITHUB_REPO=${GITHUB_REPO:-"your-org/attendance-management"}
GITHUB_BRANCH=${GITHUB_BRANCH:-"main"}

log_info "CI/CD パイプライン セットアップ開始"
echo "===================================="
echo "環境: $ENVIRONMENT"
echo "リージョン: $REGION"
echo "GitHubリポジトリ: $GITHUB_REPO"
echo "GitHubブランチ: $GITHUB_BRANCH"
echo ""

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
    
    # GitHubトークン確認
    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "GitHubアクセストークンが必要です (-t オプション)"
        exit 1
    fi
    
    # CloudFormationテンプレート存在確認
    if [ ! -f "infrastructure/cloudformation/cicd-pipeline-stack.yml" ]; then
        log_error "CI/CDパイプラインテンプレートが見つかりません"
        exit 1
    fi
    
    log_success "前提条件チェック完了"
}

# Parameter Store設定
setup_parameters() {
    log_info "Parameter Store パラメータを設定中..."
    
    # データベースパスワード
    if ! aws ssm get-parameter --name "/attendance-management/${ENVIRONMENT}/db-password" --region $REGION &> /dev/null; then
        DB_PASSWORD=$(openssl rand -base64 32)
        aws ssm put-parameter \
            --name "/attendance-management/${ENVIRONMENT}/db-password" \
            --value "$DB_PASSWORD" \
            --type "SecureString" \
            --description "Database password for ${ENVIRONMENT} environment" \
            --region $REGION
        log_success "データベースパスワードを設定しました"
    else
        log_info "データベースパスワードは既に設定済みです"
    fi
    
    log_success "Parameter Store設定完了"
}

# CI/CDパイプライン作成
deploy_pipeline() {
    log_info "CI/CDパイプラインをデプロイ中..."
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/cicd-pipeline-stack.yml \
        --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            GitHubRepository=$GITHUB_REPO \
            GitHubBranch=$GITHUB_BRANCH \
            GitHubToken=$GITHUB_TOKEN \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION \
        --no-fail-on-empty-changeset
    
    log_success "CI/CDパイプラインデプロイ完了"
}

# デプロイ情報表示
show_deployment_info() {
    log_info "デプロイメント情報を取得中..."
    
    # パイプライン名取得
    PIPELINE_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`PipelineName`].OutputValue' \
        --output text 2>/dev/null || echo "取得できませんでした")
    
    # パイプラインURL取得
    PIPELINE_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
        --output text 2>/dev/null || echo "取得できませんでした")
    
    echo ""
    echo "🎉 CI/CD パイプライン セットアップ完了"
    echo "====================================="
    echo "環境: $ENVIRONMENT"
    echo "リージョン: $REGION"
    echo "パイプライン名: $PIPELINE_NAME"
    echo "パイプラインURL: $PIPELINE_URL"
    echo ""
    echo "📋 次のステップ:"
    echo "1. GitHubにコードをプッシュしてパイプラインを実行"
    echo "2. AWS CodePipelineコンソールで実行状況を確認"
    echo "3. 必要に応じてインフラスタックを事前にデプロイ"
    echo ""
    echo "🔗 便利なリンク:"
    echo "CodePipelineコンソール: https://console.aws.amazon.com/codesuite/codepipeline/pipelines"
    echo "CloudWatchログ: https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#logsV2:log-groups"
    echo ""
}

# 手動パイプライン実行
trigger_pipeline() {
    log_info "パイプラインを手動実行しますか？ (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "パイプラインを開始中..."
        
        EXECUTION_ID=$(aws codepipeline start-pipeline-execution \
            --name "$PIPELINE_NAME" \
            --region $REGION \
            --query 'pipelineExecutionId' \
            --output text)
        
        log_success "パイプラインが開始されました: $EXECUTION_ID"
        echo "実行状況: $PIPELINE_URL"
    fi
}

# メイン実行
main() {
    check_prerequisites
    setup_parameters
    deploy_pipeline
    show_deployment_info
    trigger_pipeline
    
    log_success "🎉 セットアップ完了！"
}

# エラーハンドリング
trap 'log_error "セットアップ中にエラーが発生しました"; exit 1' ERR

# メイン実行
main "$@"