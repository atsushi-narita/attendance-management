# GitHub プッシュ前チェックリスト

## 🔍 プッシュ前の確認事項

### ✅ ファイル除外確認

#### 1. ビルド成果物が除外されているか

```bash
# 以下のディレクトリ・ファイルがgitignoreされていることを確認
git status --ignored

# 確認すべき除外項目:
# - app/build/
# - frontend/.nuxt/
# - frontend/.output/
# - frontend/dist/
# - frontend/node_modules/
# - *.jar, *.zip
# - *.log
```

#### 2. 機密情報が含まれていないか

```bash
# 機密情報のスキャン
grep -r "password\|secret\|key.*=" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build

# 確認すべき機密情報:
# - データベースパスワード
# - AWS認証情報
# - API キー
# - 証明書・秘密鍵
```

#### 3. 環境固有ファイルが除外されているか

```bash
# 環境固有ファイルの確認
ls -la | grep -E "\.(env|local|config)$"

# 除外すべきファイル:
# - .env*
# - *.local
# - config/local.json
# - aws-config/
```

### ✅ コード品質確認

#### 1. テスト実行

```bash
# フロントエンドテスト
cd frontend
npm run test

# バックエンドテスト
cd ../app
./gradlew test

# E2Eテスト（オプション）
cd ../frontend
npm run test:e2e
```

#### 2. リンター・フォーマッター

```bash
# フロントエンド
cd frontend
npm run lint
npm run lint:fix

# TypeScript型チェック
npm run type-check
```

#### 3. セキュリティスキャン

```bash
# セキュリティスキャン実行
cd infrastructure
./security-scan.sh
```

### ✅ ドキュメント確認

#### 1. README.md の更新

- [ ] プロジェクト概要が最新
- [ ] セットアップ手順が正確
- [ ] 依存関係バージョンが最新

#### 2. 変更履歴の記録

- [ ] 主要な変更点を記録
- [ ] 破壊的変更があれば明記

### ✅ Git 操作

#### 1. ステージング前確認

```bash
# 変更ファイル確認
git status

# 差分確認
git diff

# 除外ファイル確認
git status --ignored
```

#### 2. コミット

```bash
# ステージング
git add .

# 最終確認
git status

# コミット（意味のあるメッセージで）
git commit -m "feat: 勤怠管理システムの初期実装

- フロントエンド: Nuxt.js + Vue.js 3
- バックエンド: Java + Spring Boot + Lambda
- インフラ: AWS CloudFormation
- テスト: Vitest + Playwright E2E
- デプロイ: 自動化スクリプト完備"
```

#### 3. プッシュ前最終チェック

```bash
# リモートリポジトリ確認
git remote -v

# ブランチ確認
git branch

# プッシュ
git push origin main
```

## 🚨 プッシュしてはいけないファイル

### 絶対に除外すべきファイル

- `app/build/` - Gradle ビルド成果物
- `frontend/node_modules/` - Node.js 依存関係
- `frontend/.nuxt/` - Nuxt.js ビルドキャッシュ
- `frontend/.output/` - Nuxt.js 出力
- `*.jar`, `*.zip` - バイナリファイル
- `.env*` - 環境変数ファイル
- `*.log` - ログファイル
- `*.key`, `*.pem` - 証明書・秘密鍵
- `.aws/` - AWS 認証情報

### 条件付きで除外すべきファイル

- `package-lock.json` - チーム方針による
- `.vscode/` - チーム設定がある場合は含める
- `test-results/` - CI/CD で生成される場合は除外

## 📋 プッシュ後の確認

### 1. GitHub 上での確認

- [ ] ファイル構成が正しい
- [ ] README.md が正しく表示される
- [ ] 機密情報が含まれていない
- [ ] ビルド成果物が含まれていない

### 2. CI/CD 確認（設定済みの場合）

- [ ] ビルドが成功する
- [ ] テストが通る
- [ ] セキュリティスキャンが通る

### 3. チーム通知

- [ ] チームメンバーに変更を通知
- [ ] 重要な変更があれば説明

## 🔧 問題が発生した場合

### 機密情報を誤ってプッシュした場合

```bash
# 最新コミットから機密ファイルを削除
git rm --cached <機密ファイル>
git commit -m "Remove sensitive file"
git push origin main

# 履歴から完全に削除（必要に応じて）
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch <機密ファイル>' \
--prune-empty --tag-name-filter cat -- --all
```

### 大きなファイルを誤ってプッシュした場合

```bash
# Git LFS を使用するか、ファイルを削除
git rm <大きなファイル>
git commit -m "Remove large file"
git push origin main
```

### .gitignore を後から追加した場合

```bash
# 既にトラッキングされているファイルを除外
git rm -r --cached .
git add .
git commit -m "Apply .gitignore"
git push origin main
```

---

## ✅ 最終チェックリスト

プッシュ前に以下をすべて確認してください：

- [ ] ビルド成果物が除外されている
- [ ] 機密情報が含まれていない
- [ ] テストが通る
- [ ] リンターエラーがない
- [ ] README.md が最新
- [ ] コミットメッセージが適切
- [ ] 正しいブランチにプッシュする

**すべて確認できたら、安心してプッシュしてください！** 🚀
