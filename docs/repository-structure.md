# リポジトリ構造定義書

**プロジェクト名**: 社内MBO管理システム  
**バージョン**: 1.1  
**作成日**: 2026-04-30  
**対象読者**: 開発担当者  
**参照**: `docs/functional-design.md` v1.0 / `docs/architecture.md` v1.0

---

## 目次

1. [ルートディレクトリ構成](#1-ルートディレクトリ構成)
2. [src ディレクトリ詳細](#2-src-ディレクトリ詳細)
3. [ファイル配置ルール](#3-ファイル配置ルール)
4. [命名規則](#4-命名規則)

---

## 1. ルートディレクトリ構成

```text
/（プロジェクトルート）
├── .github/
│   └── workflows/          # GitHub Actions ワークフロー定義
├── .steering/              # 作業単位のステアリングドキュメント（CLAUDE.md 参照）
├── docs/                   # 永続的ドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md   ← 本ファイル
│   ├── development-guidelines.md
│   ├── glossary.md
│   └── specification.md    # 仕様書（参照元）
├── src/                    # アプリケーションソースコード
├── prisma/                 # Prisma スキーマ・マイグレーション
├── public/                 # 静的アセット（favicon・OGP画像等）
├── e2e/                    # Playwright E2E テスト
├── __tests__/              # Jest テストファイル（ユニット・コンポーネント）
├── .env.local              # ローカル環境変数（git管理対象外）
├── .env.example            # 環境変数のサンプル（git管理対象）
├── .gitignore
├── .eslintrc.json          # ESLint 設定
├── .prettierrc             # Prettier 設定
├── next.config.ts          # Next.js 設定
├── tailwind.config.ts      # Tailwind CSS 設定
├── postcss.config.js       # PostCSS 設定（Tailwind CSS + Next.js で必須）
├── tsconfig.json           # TypeScript 設定
├── jest.config.ts          # Jest 設定（ユニット・コンポーネントテスト）
├── playwright.config.ts    # Playwright 設定（E2E テスト）
└── package.json
```

### 1.1 ルートの重要ファイル

| ファイル | 用途 |
| ------ | -- |
| `.env.local` | ローカル開発用の環境変数。`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 等を設定。git 管理対象外 |
| `.env.example` | 環境変数のキー一覧（値は空）。新規参画者向けのセットアップガイドを兼ねる |
| `next.config.ts` | Next.js の設定。リダイレクト・画像ドメイン許可・環境変数の公開範囲を定義 |
| `tailwind.config.ts` | カスタムカラー（`primary: #01AEBB` 等）のテーマ設定 |
| `postcss.config.js` | Tailwind CSS の PostCSS プラグイン設定（Next.js + Tailwind では必須） |
| `playwright.config.ts` | E2E テストのベースURL・ブラウザ・タイムアウト設定 |

---

## 2. src ディレクトリ詳細

`src/` 配下のソースコード構成を示す。Next.js App Router では `app/api/` は `app/` の子ディレクトリとして配置する。

```text
src/
├── app/                    # Next.js App Router のルートディレクトリ
│   ├── layout.tsx          # ルートレイアウト（フォント・グローバルCSS読み込み）
│   ├── globals.css         # グローバルスタイル
│   ├── (auth)/             # 認証不要ページ群（Route Group）
│   │   └── login/
│   │       └── page.tsx    # S-01 ログイン画面
│   ├── (main)/             # 認証必要ページ群（Route Group）
│   │   ├── layout.tsx      # AppShell（サイドバー・ヘッダー）を埋め込む共通レイアウト
│   │   ├── dashboard/
│   │   │   └── page.tsx    # S-02 ダッシュボード
│   │   ├── goals/
│   │   │   ├── page.tsx    # S-09 目標一覧（自部署）
│   │   │   ├── all/
│   │   │   │   └── page.tsx  # S-10 目標一覧（全社）
│   │   │   ├── new/
│   │   │   │   └── page.tsx  # S-03 目標設定画面
│   │   │   └── [goalSetId]/
│   │   │       ├── page.tsx          # S-04 目標詳細・編集画面
│   │   │       ├── revision/
│   │   │       │   └── page.tsx      # S-05 目標修正申請画面
│   │   │       ├── self-review/
│   │   │       │   └── page.tsx      # S-06 自己評価入力画面
│   │   │       └── manager-review/
│   │   │           └── page.tsx      # S-07 上長評価入力画面
│   │   ├── approvals/
│   │   │   └── page.tsx    # S-15 承認・申請管理画面
│   │   ├── evaluations/
│   │   │   └── history/
│   │   │       └── page.tsx  # S-18 過去の評価閲覧画面
│   │   ├── employees/
│   │   │   └── [employeeId]/
│   │   │       └── page.tsx  # S-11 社員プロフィール・履歴画面
│   │   ├── reports/
│   │   │   └── summary/
│   │   │       └── page.tsx  # S-16 評価サマリ画面
│   │   ├── notifications/
│   │   │   └── page.tsx    # S-17 通知一覧画面
│   │   └── admin/
│   │       ├── users/
│   │       │   └── page.tsx          # S-12 ユーザー管理画面
│   │       ├── organizations/
│   │       │   └── page.tsx          # S-13 組織管理画面
│   │       ├── periods/
│   │       │   └── page.tsx          # S-14 評価期管理画面
│   │       └── review-adjustment/
│   │           └── page.tsx          # S-08 評価調整・確定画面
│   └── api/                # REST API（Next.js Route Handlers）
│       ├── goals/
│       │   ├── route.ts                        # GET /api/goals, POST /api/goals
│       │   └── [goalSetId]/
│       │       ├── route.ts                    # GET, PATCH /api/goals/:goalSetId
│       │       ├── submit/
│       │       │   └── route.ts                # POST /api/goals/:goalSetId/submit
│       │       ├── revision/
│       │       │   └── route.ts                # POST /api/goals/:goalSetId/revision
│       │       ├── meeting-reject/
│       │       │   └── route.ts                # POST /api/goals/:goalSetId/meeting-reject
│       │       ├── midterm-review/
│       │       │   └── route.ts                # POST /api/goals/:goalSetId/midterm-review
│       │       ├── self-review/
│       │       │   └── route.ts                # POST /api/goals/:goalSetId/self-review
│       │       └── manager-review/
│       │           └── route.ts                # POST /api/goals/:goalSetId/manager-review
│       ├── approvals/
│       │   ├── route.ts                        # GET /api/approvals
│       │   └── [requestId]/
│       │       ├── approve/
│       │       │   └── route.ts                # POST /api/approvals/:requestId/approve
│       │       └── reject/
│       │           └── route.ts                # POST /api/approvals/:requestId/reject
│       ├── employees/
│       │   └── [employeeId]/
│       │       └── history/
│       │           └── route.ts                # GET /api/employees/:employeeId/history
│       ├── notifications/
│       │   ├── route.ts                        # GET /api/notifications
│       │   └── [id]/
│       │       └── read/
│       │           └── route.ts                # PATCH /api/notifications/:id/read
│       ├── reports/
│       │   └── summary/
│       │       └── route.ts                    # GET /api/reports/summary
│       └── admin/
│           ├── users/
│           │   ├── route.ts                    # GET, POST /api/admin/users
│           │   └── [userId]/
│           │       └── route.ts                # PATCH /api/admin/users/:userId
│           ├── organizations/
│           │   └── route.ts                    # GET, POST /api/admin/organizations
│           ├── periods/
│           │   ├── route.ts                    # GET, POST /api/admin/periods
│           │   └── [periodId]/
│           │       └── phases/
│           │           └── route.ts            # PATCH /api/admin/periods/:periodId/phases
│           ├── goal-sets/
│           │   └── [goalSetId]/
│           │       └── route.ts                # PATCH /api/admin/goal-sets/:goalSetId
│           ├── evaluations/
│           │   ├── route.ts                    # GET /api/admin/evaluations
│           │   └── [goalSetId]/
│           │       ├── route.ts                # PATCH /api/admin/evaluations/:goalSetId
│           │       └── score-preview/
│           │           └── route.ts            # GET /api/admin/evaluations/:goalSetId/score-preview
│           ├── degree360-scores/
│           │   ├── route.ts                    # POST /api/admin/degree360-scores
│           │   └── import/
│           │       └── route.ts                # POST /api/admin/degree360-scores/import
│           ├── smarthr/
│           │   └── import/
│           │       └── route.ts                # POST /api/admin/smarthr/import
│           └── audit-logs/
│               └── route.ts                    # GET /api/admin/audit-logs
├── components/             # 再利用可能なUIコンポーネント
│   ├── ui/                 # shadcn/ui ベースの汎用コンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── layout/             # レイアウト系コンポーネント
│   │   ├── AppShell.tsx    # サイドバー + ヘッダー + メインコンテンツ
│   │   ├── Sidebar.tsx     # 左ナビゲーション（ロール別メニュー）
│   │   └── Header.tsx      # トップバー（通知アイコン・ユーザーメニュー）
│   ├── goals/              # 目標関連コンポーネント
│   │   ├── GoalCard.tsx
│   │   ├── GoalForm.tsx
│   │   ├── GoalVersionHistory.tsx
│   │   ├── ApprovalStepIndicator.tsx
│   │   ├── GoalVisibilityBadge.tsx
│   │   └── KpiPatternGuide.tsx
│   ├── reviews/            # 評価関連コンポーネント
│   │   ├── MidtermReviewForm.tsx
│   │   ├── SelfReviewForm.tsx
│   │   ├── ManagerReviewForm.tsx
│   │   ├── BiasWarningBanner.tsx
│   │   └── ScoreDisplay.tsx
│   ├── approvals/          # 承認関連コンポーネント
│   │   ├── ApprovalList.tsx
│   │   ├── ApprovalActionModal.tsx
│   │   └── MeetingRejectModal.tsx
│   ├── notifications/      # 通知関連コンポーネント
│   │   └── NotificationList.tsx
│   └── admin/              # 管理画面専用コンポーネント
│       ├── UserManagementTable.tsx
│       ├── OrganizationTree.tsx
│       ├── PeriodForm.tsx
│       └── EvaluationAdjustmentTable.tsx
├── lib/                    # ユーティリティ・設定
│   ├── auth.ts             # Supabase Auth 設定（セッション取得・ログアウト等）
│   ├── db.ts               # Prisma クライアント（シングルトン）
│   ├── permissions.ts      # RBAC 権限チェックロジック
│   ├── score.ts            # MBOスコア・360度スコア計算ロジック
│   ├── phases.ts           # フェーズ判定ロジック（現在フェーズの取得等）
│   ├── notifications.ts    # 通知送信ロジック（DB書き込み + Edge Function呼び出し）
│   └── validations/        # Zod スキーマ定義（Route Handler からインポートして使用）
│       ├── goal.ts         # 目標関連のバリデーションスキーマ
│       ├── review.ts       # 評価関連のバリデーションスキーマ
│       └── admin.ts        # 管理操作関連のバリデーションスキーマ
├── hooks/                  # カスタム React Hooks
│   ├── useCurrentUser.ts   # ログインユーザー情報の取得
│   └── useNotifications.ts # 通知一覧の取得・既読更新
├── types/                  # TypeScript 型定義
│   └── index.ts            # 共通型・Prisma生成型の再エクスポート
└── proxy.ts                 # JWT 検証・未認証リダイレクト（Next.js Proxy）
```

プロジェクトルートのその他ディレクトリ:

```text
prisma/
├── schema.prisma           # Prisma スキーマ定義（全テーブル）
└── migrations/             # マイグレーションファイル（自動生成）
    └── YYYYMMDDHHMMSS_*/
        └── migration.sql
```

```text
public/
├── favicon.ico
└── images/                 # 静的画像（OGP等）
```

```text
e2e/                        # Playwright E2E テスト（Jest の管理外）
├── goal-setting.spec.ts    # 目標設定〜承認フローの E2E テスト
└── evaluation.spec.ts      # 自己評価〜評価確定の E2E テスト
```

```text
__tests__/                  # Jest テストファイル（ユニット・コンポーネント）
├── unit/
│   ├── lib/
│   │   ├── score.test.ts           # スコア計算ロジックのユニットテスト
│   │   └── permissions.test.ts     # 権限チェックロジックのユニットテスト
│   └── components/
│       └── goals/
│           └── ApprovalStepIndicator.test.tsx
```

---

## 3. ファイル配置ルール

### 3.1 ページコンポーネント（`app/` 配下）

- 各ページは `page.tsx` として配置する（App Router の規約）
- ページ固有のロジックはページファイル内に直接記述せず、`components/` または `lib/` に切り出す
- ページコンポーネントはデフォルトで React Server Component（RSC）とする
- クライアントインタラクションが必要な箇所のみ `'use client'` ディレクティブを付与する

### 3.2 API Route Handler（`app/api/` 配下）

- 各エンドポイントは `route.ts` として配置する（`src/app/api/` 以下に Next.js の規約に従い配置）
- 1ファイルに複数の HTTP メソッドを定義してよい（例: `GET` と `POST` を同一ファイルに記述）
- Route Handler の先頭で必ず以下を実行する:
  1. Supabase Auth によるセッション検証
  2. `lib/permissions.ts` によるロール・所有者チェック
  3. `lib/validations/` の Zod スキーマによるリクエストボディのバリデーション

### 3.3 コンポーネント（`components/` 配下）

- 汎用UIコンポーネントは `ui/` に配置する（shadcn/ui のコンポーネントはここに生成される）
- ドメイン固有のコンポーネントはドメイン名のサブディレクトリに配置する（`goals/` / `reviews/` 等）
- コンポーネントファイルは PascalCase で命名する（例: `GoalCard.tsx`）

### 3.4 ライブラリ（`lib/` 配下）

- ビジネスロジック（スコア計算・フェーズ判定・通知送信）は `lib/` に集約する
- Prisma クライアントは `lib/db.ts` のシングルトンのみを使用する（直接 `new PrismaClient()` しない）
- 外部サービスとの接続設定（Supabase Auth 等）はすべて `lib/` に集約し、ページ・コンポーネントから直接 import しない
- API バリデーションに使用する Zod スキーマは `lib/validations/` に配置し、Route Handler からインポートする

### 3.5 型定義（`types/` 配下）

- Prisma が生成する型（`@prisma/client` の型）は `types/index.ts` で再エクスポートする
- アプリケーション固有の型（`GoalSetStatus` 等の union type）は `types/index.ts` に定義する
- ページ・コンポーネント固有の型はそのファイル内に定義してよい（`types/` に置かない）

### 3.6 テスト

- **ユニット・コンポーネントテスト**: `__tests__/` に配置し、Jest + Testing Library で実行する。ディレクトリ構造は `src/` の対応するパスを `__tests__/unit/` 以下にミラーする
- **E2E テスト**: `e2e/` に配置し、Playwright で実行する。Jest の管理外とするため `__tests__/` には置かない
- ファイル名はテスト対象と対応させる（`score.ts` → `score.test.ts`）

---

## 4. 命名規則

| 対象 | 規則 | 例 |
| -- | -- | - |
| ページコンポーネントファイル | `page.tsx`（固定） | `app/(main)/dashboard/page.tsx` |
| Route Handler ファイル | `route.ts`（固定） | `app/api/goals/route.ts` |
| コンポーネントファイル | PascalCase + `.tsx` | `GoalCard.tsx` |
| ライブラリファイル | camelCase + `.ts` | `permissions.ts` |
| 型定義ファイル | camelCase + `.ts` | `index.ts` |
| テストファイル（Jest） | `対象ファイル名.test.ts(x)` | `score.test.ts` |
| テストファイル（Playwright） | `機能名.spec.ts` | `goal-setting.spec.ts` |
| React コンポーネント | PascalCase | `GoalCard` / `ApprovalStepIndicator` |
| 関数・変数 | camelCase | `getMboScore` / `currentUser` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_GOALS_PER_SET` |
| DB テーブル名 | snake_case（Prisma スキーマ） | `goal_sets` / `approval_requests` |
| API パスパラメータ | camelCase | `:goalSetId` / `:employeeId` |
| 環境変数 | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_APP_URL` |
