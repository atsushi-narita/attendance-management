@echo off
setlocal enabledelayedexpansion

REM CI/CD パイプライン セットアップスクリプト (Windows版)
REM =========================================================

REM 設定
set STACK_NAME=attendance-management-cicd
set REGION=ap-northeast-1
set ENVIRONMENT=prod
set GITHUB_REPO=your-org/attendance-management
set GITHUB_BRANCH=main

REM 色付きログ出力用
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM ヘルプ表示
if "%1"=="--help" goto :show_usage
if "%1"=="-h" goto :show_usage

REM パラメータ解析
:parse_args
if "%1"=="" goto :start_setup
if "%1"=="-e" (
    set ENVIRONMENT=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="--environment" (
    set ENVIRONMENT=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="-r" (
    set REGION=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="--region" (
    set REGION=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="-g" (
    set GITHUB_REPO=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="--github-repo" (
    set GITHUB_REPO=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="-b" (
    set GITHUB_BRANCH=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="--github-branch" (
    set GITHUB_BRANCH=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="-t" (
    set GITHUB_TOKEN=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="--github-token" (
    set GITHUB_TOKEN=%2
    shift
    shift
    goto :parse_args
)
shift
goto :parse_args

:show_usage
echo 使用方法: %0 [OPTIONS]
echo.
echo オプション:
echo   -e, --environment ENV    環境名 (dev, staging, prod) [デフォルト: prod]
echo   -r, --region REGION      AWSリージョン [デフォルト: ap-northeast-1]
echo   -g, --github-repo REPO   GitHubリポジトリ (owner/repo)
echo   -b, --github-branch BRANCH GitHubブランチ [デフォルト: main]
echo   -t, --github-token TOKEN GitHubアクセストークン
echo   -h, --help              このヘルプを表示
echo.
echo 例:
echo   %0 -g your-org/attendance-management -t ghp_xxxx
goto :eof

:start_setup
echo %BLUE%[INFO]%NC% CI/CD パイプライン セットアップ開始
echo ====================================
echo 環境: %ENVIRONMENT%
echo リージョン: %REGION%
echo GitHubリポジトリ: %GITHUB_REPO%
echo GitHubブランチ: %GITHUB_BRANCH%
echo.

REM 前提条件チェック
call :check_prerequisites
if errorlevel 1 goto :error_exit

REM Parameter Store設定
call :setup_parameters
if errorlevel 1 goto :error_exit

REM CI/CDパイプライン作成
call :deploy_pipeline
if errorlevel 1 goto :error_exit

REM デプロイ情報表示
call :show_deployment_info

REM 手動パイプライン実行
call :trigger_pipeline

echo %GREEN%[SUCCESS]%NC% セットアップ完了！
goto :eof

:check_prerequisites
echo %BLUE%[INFO]%NC% 前提条件をチェック中...

REM AWS CLI確認
aws --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% AWS CLIがインストールされていません
    exit /b 1
)

REM AWS認証確認
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% AWS認証が設定されていません
    exit /b 1
)

REM GitHubトークン確認
if "%GITHUB_TOKEN%"=="" (
    echo %RED%[ERROR]%NC% GitHubアクセストークンが必要です (-t オプション)
    exit /b 1
)

REM CloudFormationテンプレート存在確認
if not exist "infrastructure\cloudformation\cicd-pipeline-stack.yml" (
    echo %RED%[ERROR]%NC% CI/CDパイプラインテンプレートが見つかりません
    exit /b 1
)

echo %GREEN%[SUCCESS]%NC% 前提条件チェック完了
exit /b 0

:setup_parameters
echo %BLUE%[INFO]%NC% Parameter Store パラメータを設定中...

REM データベースパスワード確認
aws ssm get-parameter --name "/attendance-management/%ENVIRONMENT%/db-password" --region %REGION% >nul 2>&1
if errorlevel 1 (
    REM PowerShellでランダムパスワード生成
    for /f "delims=" %%i in ('powershell -command "[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))"') do set DB_PASSWORD=%%i
    
    aws ssm put-parameter ^
        --name "/attendance-management/%ENVIRONMENT%/db-password" ^
        --value "!DB_PASSWORD!" ^
        --type "SecureString" ^
        --description "Database password for %ENVIRONMENT% environment" ^
        --region %REGION%
    
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Parameter Store設定に失敗しました
        exit /b 1
    )
    echo %GREEN%[SUCCESS]%NC% データベースパスワードを設定しました
) else (
    echo %BLUE%[INFO]%NC% データベースパスワードは既に設定済みです
)

echo %GREEN%[SUCCESS]%NC% Parameter Store設定完了
exit /b 0

:deploy_pipeline
echo %BLUE%[INFO]%NC% CI/CDパイプラインをデプロイ中...

aws cloudformation deploy ^
    --template-file infrastructure\cloudformation\cicd-pipeline-stack.yml ^
    --stack-name "%STACK_NAME%-%ENVIRONMENT%" ^
    --parameter-overrides ^
        Environment=%ENVIRONMENT% ^
        GitHubRepository=%GITHUB_REPO% ^
        GitHubBranch=%GITHUB_BRANCH% ^
        GitHubToken=%GITHUB_TOKEN% ^
    --capabilities CAPABILITY_NAMED_IAM ^
    --region %REGION% ^
    --no-fail-on-empty-changeset

if errorlevel 1 (
    echo %RED%[ERROR]%NC% CI/CDパイプラインデプロイに失敗しました
    exit /b 1
)

echo %GREEN%[SUCCESS]%NC% CI/CDパイプラインデプロイ完了
exit /b 0

:show_deployment_info
echo %BLUE%[INFO]%NC% デプロイメント情報を取得中...

REM パイプライン名取得
for /f "delims=" %%i in ('aws cloudformation describe-stacks --stack-name "%STACK_NAME%-%ENVIRONMENT%" --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`PipelineName`].OutputValue" --output text 2^>nul') do set PIPELINE_NAME=%%i
if "%PIPELINE_NAME%"=="" set PIPELINE_NAME=取得できませんでした

REM パイプラインURL取得
for /f "delims=" %%i in ('aws cloudformation describe-stacks --stack-name "%STACK_NAME%-%ENVIRONMENT%" --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue" --output text 2^>nul') do set PIPELINE_URL=%%i
if "%PIPELINE_URL%"=="" set PIPELINE_URL=取得できませんでした

echo.
echo %GREEN%[SUCCESS]%NC% CI/CD パイプライン セットアップ完了
echo =====================================
echo 環境: %ENVIRONMENT%
echo リージョン: %REGION%
echo パイプライン名: %PIPELINE_NAME%
echo パイプラインURL: %PIPELINE_URL%
echo.
echo 次のステップ:
echo 1. GitHubにコードをプッシュしてパイプラインを実行
echo 2. AWS CodePipelineコンソールで実行状況を確認
echo 3. 必要に応じてインフラスタックを事前にデプロイ
echo.
echo 便利なリンク:
echo CodePipelineコンソール: https://console.aws.amazon.com/codesuite/codepipeline/pipelines
echo CloudWatchログ: https://console.aws.amazon.com/cloudwatch/home?region=%REGION%#logsV2:log-groups
echo.
exit /b 0

:trigger_pipeline
set /p response="パイプラインを手動実行しますか？ (y/n): "
if /i "%response%"=="y" (
    echo %BLUE%[INFO]%NC% パイプラインを開始中...
    
    for /f "delims=" %%i in ('aws codepipeline start-pipeline-execution --name "%PIPELINE_NAME%" --region %REGION% --query "pipelineExecutionId" --output text 2^>nul') do set EXECUTION_ID=%%i
    
    if not "%EXECUTION_ID%"=="" (
        echo %GREEN%[SUCCESS]%NC% パイプラインが開始されました: %EXECUTION_ID%
        echo 実行状況: %PIPELINE_URL%
    ) else (
        echo %YELLOW%[WARNING]%NC% パイプラインの開始に失敗しました
    )
)
exit /b 0

:error_exit
echo %RED%[ERROR]%NC% セットアップ中にエラーが発生しました
exit /b 1