# 社内MBO管理システム

Excel 分散管理による情報の孤立を解消し、目標・評価・履歴を一元管理する Web システムです。社員一人ひとりの目標と貢献が組織全体から見えることで、透明性の高い評価プロセスを実現します。

## 主な機能

| 機能 | 概要 | 対象ユーザー |
|------|------|------------|
| メールOTP認証 | パスワード不要の8桁ワンタイムコードでログイン | 全員 |
| 目標設定・承認フロー | KPI目標2件 + 組織貢献目標1件を4段階承認で確定 | 全員（等級3以上は承認対象） |
| 目標修正申請 | 期中の目標変更を承認フロー経由で反映 | 全員 |
| 中間振り返り | 進捗コメント入力・上長フィードバック | 全員 |
| 自己評価 / 上長評価 | 評価スコアとコメントを入力 | MEMBER / MANAGER |
| 評価調整・確定 | MBOスコア + 360度スコアを合算して最終評価を確定 | HR / ADMIN |
| 目標一覧（自部署 / 全社） | 社員・期・部署でフィルタして他者の目標を参照 | MANAGER以上 |
| 過去の評価閲覧 | 評価期別に過去の目標・評価結果を振り返り | 全員 |
| 社員プロフィール | プロフィール情報と全評価期の履歴を表示 | 全員（閲覧権限に応じて） |
| 評価サマリ | 部署・等級別の評価分布をグラフで確認 | HR / ADMIN |
| 承認・申請管理 | 承認待ち一覧を一元管理 | MANAGER以上 |
| 通知 | 承認申請・差し戻し・フェーズ切替をメールで通知 | 全員 |
| 社員 / 組織 / 評価期管理 | マスタデータの管理 | HR / ADMIN |
| SmartHR CSV連携 | 等級・評価者を CSV で一括更新 | HR / ADMIN |
| 監査ログ | 重要操作の記録を閲覧・追跡（保持10年） | ADMIN |

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|----------|
| フレームワーク | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| 言語 | TypeScript | 5.x |
| UIコンポーネント | shadcn/ui + Tailwind CSS | 4.x |
| ORM | Prisma | 7.x |
| データベース | PostgreSQL (Supabase) | 15.x |
| 認証 | Supabase Auth | - |
| ホスティング | Vercel | - |
| テスト | Jest / Testing Library / Playwright | - |

## 環境構築

### 前提条件

- Node.js 20 以上
- npm
- Supabase プロジェクト（ローカル開発用 or クラウド）
- PostgreSQL 15 以上

### 手順

**1. リポジトリをクローン**

```bash
git clone <repository-url>
cd mbo-sys
```

**2. 依存パッケージをインストール**

```bash
npm install
```

**3. 環境変数を設定**

`.env.local` を作成し、以下の変数を設定します。

```env
# Supabase PgBouncer 接続（アプリ実行用・port 6543）
DATABASE_URL=postgresql://...

# Supabase 直接接続（prisma migrate 専用・port 5432）
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 通知メール
NOTIFICATION_EDGE_FUNCTION_URL=https://...
NOTIFICATION_EDGE_FUNCTION_TOKEN=your-token

# アプリURL（メール内リンク生成用）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

AWS SES を使ったメール通知を有効にする場合は以下も追加します。

```env
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SES_FROM_EMAIL=noreply@example.com
```

**4. データベースのマイグレーション**

```bash
npx prisma migrate dev
```

**5. シードデータの投入（任意）**

```bash
npx prisma db seed
```

**6. 開発サーバーを起動**

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスして確認できます。

## 利用可能なコマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# Lint
npm run lint

# 型チェック
npx tsc --noEmit

# ユニット / コンポーネントテスト
npm test

# E2Eテスト
npm run test:e2e

# Prisma Studio（DB データ確認）
npx prisma studio

# マイグレーション作成（開発）
npx prisma migrate dev --name <migration-name>

# マイグレーション適用（本番）
npx prisma migrate deploy
```

## ロールと権限

| ロール | 説明 | 主な権限 |
|--------|------|---------|
| `ADMIN` | システム管理者 | 全操作・全データへのアクセス |
| `HR` | 人事担当者 | 評価確定・全社データ閲覧・CSV連携 |
| `MANAGER` | 上長・管理職 | 配下メンバーの承認・評価入力 |
| `TEAM_LEADER` | チームリーダー | 担当チームの目標確認・コメント入力 |
| `MEMBER` | 一般社員 | 自身の目標設定・評価入力 |

1ユーザーが複数ロールを持つことができます。`HR` または `ADMIN` ロールを持つユーザーは管理者権限を持ちます。

## プロジェクト構造

```
mbo-sys/
├── src/
│   ├── app/
│   │   ├── (auth)/          # 認証ページ（ログイン等）
│   │   ├── (main)/          # 認証済みページ
│   │   │   ├── dashboard/
│   │   │   ├── goals/       # 目標設定・一覧
│   │   │   ├── approvals/   # 承認管理
│   │   │   ├── evaluations/ # 評価・過去履歴
│   │   │   ├── employees/   # 社員プロフィール
│   │   │   ├── reports/     # 評価サマリ
│   │   │   ├── notifications/
│   │   │   └── admin/       # 管理者機能
│   │   └── api/             # Route Handlers (REST API)
│   ├── components/
│   │   ├── ui/              # shadcn/ui ベースコンポーネント
│   │   ├── layout/          # Sidebar・Header等
│   │   ├── goals/           # 目標関連コンポーネント
│   │   └── ...
│   ├── lib/
│   │   ├── db.ts            # Prisma シングルトン
│   │   ├── permissions.ts   # RBAC ヘルパー
│   │   ├── phases.ts        # フェーズ制御
│   │   ├── audit.ts         # 監査ログ
│   │   └── ...
│   └── hooks/               # カスタムフック
├── prisma/
│   ├── schema.prisma        # DBスキーマ定義
│   ├── migrations/          # マイグレーションファイル
│   └── seed.ts              # シードデータ
└── docs/                    # 設計ドキュメント
    ├── product-requirements.md
    ├── functional-design.md
    ├── architecture.md
    ├── development-guidelines.md
    └── glossary.md
```

## デプロイ

### Vercel（本番環境）

1. Vercel プロジェクトを作成し、このリポジトリを接続
2. Vercel の環境変数設定に `.env.local` の内容を登録
3. `main` ブランチへのマージで自動デプロイ

### データベース（Supabase）

1. Supabase でプロジェクトを作成
2. `DATABASE_URL`（PgBouncer・port 6543）と `DIRECT_URL`（直接接続・port 5432）を取得して設定
3. `npx prisma migrate deploy` でマイグレーションを適用

### ブランチ運用

| ブランチ | 環境 | 用途 |
|---------|------|------|
| `main` | 本番 | 実運用 |
| `feature/*` | プレビュー（Vercelが自動生成） | 開発・QA |

## ドキュメント

設計ドキュメントは [docs/](docs/) ディレクトリに格納されています。

- [プロダクト要求定義書](docs/product-requirements.md)
- [機能設計書](docs/functional-design.md)
- [技術仕様書](docs/architecture.md)
- [開発ガイドライン](docs/development-guidelines.md)
- [ユビキタス言語定義](docs/glossary.md)
