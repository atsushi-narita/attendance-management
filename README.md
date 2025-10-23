# 勤怠管理システム

AWS クラウド上に構築された現代的な勤怠管理システムです。

## 🏗️ アーキテクチャ

- **フロントエンド**: Nuxt.js 3 + Vue.js 3 + TypeScript
- **バックエンド**: Java 17 + Spring Boot + AWS Lambda
- **データベース**: PostgreSQL (AWS RDS)
- **認証**: AWS Cognito
- **インフラ**: AWS CloudFormation
- **CDN**: AWS CloudFront
- **キャッシュ**: AWS ElastiCache (Redis)

## 📁 プロジェクト構成

```
attendance-management/
├── app/                          # Java バックエンド
│   ├── src/main/java/           # Java ソースコード
│   ├── src/test/java/           # Java テストコード
│   ├── build.gradle             # Gradle ビルド設定
│   └── .gitignore              # Java固有の除外設定
├── frontend/                    # Nuxt.js フロントエンド
│   ├── components/             # Vue コンポーネント
│   ├── pages/                  # ページコンポーネント
│   ├── stores/                 # Pinia ストア
│   ├── test/                   # 単体テスト
│   ├── e2e/                    # E2E テスト
│   ├── package.json            # Node.js 依存関係
│   └── .gitignore              # Frontend固有の除外設定
├── infrastructure/              # AWS インフラ設定
│   ├── cloudformation/         # CloudFormation テンプレート
│   ├── deploy-production.sh    # 本番デプロイスクリプト
│   ├── security-scan.sh        # セキュリティスキャン
│   └── .gitignore              # Infrastructure固有の除外設定
├── .kiro/                      # Kiro IDE 設定
│   └── specs/                  # 仕様書・タスク管理
├── .gitignore                  # プロジェクト全体の除外設定
├── deploy-to-aws.sh            # クイックデプロイスクリプト
├── AWS-PRODUCTION-DEPLOYMENT.md # 詳細デプロイ手順
├── QUICK-DEPLOY-GUIDE.md       # クイックデプロイガイド
└── README.md                   # このファイル
```

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- Java 17+
- AWS CLI v2
- Git

### ローカル開発環境セットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-org/attendance-management.git
cd attendance-management

# フロントエンド依存関係インストール
cd frontend
npm install

# バックエンドビルド
cd ../app
./gradlew build

# 開発サーバー起動
cd ../frontend
npm run dev
```

### AWS 本番環境デプロイ

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export DB_PASSWORD=$(openssl rand -base64 32)
export ALERT_EMAIL=admin@yourdomain.com

# クイックデプロイ
./deploy-to-aws.sh

# または詳細デプロイ手順に従う
# 詳細: AWS-PRODUCTION-DEPLOYMENT.md
```

## 🧪 テスト

### 単体テスト

```bash
# フロントエンド
cd frontend
npm run test

# バックエンド
cd app
./gradlew test
```

### E2E テスト

```bash
cd frontend
npm run test:e2e
```

### 統合テスト

```bash
cd frontend
npm run test:integration
```

## 📊 主な機能

### 従業員機能

- ✅ 出勤・退勤打刻
- ✅ 勤務記録確認
- ✅ 修正申請
- ✅ 月次勤務時間サマリー

### 管理者機能

- ✅ 従業員管理（CRUD）
- ✅ 修正申請承認・却下
- ✅ 勤務記録一覧・検索
- ✅ ダッシュボード

### システム管理者機能

- ✅ ユーザー権限管理
- ✅ システム設定
- ✅ 監査ログ確認

## 🔒 セキュリティ

- AWS Cognito による認証・認可
- HTTPS/TLS 1.2+ 暗号化通信
- データベース暗号化（保存時・転送時）
- IAM 最小権限原則
- セキュリティスキャン自動化

## 📈 監視・運用

- CloudWatch 監視・アラート
- SNS/Slack 通知
- 自動バックアップ
- パフォーマンス最適化
- ログ集約・分析

## 🛠️ 開発ツール

- **IDE**: Kiro IDE 対応
- **テスト**: Vitest + Playwright
- **リンター**: ESLint + Prettier
- **型チェック**: TypeScript
- **CI/CD**: GitHub Actions 対応

## 📚 ドキュメント

- [AWS 本番デプロイ手順](AWS-PRODUCTION-DEPLOYMENT.md)
- [クイックデプロイガイド](QUICK-DEPLOY-GUIDE.md)
- [統合テストレポート](frontend/test-integration-report.md)
- [仕様書](.kiro/specs/attendance-management/)

## 💰 コスト見積もり

### 最小構成（開発・テスト）

- 月額約 $30

### 本番推奨構成

- 月額約 $100

詳細は [QUICK-DEPLOY-GUIDE.md](QUICK-DEPLOY-GUIDE.md) を参照

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 開発ガイドライン

- コミット前に `npm run test` でテスト実行
- セキュリティスキャン: `infrastructure/security-scan.sh`
- コードフォーマット: `npm run lint:fix`

## 📄 ライセンス

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 サポート

- 📧 技術サポート: admin@yourdomain.com
- 🐛 バグレポート: GitHub Issues
- 💬 ディスカッション: GitHub Discussions

## 🎯 ロードマップ

- [ ] モバイルアプリ対応
- [ ] 多言語対応拡張
- [ ] AI による勤務パターン分析
- [ ] Slack/Teams 連携
- [ ] 給与計算システム連携

---

**Built with ❤️ using modern technologies**
