# CI/CD パイプライン ガイド

## 📋 概要

勤怠管理システムの CI/CD パイプラインは、**CodePipeline + CodeBuild + GitHub** を使用したシンプルな構成です。

## 🏗️ アーキテクチャ

```
GitHub → CodePipeline → CodeBuild (Build) → CodeBuild (Deploy) → AWS
```

### パイプライン構成

1. **Source**: GitHub からソースコード取得
2. **Build**: アプリケーションビルド・テスト実行
3. **Deploy**: AWS 環境へデプロイ

## 📁 関連ファイル

- `buildspec.yml` - CodeBuild ビルド設定
- `infrastructure/cloudformation/cicd-pipeline-stack.yml` - パイプライン定義
- `setup-cicd.sh` - セットアップスクリプト (Linux/macOS)
- `setup-cicd.bat` - セットアップスクリプト (Windows Batch)
- `setup-cicd.ps1` - セットアップスクリプト (Windows PowerShell)

## 🚀 セットアップ手順

### 1. 前提条件

- AWS CLI 設定済み
- GitHub アクセストークン取得済み
- 必要な IAM 権限

### 2. パイプライン作成

#### Linux/macOS

```bash
# セットアップスクリプト実行
./setup-cicd.sh -g your-org/attendance-management -t YOUR_GITHUB_TOKEN
```

#### Windows (Batch)

```cmd
# セットアップスクリプト実行
setup-cicd.bat -g your-org/attendance-management -t YOUR_GITHUB_TOKEN
```

#### Windows (PowerShell)

```powershell
# セットアップスクリプト実行
.\setup-cicd.ps1 -GitHubRepo "your-org/attendance-management" -GitHubToken "YOUR_GITHUB_TOKEN"
```

#### 手動で CloudFormation デプロイ

```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/cicd-pipeline-stack.yml \
  --stack-name attendance-management-cicd-prod \
  --parameter-overrides \
    Environment=prod \
    GitHubRepository=your-org/attendance-management \
    GitHubBranch=main \
    GitHubToken=YOUR_GITHUB_TOKEN \
  --capabilities CAPABILITY_NAMED_IAM
```

### 3. 動作確認

1. GitHub にコードをプッシュ
2. CodePipeline が自動実行される
3. AWS コンソールで実行状況を確認

## 🔧 パイプライン詳細

### Build Stage (buildspec.yml)

```yaml
phases:
  install: # Java 17 + Node.js 18 セットアップ
  pre_build: # リンター実行
  build: # バックエンド・フロントエンドビルド
  post_build: # テスト実行
```

### Deploy Stage

- インフラストラクチャデプロイ (CloudFormation)
- Lambda 関数更新
- フロントエンドデプロイ (S3)

## 📊 生成されるリソース

### CodePipeline

- パイプライン本体
- S3 アーティファクトバケット
- IAM ロール・権限

### CodeBuild

- ビルドプロジェクト (Build)
- デプロイプロジェクト (Deploy)
- CloudWatch Logs

### 通知

- SNS トピック
- CloudWatch Events

## 🔒 セキュリティ

### 権限設定

- CodePipeline: S3、CodeBuild アクセス
- CodeBuild: CloudFormation、Lambda、S3、API Gateway アクセス

### 機密情報管理

- GitHub トークン: CloudFormation パラメータ
- データベースパスワード: Parameter Store

## 🚨 トラブルシューティング

### よくある問題

#### 1. パイプライン実行失敗

```bash
# CloudWatch Logsでエラー確認
aws logs describe-log-groups --log-group-name-prefix "/aws/codebuild"
```

#### 2. 権限エラー

- IAM ロールの権限を確認
- CloudFormation スタックの権限を確認

#### 3. ビルド失敗

- `buildspec.yml` の設定を確認
- ローカルでビルドテストを実行

### ログ確認

```bash
# パイプライン実行履歴
aws codepipeline list-pipeline-executions --pipeline-name PIPELINE_NAME

# ビルドログ確認
aws logs tail /aws/codebuild/PROJECT_NAME --follow
```

## 📈 運用のコツ

### 1. ブランチ戦略

- `main` ブランチ → 本番デプロイ
- `develop` ブランチ → 開発環境デプロイ（別パイプライン）

### 2. 通知設定

```bash
# SNSトピックにメール通知追加
aws sns subscribe \
  --topic-arn TOPIC_ARN \
  --protocol email \
  --notification-endpoint admin@example.com
```

### 3. パフォーマンス最適化

- CodeBuild キャッシュ活用
- 並列ビルド設定
- 不要なテストスキップ

## 🔄 拡張可能性

### 追加可能な機能

- 承認ステップ追加
- 複数環境デプロイ
- セキュリティスキャン統合
- Slack 通知連携

### 環境別パイプライン

#### Linux/macOS

```bash
# 開発環境用パイプライン
./setup-cicd.sh -e dev -g your-org/attendance-management -b develop -t TOKEN
```

#### Windows (PowerShell)

```powershell
# 開発環境用パイプライン
.\setup-cicd.ps1 -Environment "dev" -GitHubRepo "your-org/attendance-management" -GitHubBranch "develop" -GitHubToken "TOKEN"
```

## ✅ チェックリスト

### セットアップ完了後

- [ ] パイプライン作成確認
- [ ] GitHub プッシュでパイプライン実行確認
- [ ] ビルド成功確認
- [ ] デプロイ成功確認
- [ ] 通知設定確認

### 運用開始後

- [ ] 定期的なパイプライン実行確認
- [ ] ログ監視設定
- [ ] エラー通知設定
- [ ] パフォーマンス監視

---

**シンプルで効果的な CI/CD パイプラインをお楽しみください！** 🚀
