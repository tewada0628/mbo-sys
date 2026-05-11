# 技術仕様書

**プロジェクト名**: 社内MBO管理システム  
**バージョン**: 1.0  
**作成日**: 2026-04-30  
**対象読者**: 開発担当者、プロジェクトマネージャー  
**参照**: `docs/specification.md` v1.9

---

## 目次

1. [テクノロジースタック](#1-テクノロジースタック)
2. [インフラ構成](#2-インフラ構成)
3. [開発ツールと手法](#3-開発ツールと手法)
4. [パフォーマンス要件](#4-パフォーマンス要件)
5. [セキュリティ要件](#5-セキュリティ要件)
6. [可用性・信頼性要件](#6-可用性信頼性要件)
7. [保守性・拡張性要件](#7-保守性拡張性要件)
8. [アクセシビリティ要件](#8-アクセシビリティ要件)
9. [将来のAWS移行方針](#9-将来のaws移行方針)

---

## 1. テクノロジースタック

### 1.1 採用技術一覧

| レイヤー | 技術 | バージョン | 採用理由 |
| ------- | -- | ------- | ------ |
| フロントエンド | Next.js (App Router) | 14.x | SSR/RSC対応・Vercelとの親和性 |
| 言語 | TypeScript | 5.x | 型安全性・開発効率 |
| UIコンポーネント | shadcn/ui | CLI管理 | アクセシビリティ対応済み・Tailwind統合。CLI でコンポーネントをソースコードとしてコピーする方式のため npm バージョン管理の対象外。CLI 自体のバージョンは `devDependencies` で固定する |
| CSSフレームワーク | Tailwind CSS | 3.x | ユーティリティファースト・デザイン統一 |
| バックエンド | Next.js Route Handlers | - | Next.jsと同一リポジトリで管理・フルスタック構成 |
| ORM | Prisma | 5.x | TypeScript型安全・マイグレーション管理 |
| データベース | PostgreSQL (Supabase) | 15.x | Supabase PgBouncer内蔵でコネクションプール管理 |
| 認証 | Supabase Auth | - | メールOTP認証（パスワード不要）。JWT発行・セッション管理 |
| ホスティング | Vercel | - | CI/CD・プレビュー環境・Edge Networkが組み込み済み |
| ファイルストレージ | Supabase Storage | - | 将来の添付ファイル対応。S3互換API |
| メール通知 | Supabase Edge Functions + SendGrid | - | トランザクションメール配信 |
| CI/CD | GitHub Actions + Vercel | - | Lint・テスト・デプロイの自動化 |

### 1.2 フロントエンド詳細

#### Next.js App Router の採用方針

| 機能 | 実装方針 |
| -- | ------ |
| ページコンポーネント | React Server Components (RSC) をデフォルトとし、インタラクションが必要な箇所のみ `'use client'` を付与 |
| データフェッチ | RSC での `fetch` / Prisma 直接呼び出しを基本とする。クライアントサイドの再フェッチは **SWR** を使用 |
| ルーティング | App Router のファイルシステムベースルーティング。動的ルートは `[goalSetId]` 等のセグメントで表現 |
| 認証ガード | `middleware.ts` でJWT検証。未認証時は `/login` にリダイレクト |
| レイアウト | ルートレイアウト（`app/layout.tsx`）にAppShellを配置。認証済みページは `(main)` グループ配下に配置 |

#### UIデザインシステム

- **基本色**: `#01AEBB`（プライマリ）/ `#FFFFFF`（白）
- 状態表示・アラートにのみ補助色を使用（エラー `#C0392B` / 成功 `#27AE60` / 警告 `#E67E22`）
- shadcn/ui のコンポーネントをベースとし、Tailwind CSS でカスタマイズ
- 日本語UIのみ対応（多言語対応は将来検討）

### 1.3 バックエンド詳細

#### API設計方針

- **REST API**: Next.js Route Handlers で実装
- **認可チェック**: 各 Route Handler の先頭で `lib/permissions.ts` を呼び出し、ロールと所有者チェックを実施
- **フェーズ制御**: `period_phases` テーブルを参照し、フェーズ外操作は `403 Forbidden` を返す。例外は `is_midterm_entry` / `is_midterm_closed` フラグによりHR/ADMINが許可した場合のみ
- **入力バリデーション**: Zod スキーマによるリクエストボディ検証

#### Prisma ORM の利用方針

- `prisma/schema.prisma` でスキーマを一元管理
- マイグレーションは `prisma migrate dev`（開発）/ `prisma migrate deploy`（本番）を使用
- コネクションプールは Supabase PgBouncer（Transaction モード）に委ねる
- `lib/db.ts` でシングルトンの Prisma クライアントを管理（Next.js の HMR によるコネクション枯渇を防止）

> **PgBouncer Transaction モードの制限**: Transaction モードでは Prisma の Interactive Transactions（`prisma.$transaction(callback)` 形式）が利用できない。複数操作をアトミックに実行する場合は、クエリ配列渡し形式（`prisma.$transaction([...])`）を使用する。`prisma migrate` はプールを経由できないため、`schema.prisma` に2つの接続先を設定する。
>
> ```prisma
> datasource db {
>   provider  = "postgresql"
>   url       = env("DATABASE_URL")   // PgBouncer 接続（アプリ実行用・port 6543）
>   directUrl = env("DIRECT_URL")     // 直接接続（prisma migrate 専用・port 5432）
> }
> ```

---

## 2. インフラ構成

### 2.1 ベータ版構成（現フェーズ）

```text
ユーザー（ブラウザ）
  ↓ HTTPS
Vercel（Edge Network）
  ├ Next.js ページ（SSR / RSC）
  └ Next.js Route Handlers（REST API）
       ↓ Prisma ORM
       Supabase
         ├ PostgreSQL（メインDB）← PgBouncer でコネクションプール
         ├ Auth（JWT発行・検証）
         └ Storage（将来の添付ファイル）
       ↓ Webhook
       Supabase Edge Functions
         └ SendGrid（メール通知）

SmartHR → CSV → Vercel（`POST /api/admin/smarthr/import`）
```

### 2.2 環境構成

| 環境 | 用途 | ブランチ | URL |
| -- | -- | ------- | -- |
| 開発（local） | 個人開発・動作確認 | 各 `feature/*` ブランチ | `localhost:3000` |
| ステージング | QA・受け入れテスト | 各PR（Vercel が自動生成） | PR ごとのプレビュー URL |
| 本番 | 実運用 | `main` | 専用ドメイン |

各環境は独立した Supabase プロジェクトおよび Vercel プロジェクトを使用し、DB・認証設定を完全分離する。

### 2.3 CI/CD パイプライン

```text
git push / PR作成
  ↓
GitHub Actions
  ├ Lint（ESLint + Prettier）
  ├ 型チェック（tsc --noEmit）
  └ テスト（Jest + Testing Library）
       ↓ All pass
Vercel（自動デプロイ）
  ├ PR → プレビュー環境（ステージング）
  └ main マージ → 本番環境
```

### 2.4 環境変数一覧

アプリケーション実行に必要な環境変数を以下に定義する。`.env.example` にキー一覧（値は空）を管理し、新規参画者のセットアップ参照用とする。`NEXT_PUBLIC_` プレフィックスの変数はブラウザに公開される。

| 変数名 | 公開範囲 | 説明 |
| ----- | ------ | -- |
| `DATABASE_URL` | サーバーのみ | Supabase PgBouncer 接続文字列（port 6543・アプリ実行用） |
| `DIRECT_URL` | サーバーのみ | Supabase 直接接続文字列（port 5432・`prisma migrate` 専用） |
| `NEXT_PUBLIC_SUPABASE_URL` | 公開 | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開 | Supabase 匿名キー（クライアント認証用） |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーのみ | Supabase サービスロールキー（管理操作用。絶対にクライアントに渡さない） |
| `SENDGRID_API_KEY` | サーバーのみ | SendGrid API キー（メール通知用） |
| `NEXT_PUBLIC_APP_URL` | 公開 | アプリのベース URL（メール内リンク生成用。例: `https://mbo.example.com`） |

---

## 3. 開発ツールと手法

### 3.1 開発ツール一覧

| ツール | 用途 |
| ---- | -- |
| ESLint | JavaScript / TypeScript 静的解析 |
| Prettier | コードフォーマット |
| Jest | ユニット・インテグレーションテスト |
| Testing Library | Reactコンポーネントテスト |
| Playwright | E2Eテスト（主要フロー） |
| Prisma Studio | DB データ確認・デバッグ |
| Supabase CLI | DB マイグレーション・ローカル開発環境 |

### 3.2 コーディング規約

詳細は `docs/development-guidelines.md` に定義する。主要方針を以下に示す。

- **言語**: TypeScript strict モード（`strict: true`）
- **命名規則**: コンポーネントは PascalCase / 変数・関数は camelCase / DB カラム・API パラメータは snake_case
- **コメント**: WHY が非自明な箇所のみ記述。コードで表現できる WHAT は書かない
- **セキュリティ**: XSS・SQLインジェクション・CSRF 対策を標準実装に含む

### 3.3 テスト方針

| テスト種別 | 対象 | ツール | カバレッジ目標 |
| ------- | -- | ---- | ---------- |
| ユニットテスト | ビジネスロジック（スコア計算・権限チェック） | Jest | 80%以上 |
| コンポーネントテスト | UIコンポーネント（GoalCard・ApprovalStepIndicator等） | Testing Library | ビジネスロジックを含むコンポーネント全件 |
| E2Eテスト | 主要フロー（目標設定→承認→評価確定） | Playwright | クリティカルパス |
| 手動テスト | UI・UX確認 | ブラウザ | リリース前全画面確認 |

### 3.4 Git 運用方針

- **ブランチ戦略**: GitHub Flow（`main` + `feature/*`）
- **コミットメッセージ**: Conventional Commits 形式（`feat:` / `fix:` / `docs:` 等）
- **PR**: セルフレビュー + 1名以上のレビュー承認後にマージ
- **マイグレーション**: Prisma マイグレーションファイルは必ずコミットに含める

---

## 4. パフォーマンス要件

| 要件 | 目標値 | 計測条件 |
| -- | ---- | ------ |
| 画面レスポンスタイム（通常操作） | 95パーセンタイルで2秒以内 | 同時接続100ユーザー時 |
| 目標一覧ページのロード | 3秒以内 | 最大500件表示時 |
| 同時接続ユーザー数 | 最大100ユーザー同時接続に対応 | 評価フェーズのピーク時 |
| データ保存期間 | 10年間 | 目標・評価・監査ログすべて |

### 4.1 ピーク時の対策

評価フェーズ（10月・2月・7月・8〜9月）に負荷が集中する。以下の対策を実施する。

- **Supabase PgBouncer**: Transaction モードのコネクションプールにより、100同時接続を適切にさばく
- **Vercel Edge Network**: 静的アセットのエッジキャッシュによりオリジン負荷を軽減
- **RSC**: サーバーサイドレンダリングによりクライアント JavaScript バンドルを最小化
- **事前負荷確認**: 各評価フェーズ開始前に想定ピーク負荷でのパフォーマンステストを実施

### 4.2 データベースパフォーマンス設計

- `goal_sets(employee_id, evaluation_period_id)` に条件付きユニークインデックス（`WHERE is_active = TRUE`）
- `goals.weight` 合計100%保証に DBトリガー を使用（アプリ層バリデーションとの二重担保）
- `approval_requests(goal_set_id)` / `organization_memberships(employee_id, valid_to)` にインデックスを設定
- N+1クエリを防ぐため、Prisma の `include` / `select` で必要なリレーションを一括ロード

---

## 5. セキュリティ要件

### 5.1 認証

- **方式**: Supabase Auth によるメールOTP認証（パスワード不要・2ステップ式）
  - Step 1: メールアドレスを入力 → Supabase が8桁の数字コードを送信（`signInWithOtp()`）
  - Step 2: 届いたコードを入力 → Supabase が検証してJWTを発行（`verifyOtp()`）
- **OTP有効期限**: 60分（Supabase Auth 設定で変更可能）
- **新規ユーザー自動作成**: 無効（`shouldCreateUser: false`）。事前にADMINが登録したメールアドレスのみログイン可
- **JWT**: Supabase が発行するJWTをセッショントークンとして使用
- **セッションタイムアウト**: 非アクティブ30分でセッションを失効

### 5.2 認可

- **RBAC**: ロールベースアクセス制御を API レベルで徹底する
- **所有者チェック**: 他ユーザーのリソースへのアクセスは、ロール + 所有者（または配下関係）で制御
- **フェーズ制御**: フェーズ外のデータ変更操作を API レベルで拒否（403）
- **承認後編集制限**: `APPROVED` / `PENDING_*` ステータスの目標への直接編集を API レベルで拒否

### 5.3 通信・データ保護

- **HTTPS**: 全通信を TLS 1.2 以上で暗号化
- **入力バリデーション**: Zod スキーマで全 API 入力を検証。SQLインジェクション・XSS を防止
- **環境変数**: DB接続情報・API キーは環境変数で管理。コードにハードコードしない

### 5.4 監査ログ

- **対象操作**: 目標の作成・編集・承認・差し戻し・評価確定・ユーザー管理・等級変更
- **保存期間**: 10年間（目標・評価データと同等。人事制度上の証跡として評価期をまたいだ参照が必要なため）
- **記録内容**: 操作者 ID・操作日時・操作種別・対象リソース・変更前後の値（JSON）

---

## 6. 可用性・信頼性要件

| 要件 | 目標値 |
| -- | ---- |
| 稼働率 | 99.5%以上（計画メンテナンスを除く） |
| バックアップ | 日次自動バックアップ・7世代保持（Supabase標準機能） |
| 障害復旧目標（RTO） | 4時間以内 |
| データ復旧目標（RPO） | 24時間以内（日次バックアップ起点） |

### 6.1 Supabase の高可用性設定

- Supabase Pro プラン以上でポイントインタイムリカバリ（PITR）を有効化
- 本番 DB は Supabase マネージド PostgreSQL の HA 構成を使用

### 6.2 障害対応方針

- **Vercel 障害**: Vercel Status ページを監視。障害時は Vercel サポートに連絡
- **Supabase 障害**: Supabase Status ページを監視。DB 障害時は最新バックアップから復旧
- **データ不整合**: `audit_logs` を参照して変更履歴を追跡し、手動修正または Prisma マイグレーションで対応

---

## 7. 保守性・拡張性要件

### 7.1 将来の拡張ポイント

| 拡張項目 | 現在の実装 | 将来の対応 |
| ------ | ------- | ------- |
| 360度評価スコア連携 | HR手動入力 / CSVインポート | 社内360度評価システムとのAPI自動連携（`POST /api/admin/degree360-scores/import`） |
| モバイルアプリ対応 | Web のみ（レスポンシブ対応） | REST API設計を維持することでモバイルアプリが同一APIを利用可能 |
| 添付ファイル | 未実装（Supabase Storage 設計のみ） | 目標・評価コメントへのファイル添付 |
| 多言語対応 | 日本語のみ | next-intl 等の国際化ライブラリで対応 |
| AWS移行 | Vercel + Supabase | セクション9を参照 |

### 7.2 環境分離

- 開発 / ステージング / 本番の3環境を独立した Supabase プロジェクトとして管理
- 環境間の設定差異は環境変数（`.env.local` / Vercel 環境変数）で吸収

### 7.3 依存性管理

- `package.json` で依存パッケージのバージョンを管理
- Prisma スキーマと DB マイグレーションファイルはコードと同一リポジトリで管理
- セキュリティパッチは月次で確認・適用する

---

## 8. アクセシビリティ要件

- **準拠目標**: WCAG 2.1 AA
- **キーボード操作**: 全インタラクティブ要素をキーボードで操作可能とする
- **スクリーンリーダー**: shadcn/ui の ARIA 属性を活用し、スクリーンリーダー対応を確保
- **カラーコントラスト**: プライマリ `#01AEBB` と白 `#FFFFFF` のコントラスト比は約 **2.7:1** であり、WCAG AA の通常テキスト基準（4.5:1）を満たさない。そのため `#01AEBB` はボタン背景・ボーダー・アイコン等の装飾要素に限定し、テキストカラーとしては使用しない。本文テキストは `#1A1A1A`（白背景との比 約16:1）を基本とする
- **フォームバリデーション**: エラーメッセージはテキストで提供し、色のみに依存しない

---

## 9. 将来のAWS移行方針

ベータ版（Vercel + Supabase）から本番運用（AWS）への移行は以下の方針で行う。

| レイヤー | ベータ版 | 本番（AWS） | 移行コスト |
| ------- | ------ | --------- | ------- |
| フロントエンド | Vercel | AWS Amplify Hosting | Next.jsのままデプロイ先変更のみ |
| データベース | Supabase PostgreSQL | Amazon RDS for PostgreSQL | PostgreSQL → PostgreSQL のため移行容易 |
| コネクションプール | Supabase PgBouncer内蔵 | Amazon RDS Proxy | 設定変更のみ |
| 認証 | Supabase Auth（メールOTP認証） | Amazon Cognito | Cognito の Magic Link / OTP に切り替え |
| ストレージ | Supabase Storage | Amazon S3 | SDK切り替えのみ |
| メール通知 | SendGrid | Amazon SES | 送信API切り替えのみ |

### 9.1 AWS本番構成イメージ

```text
ユーザー
  ↓
CloudFront + WAF
  ↓
Amplify Hosting（Next.js）
  ↓
RDS Proxy（コネクションプール管理）
  ↓
RDS for PostgreSQL（プライベートサブネット内）
```

### 9.2 移行時の注意点

- Prisma の接続文字列を RDS に変更するだけで ORM レイヤーは移行可能
- Supabase Auth → Amazon Cognito 移行時はメールアドレスをエクスポートし、Cognito ユーザープールにインポートする（パスワードがないため移行はシンプル）
- Supabase の Row Level Security（RLS）を使用している場合は事前に解除し、API層の RBAC に一本化する
- 移行前に Supabase から PostgreSQL ダンプを取得し、RDS にリストアして動作確認を実施する
