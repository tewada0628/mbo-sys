# 初回実装 設計書

<!-- markdownlint-disable MD024 -->

**ステアリングディレクトリ**: `.steering/20260430-initial-implementation/`  
**作成日**: 2026-04-30  
**参照**: `requirements.md`（同ディレクトリ）/ `docs/functional-design.md` v1.0 / `docs/architecture.md` v1.0 / `docs/repository-structure.md` v1.1

---

## 1. 実装アプローチ

### 1.1 実装順序の方針

以下の順序で実装を進める。後続のフェーズは前フェーズの完了を前提とする。

```text
フェーズ1: 環境セットアップ
   ↓
フェーズ2: DBスキーマ + Prisma セットアップ
   ↓
フェーズ3: 認証（S-01）
   ↓
フェーズ4: 共通レイアウト（AppShell）
   ↓
フェーズ5: P0コア機能（目標設定・承認フロー・評価）
   ↓
フェーズ6: P1追加機能（管理画面・通知・過去評価）
   ↓
フェーズ7: P2任意機能
```

### 1.2 実装原則

- **RSC ファースト**: データフェッチはデフォルトで React Server Component（RSC）で実施し、インタラクションが必要な箇所のみ `'use client'` を付与
- **型安全優先**: Prisma の生成型をそのまま使い、`any` は使用しない
- **バリデーション二重化**: フロント（Zod + React Hook Form）とAPI（Zod + Route Handler）の両方でバリデーションを実施
- **権限チェック徹底**: Route Handler の先頭で必ず認証（Supabase Auth）と認可（`lib/permissions.ts`）を実施
- **エラーレスポンス統一**: Route Handler は以下のステータスコードを一貫して返す
  - `400`: バリデーションエラー（Zod parse 失敗）
  - `401`: 未認証（Supabase セッションなし）
  - `403`: 権限不足 / フェーズ外操作
  - `404`: リソース未存在
  - `409`: 状態競合（例: APPROVED状態へのPATCH）
  - `500`: 予期せぬサーバーエラー

---

## 2. フェーズ別 実装設計

### フェーズ1: 環境セットアップ

#### 実施内容

1. **Next.js プロジェクト初期化**

   ```bash
   bunx create-next-app@latest . --typescript --tailwind --app --src-dir
   ```

2. **依存パッケージインストール**（パッケージマネージャー: Bun）

   - `@prisma/client` / `prisma`
   - `@supabase/supabase-js` / `@supabase/ssr`
   - `shadcn/ui` の初期化（`bunx shadcn@latest init`）
   - `zod` / `react-hook-form` / `@hookform/resolvers`
   - `swr`（クライアントサイドデータフェッチ用）
   - `date-fns`（日付操作）
   - `@tanstack/react-table`（テーブル UI）

3. **設定ファイル生成**

   - `tailwind.config.ts`: プライマリカラー `#01AEBB` を `primary` として登録
   - `tsconfig.json`: `strict: true`、`paths: { "@/*": ["./src/*"] }`
   - `.eslintrc.json`: `@typescript-eslint/no-explicit-any` を `error` に設定
   - `.prettierrc`: セミコロン必須・シングルクォート
   - `.env.example`: 必要な環境変数キー一覧

4. **Supabase プロジェクト作成**

   - Supabase ダッシュボードでプロジェクト作成
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を `.env.local` に設定

#### 作成ファイル

- `package.json`
- `next.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `tsconfig.json`
- `.eslintrc.json`
- `.prettierrc`
- `.env.example`
- `src/app/globals.css`（Tailwind ディレクティブ）

---

### フェーズ2: DBスキーマ + Prisma セットアップ

#### 実施内容

1. **Prisma 初期化**

   ```bash
   bunx prisma init --datasource-provider postgresql
   ```

2. **`prisma/schema.prisma` 作成**  
   `docs/functional-design.md` セクション5（データモデル）に基づき全テーブルを定義

3. **`lib/db.ts` 作成**（Prisma クライアントシングルトン）

   ```typescript
   import { PrismaClient } from '@prisma/client';
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
   export const prisma = globalForPrisma.prisma ?? new PrismaClient();
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```

4. **初回マイグレーション実行**

   ```bash
   bunx prisma migrate dev --name init
   ```

5. **`lib/validations/` 作成**  
   Zod スキーマ（`goal.ts` / `review.ts` / `admin.ts`）を作成

6. **`types/index.ts` 作成**  
   Prisma 生成型の再エクスポートとアプリケーション固有の union 型定義

7. **`prisma/seed.ts` 作成**  
   開発・テスト用の初期データを投入するシードスクリプト。以下を含む：

   - 管理者（ADMIN）ユーザー 1名
   - HR ユーザー 1名
   - 部署・組織ツリー（organizations）サンプル
   - 社員（MEMBER / MANAGER 各数名）
   - 評価期（periods）1件（フェーズJSON含む）

   ```bash
   bunx prisma db seed
   ```

#### 主要なテーブル設計（概要）

```text
employees          社員マスタ（role / position / grade / manager_id / employee_type / is_evaluation_exempt）
organizations      組織マスタ（親子ツリー構造）
periods            評価期マスタ（phases JSON）
goal_sets          目標セット（status / is_mbo_target / is_active / target_months）
goals              目標項目（type / weight / kpi_pattern / criteria_* / revision_reason / visibility / is_current）
approval_requests  承認申請レコード（type / status / step / approver_id）
midterm_reviews    中間振り返り（employee_submitted_at / manager_submitted_at）
self_reviews       自己評価
manager_reviews    上長評価（revision_requested フラグ含む）
final_evaluations  最終評価確定（総合評価 S/A/B/C/D 含む）
degree_360_scores  360度評価スコア
notifications      アプリ内通知
audit_logs         監査ログ（保持期間10年）
```

**主要カラム補足**:

| カラム | テーブル | 用途 |
| ---- | ------ | ---- |
| `employee_type` | employees | REGULAR / CONTRACT / ASSISTANT。CONTRACTはMBO対象外 |
| `is_evaluation_exempt` | employees | 実働6か月未満による評価免除フラグ |
| `visibility` | goals | 公開範囲（SELF_ONLY / DEPARTMENT / COMPANY） |
| `is_current` | goals | バージョン管理。有効版のみ `true`。修正申請承認時に旧版を `false` に更新 |
| `revision_requested` | manager_reviews | 上長が修正依頼を送ったことを示すフラグ（修正申請フロー内で使用） |

#### 作成ファイル

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/db.ts`
- `src/lib/validations/goal.ts`
- `src/lib/validations/review.ts`
- `src/lib/validations/admin.ts`
- `src/types/index.ts`

---

### フェーズ3: 認証（S-01）

#### 実施内容

1. **`lib/auth.ts` 作成**  
   Supabase Auth クライアント（SSR 対応）の設定

2. **`src/middleware.ts` 作成**  
   JWT 検証と未認証リダイレクトを実装

3. **S-01 ログイン画面実装**（`app/(auth)/login/page.tsx`）

   - Supabase の `signInWithPassword()` を使用
   - ログイン成功後は `/dashboard` へリダイレクト
   - エラー時は赤色（`#c0392b`）でメッセージ表示

4. **ログアウト機能実装**（Header コンポーネントに組み込み）

#### 作成ファイル

- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/app/(auth)/login/page.tsx`

---

### フェーズ4: 共通レイアウト（AppShell）

#### 実施内容

1. **`app/(main)/layout.tsx`** — AppShell 埋め込みレイアウト

2. **`components/layout/AppShell.tsx`** — サイドバー + ヘッダー + メインコンテンツの外枠

3. **`components/layout/Sidebar.tsx`** — ロール別ナビゲーションメニュー

   | メニュー項目 | 表示対象ロール |
   | --------- | ----------- |
   | ダッシュボード | 全員 |
   | 自分の目標 | 全員 |
   | 目標一覧 | 全員 |
   | 中間振り返り | 全員 |
   | 過去の評価 | 全員 |
   | 承認・申請管理 | MANAGER以上 |
   | 評価調整・確定 | HR / ADMIN |
   | SmartHR連携 | HR / ADMIN |
   | ユーザー管理 | HR / ADMIN |
   | 組織管理 | HR / ADMIN |
   | 評価期管理 | HR / ADMIN |

4. **`components/layout/Header.tsx`** — 通知アイコン + ユーザーメニュー

5. **`hooks/useCurrentUser.ts`** — ログインユーザー情報取得フック

#### 作成ファイル

- `src/app/(main)/layout.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `src/hooks/useCurrentUser.ts`
- `src/lib/permissions.ts`（RBAC 権限チェック関数）

---

### フェーズ5: P0 コア機能

#### 5-1. ダッシュボード（S-02）

**実装方針**: RSC でダッシュボードデータを取得。対応事項リスト（承認待ち・入力催促等）は Prisma で集計して表示。

**作成ファイル**:

- `src/app/(main)/dashboard/page.tsx`
- `src/components/goals/GoalCard.tsx`

---

#### 5-2. 目標設定（S-03）+ 目標詳細・編集（S-04）

**実装方針**:

- S-03 は目標セット新規作成フォーム（`Client Component`、React Hook Form + Zod）
- S-04 は RSC でデータ取得し、編集アクション部分を Client Component として切り出す
- ウェイト合計100%バリデーションは Zod スキーマで実装
- KPI連動パターンは 5種類（KPI_DECOMPOSITION / LEADING_INDICATOR / ROLE_IN_GOAL / UPPER_GOAL / TEAM_GROWTH）を `KpiPatternGuide.tsx` で説明表示
- 公開範囲（visibility）は目標セット単位で SELF_ONLY / DEPARTMENT / COMPANY を選択
- 承認ステップインジケーターは `components/goals/ApprovalStepIndicator.tsx` として分離

**API設計**:

```text
POST   /api/goals                              目標セット作成（DRAFT）
GET    /api/goals/:goalSetId                   目標セット取得
PATCH  /api/goals/:goalSetId                   目標セット更新
POST   /api/goals/:goalSetId/submit            承認申請送信
POST   /api/goals/:goalSetId/meeting-reject    最終承認後差し戻し（DEPT_MANAGER以上）
```

**権限制御**:

- `PATCH /api/goals/:goalSetId` は `status` が `DRAFT` / `REJECTED` / `MEETING_REJECTED` の場合のみ許可
- それ以外のステータス（`SAVED` / `PENDING_*` / `APPROVED`）への PATCH は 409 を返す
- `APPROVED` 状態の目標セットへの編集は必ず 5-3 の修正申請フローを経ること

**MBO対象外社員の取り扱い（`is_mbo_target = false`）**:

- 対象: 等級1〜2 / 契約社員（`employee_type = CONTRACT`）/ アシスタント（`employee_type = ASSISTANT`）
- 承認フローなし。目標セット保存時に `status` を直接 `SAVED` に設定（`submit` API は呼び出さない）
- 承認申請ボタンは画面に表示しない
- `SAVED` 状態では中間振り返り・自己評価・上長評価が通常通り行える

**作成ファイル**:

- `src/app/(main)/goals/new/page.tsx`
- `src/app/(main)/goals/[goalSetId]/page.tsx`
- `src/components/goals/GoalForm.tsx`
- `src/components/goals/GoalVersionHistory.tsx`
- `src/components/goals/ApprovalStepIndicator.tsx`
- `src/components/goals/GoalVisibilityBadge.tsx`
- `src/components/goals/KpiPatternGuide.tsx`
- `src/app/api/goals/route.ts`
- `src/app/api/goals/[goalSetId]/route.ts`
- `src/app/api/goals/[goalSetId]/submit/route.ts`
- `src/app/api/goals/[goalSetId]/meeting-reject/route.ts`

---

#### 5-3. 目標修正申請（S-05）

**実装方針**:

- APPROVED状態の目標セットに対する修正申請フォーム
- 修正理由コード（6種類: KPI_CHANGE / STANDARD_DEVIATION / ROLE_CHANGE / MIDTERM_ENTRY / EARLY_CLOSURE / GRADE_PROMOTION）を選択し、変更内容を入力して申請
- 申請中も `goal_sets.status` は APPROVED を維持

**バージョン管理（is_current）**:

- 修正申請が承認されると、旧版の `goals` レコードを `is_current = false` に更新
- 新版の `goals` レコードを `is_current = true` で作成（`revision_reason` に修正理由コードを記録）
- `GoalVersionHistory.tsx` では `is_current = false` の旧版履歴を一覧表示

**API設計**:

```text
POST   /api/goals/:goalSetId/revision          修正申請送信
```

**作成ファイル**:

- `src/app/(main)/goals/[goalSetId]/revision/page.tsx`
- `src/app/api/goals/[goalSetId]/revision/route.ts`

---

#### 5-4. 承認・申請管理（S-15）

**実装方針**:

- MANAGER以上向け。タブ構成:「承認待ち」「承認済み」「差し戻し済み」
- 各申請行から S-04 へ遷移して詳細確認・承認・差し戻し操作
- `ApprovalActionModal.tsx` で承認/差し戻しのコメント入力ダイアログを実装

**承認ステップと status 遷移**:

```text
申請       : DRAFT/REJECTED/MEETING_REJECTED → PENDING_MANAGER
上長承認   : PENDING_MANAGER → PENDING_DIVISION
事業部長承認: PENDING_DIVISION → PENDING_EXECUTIVE
経営承認   : PENDING_EXECUTIVE → APPROVED
差し戻し   : PENDING_* → REJECTED
```

**API設計**:

```text
GET    /api/approvals                          承認申請一覧取得
POST   /api/approvals/:requestId/approve       承認（ステップ進行 or 最終APPROVED）
POST   /api/approvals/:requestId/reject        差し戻し（REJECTED）
```

**作成ファイル**:

- `src/app/(main)/approvals/page.tsx`
- `src/components/approvals/ApprovalList.tsx`
- `src/components/approvals/ApprovalActionModal.tsx`
- `src/components/approvals/MeetingRejectModal.tsx`
- `src/app/api/approvals/route.ts`
- `src/app/api/approvals/[requestId]/approve/route.ts`
- `src/app/api/approvals/[requestId]/reject/route.ts`

---

#### 5-5. 中間振り返り（S-04 内 / F-07）

**実装方針**:

- S-04の目標詳細画面内に「中間振り返り」セクションとして組み込む
- 社員コメントと上長コメントを各目標項目ごとに並列入力
- `MidtermReviewForm.tsx` を Client Component として実装
- `employee_submitted_at` / `manager_submitted_at` を個別に保存（一方が未入力でも他方を保存可能）

**上長による修正依頼フロー**:

- 上長が中間振り返りを記入した後、社員の目標内容に問題があると判断した場合に修正依頼を送る
- `manager_reviews.revision_requested` フラグを `true` に設定
- フラグが立った場合、社員側のダッシュボードに「修正依頼あり」として対応事項リストに表示
- 社員が修正申請（5-3）を提出することで依頼に対応

**API設計**:

```text
POST   /api/goals/:goalSetId/midterm-review    中間振り返り保存
```

**作成ファイル**:

- `src/components/reviews/MidtermReviewForm.tsx`
- `src/app/api/goals/[goalSetId]/midterm-review/route.ts`

---

#### 5-6. 自己評価（S-06）・上長評価（S-07）

**実装方針**:

- S-06: 自己評価フォーム。スコア（5段階）+ コメント入力
- S-07: 上長評価フォーム。スコア + コメント入力 + バイアス警告バナー（`BiasWarningBanner.tsx`）
- バイアス警告バナーは認知バイアス5症状を記載した静的なガイダンス表示（自動検知ではない）
- 自己評価提出後に上長評価が入力可能になるロック制御

**API設計**:

```text
POST   /api/goals/:goalSetId/self-review       自己評価提出
POST   /api/goals/:goalSetId/manager-review    上長評価提出
```

**作成ファイル**:

- `src/app/(main)/goals/[goalSetId]/self-review/page.tsx`
- `src/app/(main)/goals/[goalSetId]/manager-review/page.tsx`
- `src/components/reviews/SelfReviewForm.tsx`
- `src/components/reviews/ManagerReviewForm.tsx`
- `src/components/reviews/BiasWarningBanner.tsx`
- `src/components/reviews/ScoreDisplay.tsx`
- `src/app/api/goals/[goalSetId]/self-review/route.ts`
- `src/app/api/goals/[goalSetId]/manager-review/route.ts`

---

#### 5-7. 評価調整・確定（S-08）

**実装方針**:

- HR/ADMIN向け。全社員の上長評価済み目標セットを一覧表示
- MBOスコア（ウェイト加重平均）+ 360度スコアの合算プレビュー
- 最終スコアを上書きして確定
- 確定時に `final_evaluations` へ総合評価（S/A/B/C/D）を記録

**総合評価確定フロー**:

- `lib/score.ts` が MBOスコア＋360度スコアの合算値を計算
- HR が合算スコアを参照しつつ総合評価（S/A/B/C/D）を選択・確定
- 確定後は `final_evaluations.overall_grade` に保存し、社員側から参照可能になる

**API設計**:

```text
GET    /api/admin/evaluations                           評価一覧取得
PATCH  /api/admin/evaluations/:goalSetId                スコア調整・総合評価確定
GET    /api/admin/evaluations/:goalSetId/score-preview  スコアプレビュー
```

**作成ファイル**:

- `src/app/(main)/admin/review-adjustment/page.tsx`
- `src/components/admin/EvaluationAdjustmentTable.tsx`
- `src/lib/score.ts`（MBOスコア・360度スコア計算ロジック）
- `src/lib/phases.ts`（フェーズ判定ロジック）  
  フェーズ値: `GOAL_SETTING` / `MIDTERM` / `SELF_REVIEW` / `MANAGER_REVIEW`  
  一般ロールはフェーズ外操作で 403。HR / ADMIN は全フェーズで操作可能
- `src/app/api/admin/evaluations/route.ts`
- `src/app/api/admin/evaluations/[goalSetId]/route.ts`
- `src/app/api/admin/evaluations/[goalSetId]/score-preview/route.ts`

---

#### 5-8. 目標一覧（S-09）

**実装方針**:

- RSC で自部署の goal_sets 一覧を取得・表示
- 承認ステップインジケーター（`ApprovalStepIndicator.tsx`）を各行に表示
- 行クリックで S-04 へ遷移

**作成ファイル**:

- `src/app/(main)/goals/page.tsx`

---

### フェーズ6: P1 追加機能

#### 6-1. 管理画面（S-12/S-13/S-14）

**実装方針**: HR/ADMIN向け CRUD 画面。shadcn/ui の Table + Dialog で実装。

**API設計**:

```text
GET    /api/admin/users                        社員一覧取得
POST   /api/admin/users                        社員作成
PATCH  /api/admin/users/:userId                社員情報更新（ロール・等級・組織等）
GET    /api/admin/organizations                組織一覧取得
POST   /api/admin/organizations                組織作成
PATCH  /api/admin/organizations/:orgId         組織情報更新
GET    /api/admin/periods                      評価期一覧取得
POST   /api/admin/periods                      評価期作成
PATCH  /api/admin/periods/:periodId/phases     フェーズ期間更新
```

**作成ファイル**:

- `src/app/(main)/admin/users/page.tsx`
- `src/app/(main)/admin/organizations/page.tsx`
- `src/app/(main)/admin/periods/page.tsx`
- `src/components/admin/UserManagementTable.tsx`
- `src/components/admin/OrganizationTree.tsx`
- `src/components/admin/PeriodForm.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[userId]/route.ts`
- `src/app/api/admin/organizations/route.ts`
- `src/app/api/admin/organizations/[orgId]/route.ts`
- `src/app/api/admin/periods/route.ts`
- `src/app/api/admin/periods/[periodId]/phases/route.ts`

---

#### 6-2. 通知（S-17）

**実装方針**:

- P0フェーズの各承認 Route Handler 内で `notifications` テーブルへの DB 書き込みを実施（通知レコード作成）
- P1フェーズで通知 UI とメール送信（Edge Function）を追加
- Header の通知アイコンは `useNotifications.ts` フックで未読数をポーリング（SWR）

**API設計**:

```text
GET    /api/notifications                      通知一覧取得
PATCH  /api/notifications/:id/read             既読更新
```

**作成ファイル**:

- `src/lib/notifications.ts`
- `src/hooks/useNotifications.ts`
- `src/app/(main)/notifications/page.tsx`
- `src/components/notifications/NotificationList.tsx`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/[id]/read/route.ts`

---

#### 6-3. 過去の評価（S-18）

**実装方針**: 過去評価期の `final_evaluations` を社員ごとに一覧表示。

**API設計**:

```text
GET    /api/evaluations/history                過去評価一覧取得（ログインユーザー分）
```

**作成ファイル**:

- `src/app/(main)/evaluations/history/page.tsx`
- `src/app/api/evaluations/history/route.ts`

---

#### 6-4. SmartHR CSV インポート

**実装方針**:

- SmartHR からエクスポートした社員 CSV をアップロードし `employees` テーブルを差分更新
- CSV カラム定義は SmartHR のエクスポート仕様に準拠
- バリデーションエラー行は処理をスキップし、エラー行番号と理由を JSON で返す

**API設計**:

```text
POST   /api/admin/smarthr/import               CSV アップロード・差分更新
```

**作成ファイル**:

- `src/app/api/admin/smarthr/import/route.ts`

---

#### 6-5. 監査ログ

**実装方針**: Route Handler の共通処理として、承認・評価操作後に `audit_logs` に記録。

**API設計**:

```text
GET    /api/admin/audit-logs                   監査ログ一覧取得（HR/ADMIN のみ）
```

**作成ファイル**:

- `src/app/api/admin/audit-logs/route.ts`

---

### フェーズ7: P2 任意機能

- S-11 社員プロフィール・履歴画面
- S-10 目標一覧（全社）
- S-16 評価サマリ画面
- 360度スコア CSV インポート

---

## 3. 変更するコンポーネント・影響範囲

### 新規作成（主要ファイルのみ）

- `prisma/schema.prisma`: 全DBスキーマ定義（初回）
- `src/lib/permissions.ts`: RBAC 権限チェック（全 Route Handler から参照）
- `src/lib/score.ts`: スコア計算ロジック（評価調整・確定から参照）
- `src/lib/phases.ts`: フェーズ判定ロジック（操作可否制御から参照）

### 既存ファイルへの影響

なし（初回実装のため）

---

## 4. データ構造の変更

初回実装のため、すべて新規作成。主要カラムについては `docs/functional-design.md` セクション5および `docs/specification.md` セクション6を参照。

---

## 5. テスト方針

### ユニットテスト（`__tests__/unit/`）

- `lib/score.ts`: MBOスコア計算ロジック
- `lib/permissions.ts`: ロール別権限チェックロジック
- `components/goals/ApprovalStepIndicator.tsx`: ステップ表示の網羅的テスト

### E2Eテスト（`e2e/`）

- `goal-setting.spec.ts`: 目標設定 → 承認フロー → APPROVED までの一連フロー
- `evaluation.spec.ts`: 自己評価 → 上長評価 → 評価確定までの一連フロー

---

## 6. 環境変数一覧

| 変数名 | 用途 | 管理 |
| ---- | -- | -- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | `.env.local` / Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | `.env.local` / Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理者キー（Route Handler用） | `.env.local` / Vercel（非公開） |
| `DATABASE_URL` | PostgreSQL 接続文字列（Prisma用） | `.env.local` / Vercel |
| `DIRECT_URL` | PostgreSQL 直接接続URL（マイグレーション用） | `.env.local` |
| `NEXT_PUBLIC_APP_URL` | アプリのベースURL（メール通知のリンク生成用） | `.env.local` / Vercel |
| `SENDGRID_API_KEY` | SendGrid APIキー（Edge Function用） | Supabase Secrets |
