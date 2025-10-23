# CI/CD パイプライン セットアップスクリプト (PowerShell版)
param(
    [string]$Environment = "prod",
    [string]$Region = "ap-northeast-1", 
    [string]$GitHubRepo = "your-org/attendance-management",
    [string]$GitHubBranch = "main",
    [string]$GitHubToken = "",
    [switch]$Help
)

$StackName = "attendance-management-cicd"

function Write-InfoMessage($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-SuccessMessage($Message) {
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-WarningMessage($Message) {
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Usage {
    Write-Host "使用方法: .\setup-cicd.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "オプション:"
    Write-Host "  -Environment ENV     環境名 (dev, staging, prod) [デフォルト: prod]"
    Write-Host "  -Region REGION       AWSリージョン [デフォルト: ap-northeast-1]"
    Write-Host "  -GitHubRepo REPO     GitHubリポジトリ (owner/repo)"
    Write-Host "  -GitHubBranch BRANCH GitHubブランチ [デフォルト: main]"
    Write-Host "  -GitHubToken TOKEN   GitHubアクセストークン"
    Write-Host "  -Help               このヘルプを表示"
    Write-Host ""
    Write-Host "例:"
    Write-Host "  .\setup-cicd.ps1 -GitHubRepo 'your-org/attendance-management' -GitHubToken 'ghp_xxxx'"
}

function Test-Prerequisites {
    Write-InfoMessage "前提条件をチェック中..."
    
    try {
        $null = aws --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "AWS CLIがインストールされていません"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "AWS CLIがインストールされていません"
        return $false
    }
    
    try {
        $null = aws sts get-caller-identity 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "AWS認証が設定されていません"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "AWS認証が設定されていません"
        return $false
    }
    
    if ([string]::IsNullOrEmpty($GitHubToken)) {
        Write-ErrorMessage "GitHubアクセストークンが必要です (-GitHubToken オプション)"
        return $false
    }
    
    if (-not (Test-Path "infrastructure\cloudformation\cicd-pipeline-stack.yml")) {
        Write-ErrorMessage "CI/CDパイプラインテンプレートが見つかりません"
        return $false
    }
    
    Write-SuccessMessage "前提条件チェック完了"
    return $true
}

function Set-Parameters {
    Write-InfoMessage "Parameter Store パラメータを設定中..."
    
    try {
        $null = aws ssm get-parameter --name "/attendance-management/$Environment/db-password" --region $Region 2>$null
        if ($LASTEXITCODE -ne 0) {
            $DbPassword = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
            
            $null = aws ssm put-parameter --name "/attendance-management/$Environment/db-password" --value $DbPassword --type "SecureString" --description "Database password for $Environment environment" --region $Region
            
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorMessage "Parameter Store設定に失敗しました"
                return $false
            }
            Write-SuccessMessage "データベースパスワードを設定しました"
        }
        else {
            Write-InfoMessage "データベースパスワードは既に設定済みです"
        }
    }
    catch {
        Write-ErrorMessage "Parameter Store設定中にエラーが発生しました"
        return $false
    }
    
    Write-SuccessMessage "Parameter Store設定完了"
    return $true
}

function Deploy-Pipeline {
    Write-InfoMessage "CI/CDパイプラインをデプロイ中..."
    
    try {
        $null = aws cloudformation deploy --template-file "infrastructure\cloudformation\cicd-pipeline-stack.yml" --stack-name "$StackName-$Environment" --parameter-overrides "Environment=$Environment" "GitHubRepository=$GitHubRepo" "GitHubBranch=$GitHubBranch" "GitHubToken=$GitHubToken" --capabilities CAPABILITY_NAMED_IAM --region $Region --no-fail-on-empty-changeset
        
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "CI/CDパイプラインデプロイに失敗しました"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "CI/CDパイプラインデプロイ中にエラーが発生しました"
        return $false
    }
    
    Write-SuccessMessage "CI/CDパイプラインデプロイ完了"
    return $true
}

if ($Help) {
    Show-Usage
    exit 0
}

Write-InfoMessage "CI/CD パイプライン セットアップ開始"
Write-Host "===================================="
Write-Host "環境: $Environment"
Write-Host "リージョン: $Region"
Write-Host "GitHubリポジトリ: $GitHubRepo"
Write-Host "GitHubブランチ: $GitHubBranch"
Write-Host ""

if (-not (Test-Prerequisites)) {
    Write-ErrorMessage "セットアップを中止します"
    exit 1
}

if (-not (Set-Parameters)) {
    Write-ErrorMessage "セットアップを中止します"
    exit 1
}

if (-not (Deploy-Pipeline)) {
    Write-ErrorMessage "セットアップを中止します"
    exit 1
}

Write-SuccessMessage "セットアップ完了！"