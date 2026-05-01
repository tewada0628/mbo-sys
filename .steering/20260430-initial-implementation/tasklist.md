# 初回実装 タスクリスト

**ステアリングディレクトリ**: `.steering/20260430-initial-implementation/`  
**作成日**: 2026-04-30  
**参照**: `design.md`（同ディレクトリ）/ `requirements.md`（同ディレクトリ）

---

## フェーズ1: 環境セットアップ

- [ ] Next.js プロジェクト初期化（`bunx create-next-app@latest`）
- [ ] 依存パッケージインストール（Prisma / Supabase / shadcn/ui / Zod / React Hook Form / SWR / date-fns / TanStack Table）
- [ ] `tailwind.config.ts` 設定（プライマリカラー `#01AEBB` / フォント / カスタムスクリーン）
- [ ] `tsconfig.json` 設定（`strict: true` / `paths: { "@/*": ["./src/*"] }`）
- [ ] `.eslintrc.json` 設定（`@typescript-eslint/no-explicit-any: error`）
- [ ] `.prettierrc` 設定（セミコロン必須 / シングルクォート）
- [ ] `postcss.config.js` 設定
- [ ] `.env.example` 作成（全環境変数キー一覧）
- [ ] `.gitignore` 更新（`.env.local` / `.next/` / `node_modules/` 等）
- [ ] Supabase プロジェクト作成・`.env.local` 設定
- [ ] shadcn/ui 初期化（`bunx shadcn@latest init`）
- [ ] shadcn/ui コンポーネント追加（Button / Card / Badge / Dialog / Select / Textarea / Input / Table / Tabs）
- [ ] `jest.config.ts` 作成（ユニットテスト環境）
- [ ] `playwright.config.ts` 作成（E2Eテスト環境）

**完了条件**: `bun run dev` でエラーなく起動し、`localhost:3000` が表示される

---

## フェーズ2: DBスキーマ + Prismaセットアップ

- [ ] `bunx prisma init` 実行
- [ ] `prisma/schema.prisma` 作成（全テーブル定義）
  - [ ] `employees`（role / position / grade / manager_id / employee_type / is_evaluation_exempt 等）
  - [ ] `organizations`（親子ツリー構造）
  - [ ] `periods`（phases JSON / フェーズ期間）
  - [ ] `goal_sets`（status / is_mbo_target / is_active / target_months）
  - [ ] `goals`（type / weight / kpi_pattern / criteria_* / revision_reason / visibility / is_current）
  - [ ] `approval_requests`（type / status / step / approver_id）
  - [ ] `midterm_reviews`（employee_submitted_at / manager_submitted_at）
  - [ ] `self_reviews`
  - [ ] `manager_reviews`（revision_requested フラグ含む）
  - [ ] `final_evaluations`（overall_grade: S/A/B/C/D 含む）
  - [ ] `degree_360_scores`
  - [ ] `notifications`
  - [ ] `audit_logs`
  - [ ] DBトリガー（`goals.weight` 合計100%制約）
  - [ ] 条件付きUNIQUEインデックス（`goal_sets.is_active = TRUE`）
- [ ] `src/lib/db.ts` 作成（Prisma クライアントシングルトン）
- [ ] 初回マイグレーション実行（`bunx prisma migrate dev --name init`）
- [ ] `prisma/seed.ts` 作成（開発用初期データ: 管理者・HR・社員サンプル・組織・評価期）
- [ ] `src/types/index.ts` 作成（Prisma 型の再エクスポート + 独自 union 型）
- [ ] `src/lib/validations/goal.ts` 作成（Zod スキーマ）
- [ ] `src/lib/validations/review.ts` 作成（Zod スキーマ）
- [ ] `src/lib/validations/admin.ts` 作成（Zod スキーマ）

**完了条件**: `bunx prisma studio` でテーブルが確認でき、シードデータが投入できる

---

## フェーズ3: 認証（S-01）

- [ ] `src/lib/auth.ts` 作成（Supabase Auth SSR クライアント）
- [ ] `src/middleware.ts` 作成（JWT検証 + 未認証リダイレクト）
- [ ] `src/app/(auth)/login/page.tsx` 作成（ログインフォーム）
  - [ ] メールアドレス + パスワード入力
  - [ ] `signInWithPassword()` 呼び出し
  - [ ] ログイン成功 → `/dashboard` リダイレクト
  - [ ] エラー表示（赤色 `#c0392b`）
- [ ] ログアウト機能（Header に組み込み）

**完了条件**: ログイン・ログアウトが動作する / 未認証アクセスがリダイレクトされる

---

## フェーズ4: 共通レイアウト（AppShell）

- [ ] `src/lib/permissions.ts` 作成（RBAC 権限チェック関数）
- [ ] `src/hooks/useCurrentUser.ts` 作成
- [ ] `src/components/layout/AppShell.tsx` 作成
- [ ] `src/components/layout/Sidebar.tsx` 作成（ロール別ナビゲーション）
- [ ] `src/components/layout/Header.tsx` 作成（通知アイコン + ユーザーメニュー）
- [ ] `src/app/(main)/layout.tsx` 作成（AppShell 埋め込み）
- [ ] `src/app/layout.tsx` 作成（ルートレイアウト / フォント / グローバルCSS）

**完了条件**: ダッシュボードURLにアクセスするとサイドバー付きレイアウトが表示される

---

## フェーズ5: P0 コア機能

### 5-1. ダッシュボード（S-02）

- [ ] `src/app/(main)/dashboard/page.tsx` 作成
  - [ ] 現在フェーズ表示
  - [ ] 自分の目標サマリ（GoalCard）
  - [ ] 対応事項リスト（承認待ち / 入力催促 / 修正依頼あり）
- [ ] `src/components/goals/GoalCard.tsx` 作成

**完了条件**: ダッシュボードが表示され、自分の目標サマリと対応事項が正しく表示される

---

### 5-2. 目標設定（S-03）+ 目標詳細・編集（S-04）

- [ ] `src/components/goals/GoalForm.tsx` 作成（React Hook Form + Zod）
  - [ ] KPI連動目標2件 + 組織貢献目標1件の3件構成
  - [ ] ウェイト合計100%バリデーション
  - [ ] 達成基準（1.2/1.0/0.8水準）入力
  - [ ] KPIパターン選択（5種類: KPI_DECOMPOSITION / LEADING_INDICATOR / ROLE_IN_GOAL / UPPER_GOAL / TEAM_GROWTH）
  - [ ] 公開範囲（visibility）選択（SELF_ONLY / DEPARTMENT / COMPANY）
  - [ ] 等級1〜2（`is_mbo_target=false`）の場合は保存時に status を SAVED に設定（承認申請なし）
- [ ] `src/components/goals/ApprovalStepIndicator.tsx` 作成（4段階インジケーター）
- [ ] `src/components/goals/GoalVersionHistory.tsx` 作成
- [ ] `src/components/goals/GoalVisibilityBadge.tsx` 作成
- [ ] `src/components/goals/KpiPatternGuide.tsx` 作成（5パターンの説明表示）
- [ ] `src/app/(main)/goals/new/page.tsx` 作成
- [ ] `src/app/(main)/goals/[goalSetId]/page.tsx` 作成
  - [ ] 目標詳細タブ（目標詳細 / バージョン履歴 / ステータス履歴）
  - [ ] APPROVED後の編集ボタン非表示（修正申請ボタンに切り替え）
  - [ ] 最終承認後差し戻しボタン（DEPT_MANAGER以上のみ表示）
- [ ] `src/app/api/goals/route.ts` 作成（GET / POST）
- [ ] `src/app/api/goals/[goalSetId]/route.ts` 作成（GET / PATCH）
  - [ ] DRAFT / REJECTED / MEETING_REJECTED のみ PATCH 可。それ以外は 409
- [ ] `src/app/api/goals/[goalSetId]/submit/route.ts` 作成（承認申請: DRAFT → PENDING_MANAGER）
- [ ] `src/app/api/goals/[goalSetId]/meeting-reject/route.ts` 作成（最終承認後差し戻し）

**完了条件**: 目標セットを作成・保存でき、承認申請ができる / APPROVED後の編集が 409 になる / 等級1〜2は申請なしで SAVED になる

---

### 5-3. 目標修正申請（S-05）

- [ ] `src/app/(main)/goals/[goalSetId]/revision/page.tsx` 作成
  - [ ] 修正理由コード選択（6種類: KPI_CHANGE / STANDARD_DEVIATION / ROLE_CHANGE / MIDTERM_ENTRY / EARLY_CLOSURE / GRADE_PROMOTION）
  - [ ] 変更内容入力
- [ ] `src/app/api/goals/[goalSetId]/revision/route.ts` 作成
  - [ ] 修正申請承認時: 旧版 `goals` レコードを `is_current = false` に更新し、新版を `is_current = true` で作成

**完了条件**: APPROVED状態の目標セットで修正申請ができる / 申請中も status が APPROVED のまま / 承認後に旧版がバージョン履歴に表示される

---

### 5-4. 承認・申請管理（S-15）

- [ ] `src/components/approvals/ApprovalList.tsx` 作成
- [ ] `src/components/approvals/ApprovalActionModal.tsx` 作成
- [ ] `src/components/approvals/MeetingRejectModal.tsx` 作成
- [ ] `src/app/(main)/approvals/page.tsx` 作成（タブ: 承認待ち / 承認済み / 差し戻し済み）
- [ ] `src/app/api/approvals/route.ts` 作成
- [ ] `src/app/api/approvals/[requestId]/approve/route.ts` 作成
  - [ ] 承認ステップに応じた status 遷移（PENDING_MANAGER → PENDING_DIVISION → PENDING_EXECUTIVE → APPROVED）
  - [ ] 各承認時に `notifications` テーブルへ通知レコードを書き込む（P0スコープ）
- [ ] `src/app/api/approvals/[requestId]/reject/route.ts` 作成
  - [ ] 差し戻し時に `notifications` テーブルへ通知レコードを書き込む（P0スコープ）

**完了条件**: 4段階の承認フローが正常に動作する / 差し戻し後に社員が再申請できる

---

### 5-5. 中間振り返り（F-07）

- [ ] `src/components/reviews/MidtermReviewForm.tsx` 作成
  - [ ] 各目標項目ごとの社員コメント入力
  - [ ] 各目標項目ごとの上長コメント入力（上長ロールのみ表示）
  - [ ] 上長が修正依頼を送る機能（`revision_requested` フラグを true に設定）
- [ ] `src/app/api/goals/[goalSetId]/midterm-review/route.ts` 作成
  - [ ] `employee_submitted_at` / `manager_submitted_at` の個別保存
  - [ ] `revision_requested` フラグ更新エンドポイント

**完了条件**: 社員と上長がそれぞれコメントを入力・保存できる / 修正依頼フラグが立つとダッシュボードの対応事項に表示される

---

### 5-6. 自己評価（S-06）・上長評価（S-07）

- [ ] `src/components/reviews/SelfReviewForm.tsx` 作成（スコア選択 + コメント）
- [ ] `src/components/reviews/ManagerReviewForm.tsx` 作成
- [ ] `src/components/reviews/BiasWarningBanner.tsx` 作成（認知バイアス5症状の静的ガイダンスバナー）
- [ ] `src/components/reviews/ScoreDisplay.tsx` 作成
- [ ] `src/app/(main)/goals/[goalSetId]/self-review/page.tsx` 作成
- [ ] `src/app/(main)/goals/[goalSetId]/manager-review/page.tsx` 作成
  - [ ] 自己評価未提出の場合は入力フォームをロック
- [ ] `src/app/api/goals/[goalSetId]/self-review/route.ts` 作成
- [ ] `src/app/api/goals/[goalSetId]/manager-review/route.ts` 作成

**完了条件**: 自己評価提出後に上長評価が入力可能になる / バイアス警告バナーが常時表示される

---

### 5-7. 評価調整・確定（S-08）

- [ ] `src/lib/score.ts` 作成（MBOスコア計算 / 360度スコア合算ロジック）
- [ ] `src/lib/phases.ts` 作成（フェーズ判定ロジック）
- [ ] `src/components/admin/EvaluationAdjustmentTable.tsx` 作成
- [ ] `src/app/(main)/admin/review-adjustment/page.tsx` 作成
  - [ ] 総合評価（S/A/B/C/D）選択・確定 UI
- [ ] `src/app/api/admin/evaluations/route.ts` 作成
- [ ] `src/app/api/admin/evaluations/[goalSetId]/route.ts` 作成（スコア調整・総合評価確定）
- [ ] `src/app/api/admin/evaluations/[goalSetId]/score-preview/route.ts` 作成

**完了条件**: 全社員の評価スコアを確認・調整・確定できる / 総合評価（S/A/B/C/D）が `final_evaluations` に保存される

---

### 5-8. 目標一覧（S-09）

- [ ] `src/app/(main)/goals/page.tsx` 作成
  - [ ] 自部署の goal_sets 一覧
  - [ ] 承認ステップインジケーター表示
  - [ ] 行クリックで S-04 へ遷移

**完了条件**: 自部署のメンバーの目標一覧が表示される

---

## フェーズ6: P1 追加機能

### 6-1. 管理画面（S-12/S-13/S-14）

- [ ] `src/components/admin/UserManagementTable.tsx` 作成
- [ ] `src/components/admin/OrganizationTree.tsx` 作成
- [ ] `src/components/admin/PeriodForm.tsx` 作成
- [ ] `src/app/(main)/admin/users/page.tsx` 作成
- [ ] `src/app/(main)/admin/organizations/page.tsx` 作成
- [ ] `src/app/(main)/admin/periods/page.tsx` 作成
- [ ] `src/app/api/admin/users/route.ts` 作成（GET / POST）
- [ ] `src/app/api/admin/users/[userId]/route.ts` 作成（PATCH）
- [ ] `src/app/api/admin/organizations/route.ts` 作成（GET / POST）
- [ ] `src/app/api/admin/organizations/[orgId]/route.ts` 作成（PATCH）
- [ ] `src/app/api/admin/periods/route.ts` 作成（GET / POST）
- [ ] `src/app/api/admin/periods/[periodId]/phases/route.ts` 作成（PATCH）

**完了条件**: 社員・組織・評価期の CRUD が HR/ADMIN ロールで操作できる

---

### 6-2. 通知（S-17）

- [ ] `src/lib/notifications.ts` 作成（DB書き込み関数 + Edge Function 呼び出し）
- [ ] `src/hooks/useNotifications.ts` 作成
- [ ] `src/components/notifications/NotificationList.tsx` 作成
- [ ] `src/app/(main)/notifications/page.tsx` 作成
- [ ] `src/app/api/notifications/route.ts` 作成（GET）
- [ ] `src/app/api/notifications/[id]/read/route.ts` 作成（PATCH）
- [ ] Header の通知アイコンに未読バッジ表示（SWRポーリング）
- [ ] Supabase Edge Function セットアップ（メール送信）

**完了条件**: 通知一覧が表示され、既読更新できる / 承認・差し戻し時にメールが送信される

---

### 6-3. 過去の評価（S-18）

- [ ] `src/app/(main)/evaluations/history/page.tsx` 作成
- [ ] `src/app/api/evaluations/history/route.ts` 作成（GET: ログインユーザーの過去評価一覧）

**完了条件**: 過去評価期の総合評価・MBOスコアが一覧で確認できる

---

### 6-4. SmartHR CSV インポート

- [ ] `src/app/api/admin/smarthr/import/route.ts` 作成（CSV パース + `employees` 差分更新）
  - [ ] SmartHR エクスポート CSV のカラム定義に準拠したパース処理
  - [ ] バリデーションエラー行をスキップし、エラー行番号と理由を JSON で返す

**完了条件**: SmartHR CSV をアップロードして社員情報を差分更新できる / エラー行がレスポンスで確認できる

---

### 6-5. 監査ログ

- [ ] `src/app/api/admin/audit-logs/route.ts` 作成（GET: HR/ADMIN のみ）
- [ ] 承認・評価操作後の `audit_logs` 書き込み処理を各 Route Handler に組み込む

**完了条件**: 承認・評価操作が監査ログに記録され、HR/ADMIN が一覧参照できる

---

## フェーズ7: P2 任意機能

- [ ] `src/app/(main)/goals/all/page.tsx` 作成（S-10 目標一覧・全社）
- [ ] `src/app/(main)/employees/[employeeId]/page.tsx` 作成（S-11 社員プロフィール）
- [ ] `src/app/(main)/reports/summary/page.tsx` 作成（S-16 評価サマリ）
- [ ] `src/app/api/admin/degree360-scores/route.ts` 作成（POST）
- [ ] `src/app/api/admin/degree360-scores/import/route.ts` 作成（CSV インポート）
- [ ] `src/app/api/employees/[employeeId]/history/route.ts` 作成
- [ ] `src/app/api/reports/summary/route.ts` 作成

---

## テスト

- [ ] `__tests__/unit/lib/score.test.ts` 作成（スコア計算ロジック）
- [ ] `__tests__/unit/lib/permissions.test.ts` 作成（権限チェックロジック）
- [ ] `__tests__/unit/components/goals/ApprovalStepIndicator.test.tsx` 作成
- [ ] `e2e/goal-setting.spec.ts` 作成（目標設定〜APPROVED の E2E）
- [ ] `e2e/evaluation.spec.ts` 作成（自己評価〜評価確定の E2E）

---

## デプロイ準備

- [ ] Vercel プロジェクト作成・GitHub リポジトリ連携
- [ ] Vercel に環境変数設定（`NEXT_PUBLIC_SUPABASE_URL` 等）
- [ ] Supabase に環境変数設定（`SENDGRID_API_KEY` 等）
- [ ] 本番DBマイグレーション実行
- [ ] Supabase Edge Function デプロイ（メール通知）
- [ ] 初期データ投入（評価期・管理者ユーザー等）
- [ ] ベータ版動作確認（社内メンバー限定公開）
