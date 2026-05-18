# 初回実装 タスクリスト（MVP）

**ステアリングディレクトリ**: `.steering/20260430-initial-implementation/`  
**作成日**: 2026-04-30  
**参照**: `design.md`（同ディレクトリ）/ `requirements.md`（同ディレクトリ）

---

## フェーズ1: 環境セットアップ

- [x] Next.js プロジェクト初期化（`bunx create-next-app@latest`）
- [x] 依存パッケージインストール（Prisma / Supabase / shadcn/ui / Zod / React Hook Form / SWR / date-fns / TanStack Table）
- [x] `tailwind.config.ts` 設定（プライマリカラー `#01AEBB` / フォント / カスタムスクリーン）
- [x] `tsconfig.json` 設定（`strict: true` / `paths: { "@/*": ["./src/*"] }`）
- [x] `.eslintrc.json` 設定（`@typescript-eslint/no-explicit-any: error`）
- [x] `.prettierrc` 設定（セミコロン必須 / シングルクォート）
- [x] `postcss.config.js` 設定
- [x] `.env.example` 作成（全環境変数キー一覧）
- [x] `.gitignore` 更新（`.env.local` / `.next/` / `node_modules/` 等）
- [x] Supabase プロジェクト作成・`.env.local` 設定
- [x] shadcn/ui 初期化（`bunx shadcn@latest init`）
- [x] shadcn/ui コンポーネント追加（Button / Card / Badge / Dialog / Select / Textarea / Input / Table / Tabs）
- [x] `jest.config.ts` 作成（ユニットテスト環境）
- [x] `playwright.config.ts` 作成（E2Eテスト環境）

**完了条件**: `bun run dev` でエラーなく起動し、`localhost:3000` が表示される

---

## フェーズ2: DBスキーマ + Prismaセットアップ

- [x] `bunx prisma init` 実行
- [x] `prisma/schema.prisma` 作成（全テーブル定義）
  - [x] `employees`（role / position / grade / manager_id / employee_type / is_evaluation_exempt 等）
  - [x] `organizations`（親子ツリー構造）
  - [x] `periods`（phases JSON / フェーズ期間）
  - [x] `goal_sets`（status / is_mbo_target / is_active / target_months）
  - [x] `goals`（type / weight / kpi_pattern / criteria_* / revision_reason / visibility / is_current）
  - [x] `approval_requests`（type / status / step / approver_id）
  - [x] `midterm_reviews`（employee_submitted_at / manager_submitted_at）
  - [x] `self_reviews`
  - [x] `manager_reviews`（revision_requested フラグ含む）
  - [x] `final_evaluations`（overall_grade: S/A/B/C/D 含む）
  - [x] `degree_360_scores`
  - [x] `notifications`
  - [x] `audit_logs`
  - [x] DBトリガー（`goals.weight` 合計100%制約）
  - [x] 条件付きUNIQUEインデックス（`goal_sets.is_active = TRUE`）
- [x] `src/lib/db.ts` 作成（Prisma クライアントシングルトン）
- [x] 初回マイグレーション実行（`bunx prisma migrate dev --name init`）
- [x] `prisma/seed.ts` 作成（開発用初期データ: 管理者・HR・社員サンプル・組織・評価期）
- [x] `src/types/index.ts` 作成（Prisma 型の再エクスポート + 独自 union 型）
- [x] `src/lib/validations/goal.ts` 作成（Zod スキーマ）
- [x] `src/lib/validations/review.ts` 作成（Zod スキーマ）
- [x] `src/lib/validations/admin.ts` 作成（Zod スキーマ）

**完了条件**: `bunx prisma studio` でテーブルが確認でき、シードデータが投入できる

---

## フェーズ3: 認証（S-01）

- [x] `src/lib/auth.ts` 作成（Supabase Auth SSR クライアント）
- [x] `src/middleware.ts` 作成（JWT検証 + 未認証リダイレクト）
- [x] `src/app/(auth)/login/page.tsx` 作成（メールOTP 2ステップログイン）
  - [x] Step 1: メールアドレス入力欄 + 「コードを送信」ボタン
  - [x] `signInWithOtp({ email, options: { shouldCreateUser: false } })` 呼び出し
  - [x] Step 2: 「〇〇@〇〇 宛にコードを送りました」案内 + 8桁コード入力欄 + 「ログイン」ボタン
  - [x] `verifyOtp({ email, token, type: 'email' })` 呼び出し
  - [x] ログイン成功 → `/dashboard` リダイレクト
  - [x] 未登録メールアドレス / コード誤り時のエラー表示（赤色 `#c0392b`）
  - [x] 「別のアドレスで試す」リンク（Step 2 → Step 1 に戻る）
- [x] Supabase Dashboard で OTP メールテンプレートを日本語化
- [x] ログアウト機能（Header に組み込み）

**完了条件**: メールOTPでログイン・ログアウトが動作する / 未認証アクセスがリダイレクトされる / 未登録メールでのログイン試行がエラーになる

---

## フェーズ4: 共通レイアウト（AppShell）

- [x] `src/lib/permissions.ts` 作成（RBAC 権限チェック関数）
- [x] `src/hooks/useCurrentUser.ts` 作成
- [x] `src/components/layout/AppShell.tsx` 作成
- [x] `src/components/layout/Sidebar.tsx` 作成（ロール別ナビゲーション）
- [x] `src/components/layout/Header.tsx` 作成（通知アイコン + ユーザーメニュー）
- [x] `src/app/layout.tsx` 作成（ルートレイアウト / フォント / グローバルCSS）
- [x] `src/app/(main)/layout.tsx` 作成（AppShell 埋め込み）

**完了条件**: ダッシュボードURLにアクセスするとサイドバー付きレイアウトが表示される

---

## フェーズ5: P0 コア機能

### 5-1. ダッシュボード（S-02）

- [x] `src/app/(main)/dashboard/page.tsx` 作成
  - [x] 現在フェーズ表示
  - [x] 自分の目標サマリ（GoalCard）
  - [x] 対応事項リスト（承認待ち / 入力催促 / 修正依頼あり）
- [x] `src/components/goals/GoalCard.tsx` 作成

**完了条件**: ダッシュボードが表示され、自分の目標サマリと対応事項が正しく表示される

---

### 5-2. 目標設定（S-03）+ 目標詳細・編集（S-04）

- [x] `src/components/goals/GoalForm.tsx` 作成（React Hook Form + Zod）
  - [x] KPI連動目標2件 + 組織貢献目標1件の3件構成
  - [x] ウェイト合計100%バリデーション
  - [x] 達成基準（1.2/1.0/0.8水準）入力
  - [x] KPIパターン選択（5種類: KPI_DECOMPOSITION / LEADING_INDICATOR / ROLE_IN_GOAL / UPPER_GOAL / TEAM_GROWTH）
  - [x] 公開範囲（visibility）選択（SELF_ONLY / DEPARTMENT / COMPANY）
  - [x] MBO対象外（等級1〜2 / CONTRACT / ASSISTANT）は保存時に status を SAVED に設定し承認申請ボタンを非表示
- [x] `src/components/goals/ApprovalStepIndicator.tsx` 作成（4段階インジケーター）
- [x] `src/components/goals/GoalVersionHistory.tsx` 作成
- [x] `src/components/goals/GoalVisibilityBadge.tsx` 作成
- [x] `src/components/goals/KpiPatternGuide.tsx` 作成（5パターンの説明表示）
- [x] `src/app/(main)/goals/new/page.tsx` 作成
- [x] `src/app/(main)/goals/[goalSetId]/page.tsx` 作成
  - [x] 目標詳細タブ（目標詳細 / バージョン履歴 / ステータス履歴）
  - [x] APPROVED後の編集ボタン非表示（修正申請ボタンに切り替え）
  - [x] 最終承認後差し戻しボタン（DEPT_MANAGER以上のみ表示）
- [x] `src/app/api/goals/route.ts` 作成（GET / POST）
- [x] `src/app/api/goals/[goalSetId]/route.ts` 作成（GET / PATCH）
  - [x] DRAFT / REJECTED / MEETING_REJECTED のみ PATCH 可。それ以外は 409
- [x] `src/app/api/goals/[goalSetId]/submit/route.ts` 作成（承認申請: DRAFT → PENDING_MANAGER）
- [x] `src/app/api/goals/[goalSetId]/meeting-reject/route.ts` 作成（最終承認後差し戻し）

**完了条件**: 目標セットを作成・保存でき、承認申請ができる / APPROVED後の編集が 409 になる / MBO対象外は申請なしで SAVED になる

---

### 5-3. 目標修正申請（S-05）

- [x] `src/app/(main)/goals/[goalSetId]/revision/page.tsx` 作成
  - [x] 修正理由コード選択（6種類: KPI_CHANGE / STANDARD_DEVIATION / ROLE_CHANGE / MIDTERM_ENTRY / EARLY_CLOSURE / GRADE_PROMOTION）
  - [x] 変更内容入力
- [x] `src/app/api/goals/[goalSetId]/revision/route.ts` 作成
  - [x] 修正申請承認時: 旧版 `goals` レコードを `is_current = false` に更新し、新版を `is_current = true` で作成

**完了条件**: APPROVED状態の目標セットで修正申請ができる / 申請中も status が APPROVED のまま / 承認後に旧版がバージョン履歴に表示される

---

### 5-4. 承認・申請管理（S-15）

- [x] `src/components/approvals/ApprovalList.tsx` 作成
- [x] `src/components/approvals/ApprovalActionModal.tsx` 作成
- [x] `src/components/approvals/MeetingRejectModal.tsx` 作成
- [x] `src/app/(main)/approvals/page.tsx` 作成（タブ: 承認待ち / 承認済み / 差し戻し済み）
- [x] `src/app/api/approvals/route.ts` 作成
- [x] `src/app/api/approvals/[requestId]/approve/route.ts` 作成
  - [x] 承認ステップに応じた status 遷移（PENDING_MANAGER → PENDING_DIVISION → PENDING_EXECUTIVE → APPROVED）
  - [x] 各承認時に `notifications` テーブルへ通知レコードを書き込む
- [x] `src/app/api/approvals/[requestId]/reject/route.ts` 作成
  - [x] 差し戻し時に `notifications` テーブルへ通知レコードを書き込む

**完了条件**: 4段階の承認フローが正常に動作する / 差し戻し後に社員が再申請できる

---

### 5-5. 中間振り返り（F-07）

- [x] `src/components/reviews/MidtermReviewForm.tsx` 作成
  - [x] 各目標項目ごとの社員コメント入力
  - [x] 各目標項目ごとの上長コメント入力（上長ロールのみ表示）
  - [x] 上長が修正依頼を送る機能（`revision_requested` フラグを true に設定）
- [x] `src/app/api/goals/[goalSetId]/midterm-review/route.ts` 作成
  - [x] `employee_submitted_at` / `manager_submitted_at` の個別保存
  - [x] `revision_requested` フラグ更新エンドポイント

**完了条件**: 社員と上長がそれぞれコメントを入力・保存できる / 修正依頼フラグが立つとダッシュボードの対応事項に表示される

---

### 5-6. 自己評価（S-06）・上長評価（S-07）

- [x] `src/components/reviews/SelfReviewForm.tsx` 作成（スコア選択 + コメント）
- [x] `src/components/reviews/ManagerReviewForm.tsx` 作成
- [x] `src/components/reviews/BiasWarningBanner.tsx` 作成（認知バイアス5症状の静的ガイダンスバナー）
- [x] `src/components/reviews/ScoreDisplay.tsx` 作成
- [x] `src/app/(main)/goals/[goalSetId]/self-review/page.tsx` 作成
- [x] `src/app/(main)/goals/[goalSetId]/manager-review/page.tsx` 作成
  - [x] 自己評価未提出の場合は入力フォームをロック
- [x] `src/app/api/goals/[goalSetId]/self-review/route.ts` 作成
- [x] `src/app/api/goals/[goalSetId]/manager-review/route.ts` 作成

**完了条件**: 自己評価提出後に上長評価が入力可能になる / バイアス警告バナーが常時表示される

---

### 5-7. 評価調整・確定（S-08）

- [x] `src/lib/score.ts` 作成（MBOスコア計算 / 360度スコア合算ロジック）
- [x] `src/lib/phases.ts` 作成（フェーズ判定ロジック）
  - [x] フェーズ値定義: `GOAL_SETTING` / `MIDTERM` / `SELF_REVIEW` / `MANAGER_REVIEW`
  - [x] 一般ロールのフェーズ外操作で 403、HR/ADMIN は全フェーズ操作可能
- [x] `src/components/admin/EvaluationAdjustmentTable.tsx` 作成
- [x] `src/app/(main)/admin/review-adjustment/page.tsx` 作成
  - [x] 総合評価（S/A/B/C/D）選択・確定 UI
- [x] `src/app/api/admin/evaluations/route.ts` 作成
- [x] `src/app/api/admin/evaluations/[goalSetId]/route.ts` 作成（スコア調整・総合評価確定）
- [x] `src/app/api/admin/evaluations/[goalSetId]/score-preview/route.ts` 作成

**完了条件**: 全社員の評価スコアを確認・調整・確定できる / 総合評価（S/A/B/C/D）が `final_evaluations` に保存される

---

### 5-8. 目標一覧（S-09）

- [x] `src/app/(main)/goals/page.tsx` 作成
  - [x] 自部署の goal_sets 一覧
  - [x] 承認ステップインジケーター表示
  - [x] 行クリックで S-04 へ遷移

**完了条件**: 自部署のメンバーの目標一覧が表示される

---

## フェーズ6: 管理画面（S-12/S-13/S-14）

システム運用に必須のため P0 完了後に実装する。

- [x] `src/components/admin/UserManagementTable.tsx` 作成
- [x] `src/components/admin/OrganizationTree.tsx` 作成
- [x] `src/components/admin/PeriodForm.tsx` 作成
- [x] `src/app/(main)/admin/users/page.tsx` 作成
- [x] `src/app/(main)/admin/organizations/page.tsx` 作成
- [x] `src/app/(main)/admin/periods/page.tsx` 作成
- [x] `src/app/api/admin/users/route.ts` 作成（GET / POST）
- [x] `src/app/api/admin/users/[userId]/route.ts` 作成（PATCH）
- [x] `src/app/api/admin/organizations/route.ts` 作成（GET / POST）
- [x] `src/app/api/admin/organizations/[orgId]/route.ts` 作成（PATCH）
- [x] `src/app/api/admin/periods/route.ts` 作成（GET / POST）
- [x] `src/app/api/admin/periods/[periodId]/phases/route.ts` 作成（PATCH）

**完了条件**: 社員・組織・評価期の CRUD が HR/ADMIN ロールで操作できる

---

## テスト

- [x] `__tests__/unit/lib/score.test.ts` 作成（スコア計算ロジック）
- [x] `__tests__/unit/lib/permissions.test.ts` 作成（権限チェックロジック）
- [x] `__tests__/unit/components/goals/ApprovalStepIndicator.test.tsx` 作成
- [x] `e2e/goal-setting.spec.ts` 作成（目標設定〜APPROVED の E2E）
- [x] `e2e/evaluation.spec.ts` 作成（自己評価〜評価確定の E2E）

---

## デプロイ準備

- [x] Vercel プロジェクト作成・GitHub リポジトリ連携
- [x] Vercel に環境変数設定（`NEXT_PUBLIC_SUPABASE_URL` 等）
- [x] Supabase に環境変数設定（`AWS_REGION` / `SES_FROM_EMAIL` 等）
- [x] 本番DBマイグレーション実行
- [x] 初期データ投入（評価期・管理者ユーザー等）
- [x] ベータ版動作確認（社内メンバー限定公開）

---

## ポストMVP

MVP リリース後に実装する機能。スキーマは初回マイグレーションで作成済み。

### 通知（S-17）

- [x] `src/lib/notifications.ts` 作成（DB書き込み関数 + Edge Function 呼び出し）
- [x] `src/hooks/useNotifications.ts` 作成
- [x] `src/components/notifications/NotificationList.tsx` 作成
- [x] `src/app/(main)/notifications/page.tsx` 作成
- [x] `src/app/api/notifications/route.ts` 作成（GET）
- [x] `src/app/api/notifications/[id]/read/route.ts` 作成（PATCH）
- [x] Header の通知アイコンに未読バッジ表示（SWRポーリング）
- [x] Supabase Edge Function セットアップ（メール送信）

### 過去の評価（S-18）

- [x] `src/app/(main)/evaluations/history/page.tsx` 作成
- [x] `src/app/api/evaluations/history/route.ts` 作成

### 監査ログ（F-16）

- [ ] `src/app/api/admin/audit-logs/route.ts` 作成（GET: HR/ADMIN のみ）
- [ ] 承認・評価操作後の `audit_logs` 書き込み処理を各 Route Handler に組み込む

### P2機能

- [ ] `src/app/(main)/goals/all/page.tsx` 作成（S-10 目標一覧・全社）
- [ ] `src/app/(main)/employees/[employeeId]/page.tsx` 作成（S-11 社員プロフィール）
- [ ] `src/app/(main)/reports/summary/page.tsx` 作成（S-16 評価サマリ）
- [ ] `src/app/api/admin/degree360-scores/route.ts` 作成（POST）
- [ ] `src/app/api/admin/degree360-scores/import/route.ts` 作成（CSV インポート）
- [ ] `src/app/api/employees/[employeeId]/history/route.ts` 作成
- [ ] `src/app/api/reports/summary/route.ts` 作成
