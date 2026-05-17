# 社内MBO管理システム 仕様書

**バージョン**: 1.10
**作成日**: 2026-03-27
**最終更新日**: 2026-04-30
**対象読者**: 開発担当者、プロジェクトマネージャー、人事担当者

---

## 変更履歴

| バージョン | 更新日 | 変更概要 |
|-----------|--------|---------|
| 1.0 | 2026-03-27 | 初版作成 |
| 1.1 | 2026-03-27 | 評価ガイドライン精査による仕様更新。対象範囲に等級1〜2・契約社員・アシスタントを明記。評価スケジュールに7月360度評価を追加。ロール定義に`employee_type`を追加。機能一覧にF-17（目標設定ガイダンス）・F-18（評価バイアス警告）を追加。F-05目標設定のウェイトデフォルト値・連動パターンガイダンスを更新。F-10評価調整・確定に360度スコア合算ロジックを組み込み。特殊ケース評価ルールセクション（4.3）を新規追加。データモデルに`employee_type`・`360_degree_scores`を追加。用語集を拡充。 |
| 1.2 | 2026-03-27 | 実運用の実態に合わせ等級1〜2の目標設定可否を修正。等級1〜2も目標入力は可能だが承認フロー・評価対象外として位置づけ。`is_mbo_target`の意味を「承認フロー・評価の対象か否か」に明確化。目標設定会議向けフィルタ（等級3以上絞り込み）を機能仕様に追加。 |
| 1.3 | 2026-03-27 | 承認後の自由編集禁止をAPIレベルで明記。目標設定会議での部長差し戻し機能（F-19）を新規追加。`goal_sets.status`に`MEETING_REJECTED`を追加。S-04・S-15・S-09の画面仕様を更新。APIに差し戻しエンドポイントを追加。ステータス遷移図を更新。 |
| 1.4 | 2026-03-27 | 中間振り返り時の目標修正フローを拡充。社員起点・上長起点の両方のフローをF-06・F-07に明記。上長からの修正依頼フラグ機能を追加。差し戻し→再申請ループを明記。`approval_requests`に`REVISION_REJECTED`ステータスと`REVISION_REQUEST`種別を追加。S-05・S-15の画面仕様を更新。 |
| 1.5 | 2026-04-14 | 承認フローを4段階（本人→上長→事業部長→経営）に拡充。目標修正申請も同様のフローを適用。イレギュラー社員対応（休職・復職・中途・退職）に向けた期中目標設定・期中評価クローズ・評価対象外フラグ・対象月数管理を追加。SmartHRからのCSV連携（人事属性更新）機能を定義。データモデルに承認多段化・イレギュラー対応用のカラムを追加。 |
| 1.6 | 2026-04-23 | モックアップ指摘に基づくUI仕様更新。中間振り返りに上長振り返りコメント入力欄を追加（F-07）。ダッシュボードの「ToDoリスト」を「対応事項」に改称し、目標サマリと並び順を入れ替え。ダッシュボードから前期評価表示を削除し過去の評価は左ナビ「過去の評価」（S-18）からのみ参照する方針に変更。ナビゲーションメニュー構成およびUIカラー方針（基本色 `#01AEBB` / `#FFFFFF`）を明記。 |
| 1.7 | 2026-04-23 | 期中昇格（等級2→3）シナリオを仕様化。F-06に `GRADE_PROMOTION` 修正理由コードを追加。セクション4.3に期中昇格ケースを追加。セクション7.4の等級変更ルールを「2月昇格は当期下期から適用が原則」に修正。 |
| 1.8 | 2026-04-27 | 関係者フィードバックに基づくUI用語・仕様更新。F-19「目標設定会議差し戻し」を「最終承認後差し戻し（難易度調整）」に改称し、APPROVED後の差し戻しであることを明確化。S-09目標一覧（評価者視点）に承認フローステップインジケーター表示を追加し、現在の承認段階を可視化。S-15タブ名・S-04ボタン名を同様に更新。 |
| 1.9 | 2026-04-30 | 仕様全体の整合性見直しによる修正・明確化。①`goals.revision_reason`コメントに`MIDTERM_ENTRY`/`EARLY_CLOSURE`/`GRADE_PROMOTION`を追記。②S-05の修正理由コード選択肢を6種類に統一。③S-04の編集ボタン制御で未定義だった`PENDING_APPROVAL`を正式ステータス表記に修正。④付録Aのステータス遷移図の誤記（差し戻し後`DRAFT/REJECTED`→`REJECTED`のみ、差し戻し権限「経営/部長」→「経営」）を修正。⑤`approval_requests.status`の未使用DEFAULT値`'PENDING'`を削除。⑥`goal_sets`に`is_active`フラグを追加し、UNIQUE制約を条件付きインデックスに変更。期中昇格時の旧goal_set「破棄」を「論理削除」に統一。⑦修正申請中の`goal_sets.status`は`APPROVED`を維持することをF-06共通ルールに明記。⑧`approval_requests`のステップごと別レコード方式とMEETING_REJECTION時の各カラム意味を明記。⑨`goals.weight`の合計100%担保をAPIバリデーション＋DBトリガーの二重制約とする方針を明記。⑩監査ログ保持期間を90日から10年（目標・評価データと同等）に変更。⑪F-19の操作権限を`position = DEPT_MANAGER`（部長・事業部長）以上に限定しユニット長を除外。⑫`midterm_reviews`の`submitted_at`を`employee_submitted_at`/`manager_submitted_at`の2カラムに分離し中間振り返りの完了条件を明確化。⑬中途入社者の「初回は昇格判断のみ」を「初回評価期は昇給算定対象外・参考資料としてのみ使用」と具体化。⑭フェーズ外操作（期中目標設定・期中クローズ）のAPI制御方針を追記（HR/ADMINのフラグ付与による例外許可、一般ロールは403）。 |
| 1.10 | 2026-04-30 | 認証方式を見直し、SSO / 社内IdP連携前提の記述を廃止。このシステム専用のID・パスワード認証を採用する方針に統一。 |

---

## 目次

1. [システム概要・目的](#1-システム概要目的)
2. [インフラ・技術スタック](#2-インフラ技術スタック)
3. [ユーザー・権限設計](#3-ユーザー権限設計)
4. [機能要件](#4-機能要件)
5. [画面一覧・画面仕様](#5-画面一覧画面仕様)
6. [データモデル](#6-データモデル)
7. [組織変更対応の設計方針](#7-組織変更対応の設計方針)
8. [非機能要件](#8-非機能要件)
9. [将来のAWS移行方針](#9-将来のaws移行方針)
10. [付録](#10-付録)

---

## 1. システム概要・目的

### 1.1 背景と課題

現状、MBO目標の管理はExcelファイルをSharePointの部署ごとのフォルダで運用している。この運用には以下の課題がある。

| 課題 | 内容 |
|------|------|
| 発見性の低さ | ファイルの格納場所がわかりにくく、他者の目標を参照するコストが高い |
| 履歴の追いにくさ | 期ごとの目標・達成度の変遷を時系列で確認することが困難 |
| 協力関係の希薄化 | 他の社員の目標を知る機会が限られ、横断的な協力が生まれにくい |
| 目標修正管理の困難さ | 期中の修正履歴が残らず、評価時に経緯の確認ができない |

### 1.2 システムの目的

- MBO目標の設定・評価・履歴管理をWebシステムに集約し、運用コストを削減する
- 社員がお互いの目標を容易に参照できる環境を整備し、組織横断的な協力関係を促進する
- 組織変更・人事異動があっても過去の記録を正確に保持し、履歴追跡を可能にする

### 1.3 対象範囲

> **v1.2 更新**: 等級1〜2も目標入力は可能だが承認フロー・評価対象外として位置づけを明確化した。

#### 目標設定・MBO評価の対象範囲

| 雇用形態 | 等級 | 目標入力 | 承認フロー | MBO評価 | 360度評価 | 備考 |
|---------|------|---------|----------|---------|---------|------|
| 正社員 | 等級3以上 | 可 | **4段階承認** | 対象（年1回/7〜9月） | 対象 | 本システムのメイン利用者。本人→上長→事業部長→経営承認のフロー |
| 正社員 | 等級1〜2 | 可 | 対象外 | 対象外 | 対象（半期に一度/2・7月） | 目標は入力・共有できるが、承認フローには乗らず評価にも使用しない |
| 契約社員 | - | 可 | 対象外 | 対象外（契約更新時に上長評価） | 育成目的で対象 | 契約更新タイミングで上長が昇降給評価を実施 |
| アシスタント | - | 可 | 対象外 | 対象外（契約更新時に上長評価） | 正社員の評価回答対象外 | 360度評価の回答者にはなれない |

#### 承認フローの多段化

目標設定および目標修正申請は、以下の4段階のステップを経て最終確定（`APPROVED`）される。
1. **本人入力・申請**: ステータスが `PENDING_MANAGER` に遷移。
2. **直属上長（1次評価者）承認**: ステータスが `PENDING_DIVISION` に遷移。
3. **事業部長（2次評価者）承認**: ステータスが `PENDING_EXECUTIVE` に遷移。
4. **経営承認（最終承認）**: ステータスが `APPROVED` に遷移。

#### イレギュラー社員の扱い

休職・復職・中途入社・退職の各ケースについて、以下の通り「評価対象月数」と「評価対象外フラグ」を用いてシステム制御を行う。

- **評価対象外（フラグ: `is_evaluation_exempt`）**:
  - 評価対象期間における実勤務期間が**6か月未満**の場合は評価対象外とする。
  - 目標設定は可能（文化・共有目的）だが、評価スコアの算出や昇降給判定からは除外される。
- **実勤務期間のカウント**:
  - 各社員の評価セットごとに `target_months` (対象月数) を保持し、昇給額の按分計算等に利用する。
- **期中目標設定**:
  - 復職者や中途入社者は、標準の目標設定フェーズ（10月）以外でも、入社/復職タイミングで目標設定を可能とする。
- **期中クローズ（評価の早期完了）**:
  - 休職予定者（実勤務6か月以上）や退職者は、期末を待たずにその時点までの自己評価・上長評価を実施し、プロセスをクローズできる。
- **退職者**:
  - 人事担当者がシステム上でプロセスを強制終了（クローズ）できる仕組みを提供する。

#### 評価サイクルと目標構成

- **評価サイクル**: 年1回（10月開始・翌年9月終了）
- **目標構成**: KPI連動目標2件 ＋ 組織貢献目標1件（合計3件）

### 1.4 評価スケジュール

> **v1.1 更新**: 7月の360度評価実施タイミングを追加した。

```
10月          2月                    7月              8〜9月          10月
 |             |                      |                 |               |
目標設定      中間振り返り              360度評価実施      自己評価         評価調整
              目標修正申請              昇降格判断         上長評価         最終評価確定
              360度サーベイ中間評価     登用/降職の優先実施
```

#### フェーズ別の主要アクション

| フェーズ | 時期 | 主要アクション |
|---------|------|--------------|
| 目標設定 | 10月 | MBO目標3件の設定・承認 |
| 中間振り返り | 2月 | 進捗確認・目標修正申請・360度サーベイ中間評価・等級2以下の半期評価 |
| 360度評価 | 7月 | 360度評価実施・昇降格判断・登用/降職の優先実施・等級2以下の半期評価 |
| 自己評価・上長評価 | 8〜9月 | MBO達成度の自己評価・上長評価 |
| 評価調整・確定 | 10月 | 最終評価の調整・確定 |

---

## 2. インフラ・技術スタック

### 2.1 ベータ版構成（現フェーズ）

**Vercel + Supabase** 構成を採用する。

```
ユーザー
  ↓
Vercel（Next.js: フロントエンド + API Routes）
  ↓
Supabase
  ├ PostgreSQL（メインDB）← Prisma ORM経由
  ├ Auth（認証）
  └ Storage（将来の添付ファイル用）
```

#### 採用理由

| 比較項目 | Vercel + Supabase | AWS Amplify + RDS |
|----------|-------------------|-------------------|
| 初期セットアップ | 数時間 | 数日 |
| VPC・ネットワーク設定 | 不要 | 必要 |
| コネクションプール | Supabaseが内蔵（PgBouncer） | RDS Proxy別途設定 |
| 認証 | Supabase Authが内蔵 | Cognito別途設定 |
| DBマイグレーション | Supabase CLIで簡単 | 自前管理 |
| 費用（ベータ段階） | 無料〜低コスト | 比較的高め |

### 2.2 技術スタック詳細

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド | Next.js (App Router) + TypeScript | SSR/SSG対応 |
| UIコンポーネント | shadcn/ui + Tailwind CSS | アクセシビリティ対応済み |
| バックエンド | Next.js Route Handlers | API Routes |
| ORM | Prisma | TypeScript型安全、マイグレーション管理 |
| データベース | PostgreSQL（Supabase） | PgBouncer内蔵でコネクションプール管理 |
| 認証 | Supabase Auth | システム専用のID・パスワード認証を実装 |
| ホスティング | Vercel | CI/CD・プレビュー環境込み |
| ファイルストレージ | Supabase Storage | 将来の添付ファイル対応 |
| メール通知 | Supabase Edge Functions + AWS SES | トランザクションメール |
| CI/CD | GitHub Actions + Vercel | テスト・Lint・デプロイ自動化 |

### 2.3 ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (main)/
│   │   ├── dashboard/
│   │   ├── goals/
│   │   │   ├── page.tsx              # 目標一覧
│   │   │   ├── new/
│   │   │   └── [goalSetId]/
│   │   ├── approvals/
│   │   ├── reports/
│   │   └── admin/
│   │       ├── users/
│   │       ├── organizations/
│   │       └── periods/
│   └── api/
│       ├── goals/
│       ├── reviews/
│       ├── approvals/
│       └── admin/
├── components/
│   ├── ui/                           # shadcn/ui ベースの基本コンポーネント
│   ├── goals/                        # 目標関連コンポーネント
│   ├── reviews/                      # 評価関連コンポーネント
│   └── layout/                       # ヘッダー・サイドバー等
├── lib/
│   ├── auth.ts                       # Supabase Auth設定（ID・パスワード認証）
│   ├── db.ts                         # Prismaクライアント
│   └── permissions.ts                # 権限チェックロジック
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── types/
    └── index.ts                      # 共通型定義
```

---

## 3. ユーザー・権限設計

### 3.1 ロール定義

> **v1.1 更新**: `employee_type`（雇用形態）の概念をロールとは独立した別軸として追加した。

#### ロール（`role`）: システム上の操作権限を表す

| ロールID | ロール名 | 説明 |
|----------|----------|------|
| `ADMIN` | システム管理者 | 全データへのフルアクセス。組織・ユーザー・評価期マスタの管理 |
| `HR` | 人事担当者 | 全社員の目標・評価の閲覧。等級・評価結果の入力・管理。評価調整の実施 |
| `MANAGER` | 上長（ユニット長・部長・事業部長） | 自身の目標設定・自己評価入力に加え、配下メンバーの目標承認・評価入力。配下組織の目標一覧閲覧 |
| `TEAM_LEADER` | チームリーダー | 担当チームメンバーの目標閲覧・コメント入力。自身はMEMBER権限も持つ |
| `MEMBER` | 一般社員 | 自身の目標設定・自己評価入力。他社員の目標の閲覧（公開範囲設定に従う） |

> 1ユーザーは複数ロールを持てる（例: チームリーダーはTEAM_LEADERとMEMBERを同時に持つ）

#### 雇用形態（`employee_type`）: 評価制度の適用ルールを決定する別軸

`employee_type` はロールとは独立した属性であり、MBO評価対象の可否・360度評価の扱い・昇降給ルールの適用に影響する。

| employee_type | 雇用形態 | MBO評価 | 360度評価（受ける側） | 360度評価（回答者） | 昇降給の基準 |
|--------------|---------|---------|-------------------|-----------------|------------|
| `REGULAR` | 正社員 | 等級3以上で対象 | 対象 | 対象（等級2以上） | MBOスコア + 360度スコア合算 |
| `CONTRACT` | 契約社員 | 対象外 | 育成目的で対象 | 対象（等級2以上） | 360度評価成果スコアで昇降給 |
| `ASSISTANT` | アシスタント | 対象外 | 対象 | 対象外 | 360度評価成果スコアで昇降給 |

> `employee_type` は `organization_memberships` テーブルに格納し、異動・契約変更時に更新する（詳細は6.2参照）。

### 3.2 権限マトリクス

| 操作 | ADMIN | HR | MANAGER | TEAM_LEADER | MEMBER |
|------|:-----:|:--:|:-------:|:-----------:|:------:|
| ユーザー管理 | ○ | ○ | - | - | - |
| 組織マスタ管理 | ○ | ○ | - | - | - |
| 評価期マスタ管理 | ○ | ○ | - | - | - |
| 自分の目標設定・編集 | ○ | ○ | ○ | ○ | ○ |
| 自分の目標修正申請 | ○ | ○ | ○ | ○ | ○ |
| 配下メンバーの目標承認 | ○ | ○ | ○ | - | - |
| 配下メンバーの上長評価入力 | ○ | ○ | ○ | - | - |
| 全社員の目標閲覧 | ○ | ○ | - | - | - |
| 配下組織の目標閲覧 | ○ | ○ | ○ | ○ | - |
| 同一部署の目標閲覧（公開分） | ○ | ○ | ○ | ○ | ○ |
| 最終評価確定 | ○ | ○ | - | - | - |
| 評価サマリ・集計閲覧 | ○ | ○ | ○（配下のみ） | - | - |

### 3.3 目標の公開範囲設定

目標には公開範囲を設定できる。デフォルトは「部署内公開」。

| 公開範囲 | 閲覧できる対象 |
|----------|----------------|
| `SELF_ONLY` | 本人と上長・HR・ADMINのみ |
| `DEPARTMENT` | 同一部署の全メンバー（デフォルト） |
| `COMPANY` | 全社員 |

---

## 4. 機能要件

### 4.1 機能一覧

> **v1.5 更新**: 承認フローの多段化（4段階）への対応、F-20（イレギュラー社員対応）、F-21（SmartHR CSV連携）を追加した。

| 機能ID | 機能名 | 優先度 | 説明 |
|--------|--------|--------|------|
| F-01 | 認証 | 必須 | Supabase AuthによるID・パスワード認証 |
| F-02 | ユーザー管理 | 必須 | 社員情報・ロール・等級・雇用形態の管理 |
| F-03 | 組織管理 | 必須 | 部署・組織構造の管理（組織変更対応） |
| F-04 | 評価期管理 | 必須 | 評価サイクルの期間・フェーズ管理 |
| F-05 | 目標設定 | 必須 | MBO目標の新規設定・4段階承認フロー（本人→上長→事業部長→経営） |
| F-06 | 目標修正申請 | 必須 | 期中の目標修正申請・4段階承認フロー |
| F-07 | 中間振り返り | 必須 | 2月時点の進捗入力・コメント |
| F-08 | 自己評価入力 | 必須 | 期末の自己評価スコア・コメント入力 |
| F-09 | 上長評価入力 | 必須 | 上長による評価スコア・コメント入力 |
| F-10 | 評価調整・確定 | 必須 | HR・ADMINによる最終評価の調整・確定（360度スコア合算含む） |
| F-11 | 目標一覧・検索 | 必須 | 社員・期・部署での目標絞り込み閲覧 |
| F-12 | 過去履歴閲覧 | 必須 | 社員ごとの目標・評価の期別履歴 |
| F-13 | 通知・リマインダー | 推奨 | フェーズ切替・承認待ち等のメール通知 |
| F-14 | 評価サマリ・集計 | 推奨 | 部署・等級別の評価分布・集計レポート |
| F-15 | エクスポート | 推奨 | CSV/Excelへのデータエクスポート |
| F-16 | 監査ログ | 推奨 | 重要操作のログ記録・閲覧 |
| F-17 | 目標設定ガイダンス | 推奨 | 目標入力画面で連動パターン・達成基準の説明をインラインヘルプとして表示 |
| F-18 | 評価バイアス警告 | 推奨 | 上長評価入力時に評価バイアス五大症状のガイダンスを表示 |
| F-19 | 最終承認後差し戻し（難易度調整） | 必須 | 経営承認（`APPROVED`）後に部長以上が目標の難易度調整を目的として差し戻しできる機能 |
| F-20 | イレギュラー社員対応 | 必須 | 休職・復職・退職時の期中クローズ、期中目標設定、対象月数管理 |
| F-21 | SmartHR CSV連携 | 必須 | SmartHRから排出されたCSVによる、等級・雇用形態・1次/2次評価者の更新機能 |

### 4.2 主要機能の詳細

#### F-05 目標設定

> **v1.2 更新**: 等級1〜2も目標入力可能に変更。承認フロー対象は等級3以上のみ。

- 目標設定は評価期の「目標設定フェーズ」（10月〜）のみ可能
- **目標入力対象者**: システムに登録されている全社員（等級1〜2・契約社員・アシスタントを含む）
- **承認フロー対象者**: `employee_type = REGULAR` かつ `grade >= 3` の社員のみ（`is_mbo_target = TRUE`）
  - 等級1〜2の社員は目標を入力・保存・共有できるが、承認申請ボタンは表示されない
- 1社員につき1評価期に対して1つの目標セット（3件）を作成する
- 各目標の入力項目:

| 項目 | 必須 | 制約 |
|------|:----:|------|
| 目標タイプ | ○ | `KPI_1` / `KPI_2` / `ORG_CONTRIBUTION` |
| 目標タイトル | ○ | 最大100文字 |
| 目標詳細・行動計画 | ○ | 最大2000文字 |
| 連動パターン | ○（KPI目標のみ） | KPI目標は`KPI_DECOMPOSITION` / `LEADING_INDICATOR` / `ROLE_IN_GOAL` の3パターンから選択。組織貢献目標は`UPPER_GOAL` / `TEAM_GROWTH` から選択 |
| 達成基準（1.2 / 1.0 / 0.8） | ○ | 各水準の定義を記述 |
| 重み | ○ | 3目標の合計が100%。デフォルト: KPI_1=50%、KPI_2=30%、ORG_CONTRIBUTION=20%。カスタマイズ可能 |
| 公開範囲 | ○ | `SELF_ONLY` / `DEPARTMENT` / `COMPANY` |

**連動パターンのUIヒント（F-17と連携）:**

| 連動パターンコード | 名称 | 説明（インラインヘルプに表示） | 例 |
|-----------------|------|--------------------------|---|
| `KPI_DECOMPOSITION` | 分解 | チームや部署のKPIを個人目標へ分解する | チーム売上1.5億 → 個人5000万 |
| `LEADING_INDICATOR` | 先行指標 | 最終KPIへつながる先行指標を設定する | 新規売上2億 → 3月末100社口頭受注 |
| `ROLE_IN_GOAL` | 役割設定 | チーム目標に対する自分の役割・貢献を定義する | 問い合わせ100件 → セミナー20開催＆満足度4.0以上 |
| `UPPER_GOAL` | 上位目標 | 部門や上位組織のKPIをそのまま担う | 商品開発部の4つのKPI目標をすべて達成する |
| `TEAM_GROWTH` | チーム力向上 | チームの育成・改善に貢献する目標 | 中途の3か月戦力化を目指し10回の勉強会開催 |

**達成基準のガイダンス（F-17と連携）:**

| 水準 | 定義 | 説明（インラインヘルプに表示） |
|------|------|--------------------------|
| 1.2 | 挑戦目標 | 1.0の1.2倍以上で、組織の発展に影響するアウトカムが出せるレベル |
| 1.0 | 達成目標 | KPIと等級定義から、今回目指すべきストレッチな目標。できるかギリギリのライン |
| 0.8 | 最低目標 | 1.0の約8割。着実に努力すれば達成可能なレベル |

- **等級3以上（`is_mbo_target = TRUE`）**: 設定後、上長に承認申請を行う。以下の4段階フローを経て確定する。
  1. 社員が申請 → `PENDING_MANAGER`（直属上長承認待ち）
  2. 直属上長が承認 → `PENDING_DIVISION`（事業部長承認待ち）
  3. 事業部長が承認 → `PENDING_EXECUTIVE`（経営承認待ち）
  4. 経営が承認 → `APPROVED`（確定）
- 各段階で差し戻しが可能。差し戻された場合は `REJECTED` ステータスとなり、社員が修正して再申請する。
- **等級1〜2（`is_mbo_target = FALSE`）**: 承認フローなし。入力・保存後は即 `SAVED` ステータスになる。承認申請ボタンは表示しない。

> **承認後の編集制限（v1.3追加・v1.5更新）**: `APPROVED`・承認申請中（`PENDING_*`）の状態では、社員による目標内容の自由編集を禁止する。APIの `PATCH /api/goals/:goalSetId` は `DRAFT` / `REJECTED`（差し戻し後）/ `MEETING_REJECTED`（最終承認後差し戻し）のみ受け付け、それ以外のステータスでは `409 Conflict` を返す。

#### F-06 目標修正申請

> **v1.5 更新**: 目標設定と同様に4段階の承認フローを適用。また、復職者等の「期中目標設定」および休職予定者等の「期中クローズ」についても本機能の枠組みを利用する。

以下のいずれかの条件に該当する場合のみ申請可能（修正理由の選択・記入が必須）。

| 修正理由コード | 内容 |
|----------------|------|
| `KPI_CHANGE` | 会社全体または部署KPIの方針変更 |
| `STANDARD_DEVIATION` | 前例のない取り組みで達成基準が大きく乖離した |
| `ROLE_CHANGE` | 周囲の退職・休職により役割が大きく変更された |
| `MIDTERM_ENTRY` | 中途入社・復職に伴う期中目標設定（v1.5追加） |
| `EARLY_CLOSURE` | 休職・退職に伴う期中クローズ（評価の早期実施）（v1.5追加） |
| `GRADE_PROMOTION` | 中間振り返り時の等級2→3昇格に伴うMBO目標新規設定（v1.7追加） |

**フロー① 社員起点（社員が自発的に修正申請する場合）:**

```
社員が修正案を作成・申請
  ↓
4段階承認フロー（本人→上長→事業部長→経営）
  ├ すべて承認 → 確定（旧バージョンは履歴保持）
  └ いずれかで差し戻し → 社員が再修正して再申請
```

**フロー② 上長起点（上長が修正を指示する場合）:**

```
上長が中間振り返りフィードバック入力時に「修正依頼」フラグを立てる（F-07）
  ↓ 社員に通知
社員が修正案を作成・申請（`approval_requests.status = PENDING`）
  ↓ 以降はフロー①と同じ
```

**共通ルール:**

- 修正申請（`approval_requests.request_type = GOAL_REVISION`）は上長承認が必要
- **修正申請中の `goal_sets.status` は `APPROVED` のまま維持する**。全ステップの承認が完了した時点で新バージョンの目標を `is_current = TRUE`、旧バージョンを `is_current = FALSE` に更新する（`goal_sets.status` は変化しない）
- 承認されると新バージョンの目標として保存し、変更前の内容は履歴として保持する
- 差し戻し時はコメント入力必須。社員・申請者に通知される
- 修正回数に上限は設けないが、全バージョンを履歴として参照可能にする
- 期初に立てた目標の**削除は不可**（修正・追加のみ可能）
- 修正申請のステータスは `approval_requests.status` の `PENDING` / `APPROVED` / `REJECTED` で管理する
  - `REJECTED` の場合、社員は修正案を修正して再申請できる

#### F-07 中間振り返り（2月）

> **v1.4 更新**: 上長からの修正依頼フラグ機能を追加した。

- 各目標に対して進捗コメントを入力する（本人記入）
- 目標修正が必要な場合はここから修正申請を起票する（F-06へ）
- **上長振り返りコメント**: 上長（1次評価者）は各目標に対して振り返りコメントを入力できる。社員のコメントと上長のコメントは画面上で並列表示される。社員が提出すると `employee_submitted_at` が記録され、上長が提出すると `manager_submitted_at` が記録される。**両カラムに値が入った時点で中間振り返りが「提出完了」**となる（どちらが先でも構わない）。上長コメントは `midterm_reviews.manager_comment` に保存する
- **上長からの修正依頼（v1.4追加）**: 上長は各目標のフィードバック入力時に「修正依頼」フラグを立てられる。フラグが立つと社員に通知が届き、社員はF-06の修正申請を起票する起点となる。修正依頼フラグは `midterm_reviews.revision_requested` で管理する

#### F-08 自己評価入力

- 評価フェーズ（8〜9月）にのみ入力可能
- 各目標に対して達成スコア（1.2 / 1.0 / 0.8 またはカスタム値）とコメントを入力
- MBOスコア = Σ（各目標スコア × 重み）

#### F-09 上長評価入力

- 自己評価提出後にのみ入力可能
- 各目標に対してスコアとコメントを入力
- 自己評価との差異がある場合はコメント記入を必須とする
- 入力画面上に評価バイアス警告（F-18）を表示する

#### F-10 評価調整・確定

> **v1.1 更新**: 360度評価スコアとの合算ロジックをシステム内で計算する方針に変更した。

- HR/ADMINが全社員のMBOスコアを一覧で確認し、最終評価（S/A/B/C/D）を設定する
- **360度評価スコアとの合算をシステム内で計算する**（v1.0では本システム外扱いだったが、ルールが明確なため統合）
- 最終評価確定後は社員・上長も結果を閲覧可能になる

**MBOスコア計算ロジック（等級3以上）:**

```
MBOスコア = Σ ( goal[i].score × goal[i].weight / 100 )
            for i in {KPI_1, KPI_2, ORG_CONTRIBUTION}

達成スコアの対応表:
  1.2以上 → 120点
  1.0以上1.2未満 → 100点
  0.8以上1.0未満 → 80点
  0.8未満 → 79点以下（実数値を使用）
```

**360度スコア加算ロジック（等級3以上）:**

```
360度「成果」スコア加算:
  成果スコアが4.5以上、かつ全体回答者の上位20%以内 → +10ポイント

360度「クレド」スコア加算:
  等級5以上: クレドスコアが6.5以上 → +3ポイント
  等級3〜4: クレドスコアが6.0以上 → +3ポイント

最終評価スコア = MBOスコア + 360度成果加算 + 360度クレド加算
```

**総合評価（等級3以上）の分布目安:**

| 評価 | 割合目安 | 昇給率目安 | 内容 |
|------|----------|-----------|------|
| S | 5% | 5〜15% | ゼロ人でも良いくらい特筆すべき成果 |
| A | 15% | 3〜6% | 期待を超える成果 |
| B | 60% | 1〜2% | 期待通りの評価（MBOスコア100以上） |
| C | 15% | 0〜-5% | 期待を下回る評価 |
| D | 5% | -5〜-10% | 現状の役割等を見直すレベル |

**昇降給ロジック（等級2以下）:**

等級2以下は360度評価「成果」スコアのみで昇降給を決定する。

| 成果スコア | 昇降給 |
|-----------|--------|
| 3.0未満 | 降給対象（審議） |
| 3.0以上3.5未満 | -3% |
| 3.5以上4.5未満 | +3% |
| 4.5以上 | 部門長会議以上で+5%を検討 |

#### F-17 目標設定ガイダンス（新規）

> **v1.1 新規追加**

- 目標設定画面（S-03/S-04）の各入力フィールドにインラインヘルプを表示する
- 連動パターン選択時に該当パターンの説明・具体例をポップオーバーまたはサイドパネルで表示する
- 達成基準（1.2/1.0/0.8）の入力エリアに各水準の定義と記述例ガイダンスを表示する
- ガイダンスの表示/非表示は社員が切り替え可能（ローカルストレージで保持）

#### F-18 評価バイアス警告（新規）

> **v1.1 新規追加**

- 上長評価入力画面（S-07）の上部に評価バイアス五大症状のガイダンスバナーを表示する
- 表示内容:

| 症状名 | 内容 |
|--------|------|
| ハロー効果 | 全体的な印象が個々の評価項目に影響していませんか？ |
| 寛大化傾向 | 思い入れや同情から評価が甘くなっていませんか？ |
| 厳格化傾向 | 優秀な誰かを基準に評価が厳しくなっていませんか？ |
| 中心化傾向 | 差をつけたくないために評価が中間に集まっていませんか？ |
| 期末効果 | 評価直前の印象だけで判断していませんか？ |

- バナーは折りたたみ可能とし、表示状態をセッションで保持する

#### F-19 最終承認後差し戻し（難易度調整）（v1.3新規、v1.8改称）

> **v1.3 新規追加、v1.8 機能名改称**

目標の承認フロー（本人→上長→事業部長→経営）を経て `APPROVED`（経営承認済み）になった後、事業部内会議や経営会議等で全社の難易度を揃える判断が行われた際に、部長以上のロール（MANAGER）が承認済み目標を差し戻す機能。

通常の承認フロー中（`PENDING_MANAGER` / `PENDING_DIVISION` / `PENDING_EXECUTIVE`）の差し戻しは `REJECTED` として管理される。本機能は **`APPROVED` 後に限定**した追加ステップである。

**フロー:**

```
社員が目標設定 → 上長承認 → 事業部長承認 → 経営承認（APPROVED）
  ↓
事業部内会議・経営会議等での難易度調整
  ↓ 修正が必要な場合
部長が「最終承認後差し戻し」を実行 → MEETING_REJECTED
  （差し戻しコメント入力必須）
  ↓ 社員に通知
社員が目標を修正 → 再申請（PENDING_MANAGER）
  ↓ 4段階承認フローを再実施
APPROVED（確定）
```

**操作仕様:**

- 操作可能ロール: `position = DEPT_MANAGER`（部長・事業部長、等級7〜8相当）の社員、および `HR`・`ADMIN`。ユニット長（`position = UNIT_MANAGER`、等級5〜6）は本操作の権限を持たない
- 操作可能ステータス: `APPROVED` のみ（`PENDING_*` や `DRAFT` には使用しない）
- 差し戻し時は**コメント入力必須**。コメントは社員・直属上長に通知される
- `MEETING_REJECTED` 状態の社員は目標を修正し、再度承認申請できる
- 差し戻しの履歴（誰が・いつ・どのコメントで差し戻したか）は `approval_requests` に記録する

**`approval_requests` の `request_type` 追加値:**

| 値 | 内容 |
|----|------|
| `GOAL_APPROVAL` | 目標設定の承認申請 |
| `GOAL_REVISION` | 目標修正申請（中間振り返り時など） |
| `MEETING_REJECTION` | 最終承認後差し戻し（難易度調整）（v1.3追加、v1.8改称） |

### 4.3 特殊ケースの評価ルール（v1.5 更新）

> **v1.5 更新**: 休職・復職・中途・退職パターンの詳細な扱いを整理した。

| ケース | 目標設定 | 評価の扱い | 昇給・按分 | 特記事項 |
|-------|---------|-----------|-----------|---------|
| **休職に入る** | 通常通り実施 | 勤務6か月以上：期中クローズ<br>勤務6か月未満：評価対象外 | 勤務月数/12で按分して復職後反映 | 休職前に自己・上長評価を実施しクローズ可能 |
| **復職する** | 期中目標設定 | 勤務6か月以上：評価対象<br>勤務6か月未満：評価対象外 | 勤務月数/12で按分 | 復職タイミングで目標を立て、対象月数 (`target_months`) を記録 |
| **中途入社** | 期中目標設定 | 入社6か月後から対象 | 初回評価期は昇給算定の対象外。360度評価の結果は昇格・登用判断の参考資料としてのみ使用する（MBOスコアも昇給算定には使用しない） | 入社日を `organization_memberships.join_date` に記録し、6か月経過を判定 |
| **退職する** | - | 人事にてクローズ処理 | 対象外（原則） | 最終勤務日までの自己・上長評価を必要に応じ実施し、HRがプロセスを完了する |
| **期中昇格（等級2→3）** | 下期から新規MBO目標設定 | 下期（2月〜9月）を評価対象 | 下期分（昇格後）のみ昇給反映 | 昇格タイミングは中間振り返り（2月）固定。既存の等級2時の goal_set の `is_active` を FALSE に更新（論理削除）し、`is_mbo_target = TRUE` の新しい goal_set を作成して4段階承認フローを開始する。`target_months = 8`（2〜9月）を記録する |

**評価対象外（Exempt）の条件:**

- 評価対象期間（10月〜翌年9月）における実勤務期間が**6か月（180日）未満**の場合、目標設定は行うが、`goal_sets.is_evaluation_exempt = TRUE` とする。
- このフラグが立っている場合、評価スコアの算出（F-10）からは除外される。
- **対象月数 (`target_months`)**: 昇給按分等のため、全社員の `goal_sets` に整数値（1〜12）として記録する。

**期中目標設定および期中クローズの操作:**

- **期中目標設定**: 新入社員や復職者は、HRまたは上長の許可を得て、標準の目標設定フェーズ以外でも `F-05` に基づく入力・承認フローを開始できる。
- **期中クローズ**: 休職や退職を控える社員は、標準の評価フェーズ（8〜9月）以外でも、`F-08`（自己評価）および `F-09`（上長評価）を入力し、人事の承認を経てプロセスを完了（クローズ）できる。

**フェーズ外操作のAPI制御方針:**

通常、目標設定・評価入力のAPIは `period_phases` に登録されたフェーズ期間内のみ受け付ける。フェーズ外操作は以下のルールで例外的に許可する。

| 操作 | フェーズ外許可条件 |
|------|------------------|
| 期中目標設定（`POST /api/goals`） | `HR` または `ADMIN` ロールが `goal_sets.is_midterm_entry = TRUE` フラグを付与して作成する場合のみ許可 |
| 期中クローズ（自己・上長評価の提出） | `HR` または `ADMIN` ロールが対象の `goal_sets.is_midterm_closed = TRUE` を事前にセットした場合のみ許可 |

上記フラグのセットは `PATCH /api/admin/goal-sets/:goalSetId` エンドポイント（HR/ADMINのみ呼び出し可能）で行う。一般の `MEMBER` / `MANAGER` ロールはフェーズ外での目標設定・評価提出APIを呼び出すと `403 Forbidden` を返す。

**360度評価の回答者ルール:**

- 回答可能者: `employee_type IN ('REGULAR', 'CONTRACT')` かつ `grade >= 2` の社員
- 対象者（評価される側）の回答者構成:
  - 自身が所属するユニットの縦ラインすべて（必須）
  - 最低回答者数: 4名
  - 本人の希望で上記以外から最大2名追加可能
  - 社歴6か月以上の社員のみ評価対象者・評価者となれる
  - 最終的に部門長が回答者を確定（追加・削除の最終承認）

---

## 5. 画面一覧・画面仕様

### 5.1 画面一覧

| 画面ID | 画面名 | パス | アクセス可能ロール |
|--------|--------|------|--------------------|
| S-01 | ログイン画面 | `/login` | 全員 |
| S-02 | ダッシュボード | `/dashboard` | 全員 |
| S-03 | 目標設定画面 | `/goals/new` | MEMBER以上 |
| S-04 | 目標詳細・編集画面 | `/goals/[goalSetId]` | MEMBER以上 |
| S-05 | 目標修正申請画面 | `/goals/[goalSetId]/revision` | MEMBER以上 |
| S-06 | 自己評価入力画面 | `/goals/[goalSetId]/self-review` | MEMBER以上 |
| S-07 | 上長評価入力画面 | `/goals/[goalSetId]/manager-review` | MANAGER以上 |
| S-08 | 評価調整・確定画面 | `/admin/review-adjustment` | HR, ADMIN |
| S-09 | 目標一覧画面（自部署） | `/goals` | 全員 |
| S-10 | 目標一覧画面（全社） | `/goals/all` | HR, ADMIN |
| S-11 | 社員プロフィール・履歴画面 | `/employees/[employeeId]` | 全員 |
| S-12 | ユーザー管理画面 | `/admin/users` | HR, ADMIN |
| S-13 | 組織管理画面 | `/admin/organizations` | HR, ADMIN |
| S-14 | 評価期管理画面 | `/admin/periods` | HR, ADMIN |
| S-15 | 承認・申請管理画面 | `/approvals` | MANAGER以上 |
| S-16 | 評価サマリ画面 | `/reports/summary` | MANAGER以上 |
| S-17 | 通知一覧画面 | `/notifications` | 全員 |
| S-18 | 過去の評価閲覧画面 | `/evaluations/history` | 全員 |

### 5.1.1 左ナビゲーションメニュー構成

全画面共通の左サイドバーナビゲーション項目:

| セクション | 項目 | 遷移先 |
|-----------|------|--------|
| （メイン） | ダッシュボード | S-02 |
| （メイン） | 自分の目標 | S-04 |
| （メイン） | 目標一覧（自部署） | S-09 |
| （メイン） | 中間振り返り | S-04（中間振り返りタブ） |
| （メイン） | **過去の評価** | S-18 |
| 管理 | 承認・申請管理 | S-15 |
| 管理 | 評価調整・確定 | S-08（HR/ADMINのみ表示） |
| 管理 | イレギュラー社員対応 | （HR/ADMINのみ表示） |
| 管理 | SmartHR CSV連携 | （HR/ADMINのみ表示） |

> 過去の評価（期別の目標・評価結果の履歴）はダッシュボードには表示せず、左ナビゲーションの「過去の評価」からのみ参照できる。

### 5.1.2 UIカラー方針

| 用途 | カラーコード |
|------|-------------|
| プライマリ（基本色） | `#01AEBB` |
| 背景・テキスト | `#FFFFFF` / `#1A1A1A` |
| エラー・危険操作 | `#C0392B`（特別用途） |
| 成功・承認 | `#27AE60`（特別用途） |
| 警告・注意 | `#E67E22`（特別用途） |

> 全画面を通じて使用する基本色は `#01AEBB`（プライマリ）と `#FFFFFF`（白）とする。ステータス表示・アラート等の特別な意味を持つ要素にのみ他の色を使用してよい。

### 5.2 主要画面仕様

#### S-02 ダッシュボード

表示コンポーネント:

1. **現在のフェーズ表示バナー**（例: 「目標設定フェーズ: 2025/10/01 〜 2026/01/31」）
2. **自分の現期目標サマリカード**（3目標のタイトルとステータス）※左カラムに配置
3. **対応事項**（自分が対応すべきアクション一覧）※右カラムに配置
   - 「目標を設定してください」（目標未設定時）
   - 「中間振り返りを入力してください」（中間フェーズ時）
   - 「目標の修正依頼が届いています」（v1.4追加: 上長から修正依頼フラグが立った時）
   - 「目標修正申請が差し戻されました」（v1.4追加: 修正案が差し戻された時）
   - 「自己評価を入力してください」（評価フェーズ時）
   - 「〇〇さんの目標承認が待ちです」（MANAGER向け）
   - 「〇〇さんの目標修正申請が待ちです」（v1.4追加: MANAGER向け、修正申請の承認待ち時）

> **注意**: 過去の評価（前期評価サマリ等）はダッシュボードには表示しない。過去の評価は左カラムのナビゲーションメニュー「過去の評価」からのみ参照できる。

#### S-04 目標詳細・編集画面

> **v1.1 更新**: 目標連動パターンのインラインガイダンス表示を追加した。

表示項目:

- 評価期・社員名・部署・等級
- フェーズに応じた編集可否の制御
- 目標ごとのカード表示:
  - 目標タイプラベル（KPI連動①/KPI連動②/組織貢献）
  - タイトル・詳細・行動計画
  - **連動パターンバッジ**（例: 「分解」「先行指標」「役割設定」）とインラインガイダンスリンク（F-17と連携）
  - 達成基準（1.2 / 1.0 / 0.8 それぞれの定義）と水準ガイダンスポップオーバー（F-17と連携）
  - 中間振り返りコメント
  - 自己評価スコア・コメント
  - 上長評価スコア・コメント
- **目標のバージョン履歴タブ**（修正申請の前後を比較表示）
- ステータス履歴タイムライン
- **最終承認後差し戻しボタン**（v1.3追加、v1.8改称）: `APPROVED` 状態かつ修正申請中でないときのみ、`position = DEPT_MANAGER` 以上または HR/ADMIN に表示。クリックで差し戻しコメント入力モーダルを表示し、送信すると `MEETING_REJECTED` に遷移
- **編集ボタンの表示制御**（v1.3追加）: `DRAFT`・`REJECTED`・`MEETING_REJECTED` のときのみ社員に編集ボタンを表示。`APPROVED`・承認申請中（`PENDING_MANAGER` / `PENDING_DIVISION` / `PENDING_EXECUTIVE`）の場合は表示しない

#### S-05 目標修正申請画面

> **v1.4 更新**: 上長起点フローへの対応と差し戻し時の再申請UIを追加した。

表示項目:

- 修正対象の現在の目標内容（変更前）
- 修正後の目標内容入力フォーム（タイトル・詳細・達成基準・ウェイト）
- 修正理由コードの選択（必須）: `KPI_CHANGE` / `STANDARD_DEVIATION` / `ROLE_CHANGE` / `MIDTERM_ENTRY` / `EARLY_CLOSURE` / `GRADE_PROMOTION`（F-06参照）
- 修正理由の補足コメント入力（必須）
- **上長からの修正依頼コメント表示**（v1.4追加）: `midterm_reviews.revision_request_note` の内容を画面上部に表示。上長指示の内容を社員が確認しながら修正案を作成できる
- **差し戻しコメント表示**（v1.4追加）: 再申請時は直前の差し戻しコメント（`approval_requests.rejection_note`）を画面上部に表示。どこが不適切だったかを確認しながら再修正できる

#### S-07 上長評価入力画面

> **v1.1 更新**: 評価バイアス警告（F-18）の表示を追加した。

表示項目:

- 画面上部に**評価バイアス五大症状ガイダンスバナー**（F-18と連携、折りたたみ可能）
- 自己評価との差分ハイライト表示
- 各目標のスコア入力・コメント入力

#### S-09 目標一覧画面（自部署）

> **v1.8 更新**: ステータス列を承認フローステップインジケーター表示に変更。評価者が各メンバーの現在の承認段階を一目で把握できるよう改善。

フィルタ・検索:

- 評価期セレクタ（デフォルト: 現在の評価期）
- 部署ツリー（MANAGERは配下部署、MEMBERは自部署のみ）
- ステータスフィルタ（すべて / 下書き / 上長承認待ち / 事業部長承認待ち / 経営承認待ち / 承認済み / 差し戻し / 最終承認後差し戻し / 評価中 / 完了）
- キーワード検索（社員名・目標タイトル）
- **目標設定会議モード**（MANAGERおよびHR向け）: トグルONで等級3以上（`is_mbo_target = TRUE`）のみに絞り込み表示。部長陣が目標設定会議で確認する際に使用する。デフォルトOFF（全等級表示）

一覧表示列:

| 列名 | 内容 |
|------|------|
| 社員名 | アバター・氏名 |
| 等級・役職 | 当期時点のもの |
| 目標タイトル | 3目標のサマリ（ホバーで詳細） |
| 承認ステップ | 承認フローの現在段階をステップインジケーターで表示（下記仕様参照） |
| 自己評価 | 提出済み / 未提出 |
| 上長評価 | 提出済み / 未提出 |
| MBOスコア | 確定後に表示 |

**承認ステップインジケーター仕様（v1.8追加）:**

承認フローを持つ社員（等級3以上、`is_mbo_target = TRUE`）の「承認ステップ」列に、以下のステップインジケーターを表示する。現在のステータスに対応するステップをハイライトする。

```text
本人入力 → 上長承認 → 事業部長承認 → 経営承認 → 確定
```

| `goal_sets.status` | インジケーター表示 | バッジ |
| -------------------- | ----------------- | ------ |
| `DRAFT` | 本人入力（●）→ 上長承認 → 事業部長承認 → 経営承認 → 確定 | グレー「下書き」 |
| `PENDING_MANAGER` | 本人入力（済）→ 上長承認（●）→ 事業部長承認 → 経営承認 → 確定 | 黄「上長承認待ち」 |
| `PENDING_DIVISION` | 本人入力（済）→ 上長承認（済）→ 事業部長承認（●）→ 経営承認 → 確定 | 黄「事業部長承認待ち」 |
| `PENDING_EXECUTIVE` | 本人入力（済）→ 上長承認（済）→ 事業部長承認（済）→ 経営承認（●）→ 確定 | 黄「経営承認待ち」 |
| `APPROVED` | 本人入力（済）→ 上長承認（済）→ 事業部長承認（済）→ 経営承認（済）→ 確定（●） | 緑「承認済み」 |
| `REJECTED` | 差し戻しが発生したステップをエラー表示 | 赤「差し戻し」 |
| `MEETING_REJECTED` | 確定（済）→ 最終承認後差し戻し（●） | 橙「最終承認後差し戻し」 |

- 等級1〜2（`is_mbo_target = FALSE`）はステップインジケーターを表示せず、「保存済み」バッジのみ表示する。
- `PENDING_DIVISION` または `PENDING_EXECUTIVE` の社員については、自分が承認者の場合、インジケーターの横に「承認」ボタンをインラインで表示する。

#### S-15 承認・申請管理画面

- タブ: 「承認待ち」「承認済み」「差し戻し済み」「最終承認後差し戻し済み」「修正依頼済み」（v1.4追加）
- 申請種別: 目標設定承認 / 目標修正承認 / 修正依頼（v1.4追加） / 最終承認後差し戻し（v1.3追加、v1.8改称）
- 一覧に申請者・申請日・申請内容サマリを表示
- 承認・差し戻しボタン（差し戻し時はコメント入力必須）
- **最終承認後差し戻し済み**タブ（v1.3追加、v1.8改称）: 誰が・いつ・どのコメントで差し戻したかを一覧表示。社員が修正後に再申請すると「承認待ち」タブに移動する
- **修正依頼済み**タブ（v1.4追加）: 上長が中間振り返りで修正依頼フラグを立てた一覧を表示。社員が修正申請を起票すると「承認待ち」タブに移動する

---

## 6. データモデル

### 6.1 エンティティ一覧

> **v1.1 更新**: `360_degree_scores` テーブルを当期スコープに昇格。`employees` テーブルに `employee_type` を追加。

| エンティティ | テーブル名 | 説明 |
|--------------|------------|------|
| 社員 | `employees` | 社員マスタ |
| 組織スナップショット | `organization_snapshots` | 期ごとの組織状態を記録 |
| 組織メンバーシップ | `organization_memberships` | 社員と組織の紐付け（有効期間付き・雇用形態含む） |
| 評価期 | `evaluation_periods` | 評価サイクルの定義 |
| 評価期フェーズ | `period_phases` | 各フェーズの期間定義 |
| 目標セット | `goal_sets` | 1社員×1評価期の目標まとめ |
| 目標 | `goals` | 個別目標（3件/セット） |
| 中間振り返り | `midterm_reviews` | 中間振り返りコメント・進捗 |
| 自己評価 | `self_reviews` | 自己評価スコア・コメント |
| 上長評価 | `manager_reviews` | 上長評価スコア・コメント |
| 最終評価 | `final_evaluations` | 最終評価結果（360度スコア合算後） |
| 360度評価スコア | `degree360_scores` | 360度評価の成果・クレドスコア（当期スコープ） |
| 承認申請 | `approval_requests` | 承認フローの申請レコード |
| 通知 | `notifications` | 通知レコード |
| 監査ログ | `audit_logs` | 重要操作のログ |

### 6.2 主要テーブル定義

#### `employees`

```sql
CREATE TABLE employees (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code  VARCHAR(20)  NOT NULL UNIQUE,  -- 社員番号
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- employee_type は organization_memberships に格納し、異動・契約変更時に更新する
```

#### `organization_snapshots`

```sql
CREATE TABLE organization_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_period_id  UUID        NOT NULL REFERENCES evaluation_periods(id),
  name                  VARCHAR(100) NOT NULL,  -- 部署名（当期時点）
  parent_id             UUID REFERENCES organization_snapshots(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- 組織の状態を評価期単位で保存することで、
-- 組織変更後も当時の所属を正確に参照できる
```

#### `organization_memberships`

> **v1.5 更新**: 1次評価者・2次評価者のカラムを明確化。

```sql
CREATE TABLE organization_memberships (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id              UUID        NOT NULL REFERENCES employees(id),
  organization_snapshot_id UUID        NOT NULL REFERENCES organization_snapshots(id),
  grade                    SMALLINT    NOT NULL CHECK (grade BETWEEN 1 AND 8),
  grade_type               VARCHAR(30) NOT NULL,
    -- COMMON / HR_PARTNER / SPECIALIST / ENGINEER
  position                 VARCHAR(30) NOT NULL,
    -- MEMBER / TEAM_LEADER / UNIT_MANAGER / DEPT_MANAGER
  employee_type            VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    -- REGULAR（正社員）/ CONTRACT（契約社員）/ ASSISTANT（アシスタント）
  roles                    TEXT[]      NOT NULL DEFAULT '{MEMBER}',
  manager_id               UUID        REFERENCES employees(id),  -- 直属上長（1次評価者）
  division_manager_id      UUID        REFERENCES employees(id),  -- 事業部長（2次評価者）
  join_date                DATE,        -- 入社日
  valid_from               DATE        NOT NULL,
  valid_to                 DATE,        -- NULLは現在有効
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `evaluation_periods`

```sql
CREATE TABLE evaluation_periods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,    -- 例: "2025年度"
  start_date  DATE        NOT NULL,    -- 期開始日（10月1日）
  end_date    DATE        NOT NULL,    -- 期終了日（翌年9月30日）
  status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
              -- DRAFT / ACTIVE / CLOSED
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `period_phases`

```sql
CREATE TABLE period_phases (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_period_id  UUID        NOT NULL REFERENCES evaluation_periods(id),
  phase_type            VARCHAR(30) NOT NULL,
    -- GOAL_SETTING / MIDTERM_REVIEW / DEGREE360_EVALUATION /
    -- SELF_REVIEW / MANAGER_REVIEW / ADJUSTMENT
    -- ※ v1.1でDEGREE360_EVALUATIONを追加（7月フェーズ）
  start_date            DATE        NOT NULL,
  end_date              DATE        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `goal_sets`

> **v1.5 更新**: ステータスの多段化、対象月数、評価対象外フラグ、期中クローズフラグを追加。

```sql
CREATE TABLE goal_sets (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID        NOT NULL REFERENCES employees(id),
  evaluation_period_id  UUID        NOT NULL REFERENCES evaluation_periods(id),
  membership_id         UUID        NOT NULL REFERENCES organization_memberships(id),
                        -- 目標設定時点の所属スナップショット
  status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    -- 等級3以上: DRAFT / PENDING_MANAGER / PENDING_DIVISION / PENDING_EXECUTIVE / APPROVED / REJECTED / MEETING_REJECTED
    -- 等級1〜2:  DRAFT / SAVED（承認フローなし）
    -- MEETING_REJECTED: APPROVED後に難易度調整目的で部長が差し戻した状態（最終承認後差し戻し）。社員は修正後に再申請可能
  is_mbo_target         BOOLEAN     NOT NULL DEFAULT FALSE,
    -- TRUE: 承認フロー・評価の対象（employee_type=REGULAR かつ grade>=3）
    -- FALSE: 目標入力は可能だが承認フロー・評価の対象外（等級1〜2・契約社員・アシスタント）
  is_evaluation_exempt  BOOLEAN     NOT NULL DEFAULT FALSE,
    -- 実勤務6か月未満の場合TRUE
  target_months         SMALLINT    NOT NULL DEFAULT 12,
    -- 評価対象月数（1〜12）。按分計算に使用
  is_midterm_entry      BOOLEAN     NOT NULL DEFAULT FALSE,
    -- 期中目標設定（復職・中途入社）時にHR/ADMINがTRUEにセットする。フェーズ外のF-05実行を許可するフラグ
  is_midterm_closed     BOOLEAN     NOT NULL DEFAULT FALSE,
    -- 休職・退職等により期中に評価プロセスを完了させた場合TRUE。フェーズ外のF-08/F-09実行を許可するフラグ
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
    -- 期中昇格（GRADE_PROMOTION）時に旧goal_setをFALSEにする論理削除フラグ
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- UNIQUE制約は有効なレコードのみを対象とする条件付きインデックスで担保する:
  -- CREATE UNIQUE INDEX uq_goal_sets_active
  --   ON goal_sets(employee_id, evaluation_period_id)
  --   WHERE is_active = TRUE;
);
```

#### `goals`

> **v1.1 更新**: `kpi_pattern` カラム（連動パターン）を追加した。

```sql
CREATE TABLE goals (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_set_id    UUID         NOT NULL REFERENCES goal_sets(id),
  goal_type      VARCHAR(20)  NOT NULL,
    -- KPI_1 / KPI_2 / ORG_CONTRIBUTION
  version        INTEGER      NOT NULL DEFAULT 1,
  is_current     BOOLEAN      NOT NULL DEFAULT TRUE,
  title          VARCHAR(100) NOT NULL,
  description    TEXT         NOT NULL,
  kpi_pattern    VARCHAR(30),
    -- KPI_DECOMPOSITION / LEADING_INDICATOR / ROLE_IN_GOAL  （KPI目標の場合）
    -- UPPER_GOAL / TEAM_GROWTH  （ORG_CONTRIBUTIONの場合）
    -- goal_typeがKPI_1/KPI_2の場合はNOT NULL制約を別途チェック制約で担保
  criteria_1_2   TEXT         NOT NULL,  -- 挑戦目標（1.2）の達成基準
  criteria_1_0   TEXT         NOT NULL,  -- 達成目標（1.0）の達成基準
  criteria_0_8   TEXT         NOT NULL,  -- 最低目標（0.8）の達成基準
  weight         NUMERIC(5,2) NOT NULL,
    -- デフォルト: KPI_1=50.00, KPI_2=30.00, ORG_CONTRIBUTION=20.00
    -- 3目標の合計が100になることをアプリケーション層（APIバリデーション）およびDBトリガーで二重に担保する
    -- （DBトリガー例: goal_setの全goalsのweight合計が100でない場合はINSERT/UPDATEをRAISE EXCEPTION）
  visibility     VARCHAR(20)  NOT NULL DEFAULT 'DEPARTMENT',
    -- SELF_ONLY / DEPARTMENT / COMPANY
  revision_reason VARCHAR(30),
    -- KPI_CHANGE / STANDARD_DEVIATION / ROLE_CHANGE
    -- / MIDTERM_ENTRY / EARLY_CLOSURE / GRADE_PROMOTION（v1.5/v1.7追加）
  revision_note  TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- 修正申請時は同じgoal_set_id・goal_typeで新レコードを作成し
-- is_current=FALSEに旧レコードを更新することでバージョン管理する
```

#### `midterm_reviews`

```sql
CREATE TABLE midterm_reviews (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id             UUID        NOT NULL REFERENCES goals(id),
  progress            VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    -- NOT_STARTED / IN_PROGRESS / ON_TRACK / AT_RISK
  comment             TEXT,
  manager_comment     TEXT,
  revision_requested  BOOLEAN     NOT NULL DEFAULT FALSE,
    -- v1.4追加: 上長が「修正依頼」フラグを立てるとTRUE。社員への通知トリガーとなる
  revision_request_note TEXT,
    -- v1.4追加: 修正依頼時に上長が記入するコメント（revision_requested=TRUEのとき必須）
  employee_submitted_at TIMESTAMPTZ,
    -- 社員がコメントを保存・提出した日時。NULLは未提出
  manager_submitted_at  TIMESTAMPTZ,
    -- 上長がコメントを入力・提出した日時。NULLは未入力
    -- 両カラムがNOT NULLになった時点で中間振り返りが「提出完了」とみなされる
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id)
);
```

#### `self_reviews` / `manager_reviews`

```sql
CREATE TABLE self_reviews (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id      UUID         NOT NULL REFERENCES goals(id),
  score        NUMERIC(3,1) NOT NULL CHECK (score BETWEEN 0.0 AND 2.0),
  comment      TEXT,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id)
);

CREATE TABLE manager_reviews (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id      UUID         NOT NULL REFERENCES goals(id),
  manager_id   UUID         NOT NULL REFERENCES employees(id),
  score        NUMERIC(3,1) NOT NULL CHECK (score BETWEEN 0.0 AND 2.0),
  comment      TEXT,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id)
);
```

#### `final_evaluations`

> **v1.1 更新**: 360度スコア加算カラムを追加した。

```sql
CREATE TABLE final_evaluations (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_set_id               UUID    NOT NULL REFERENCES goal_sets(id) UNIQUE,
  mbo_score                 NUMERIC(5,2),    -- MBOスコア（重み付き合計）
  degree360_achievement_bonus SMALLINT DEFAULT 0,
    -- 360度「成果」スコア加算: 0 or 10
  degree360_credo_bonus     SMALLINT DEFAULT 0,
    -- 360度「クレド」スコア加算: 0 or 3
  total_score               NUMERIC(5,2),    -- mbo_score + 成果加算 + クレド加算
  final_grade               CHAR(1) CHECK (final_grade IN ('S','A','B','C','D')),
  adjustment_note           TEXT,
  confirmed_by              UUID    REFERENCES employees(id),
  confirmed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `degree360_scores`（新規追加）

> **v1.1 新規追加**: 将来連携の予定だったが、評価合算ロジック統合に伴い当期スコープに昇格した。

**360度評価スコアの入力方式について:**

360度評価は社内で内製化された別システムで実施する。本システムとの連携方式は以下の2段階を想定する。

| フェーズ | 方式 | `source` 値 |
|---------|------|-------------|
| ベータ版（当面） | HRが360度評価システムから結果を確認し、本システムに手動入力またはCSVインポート | `HR_INPUT` |
| 将来（システム連携後） | 社内360度評価システムのAPIと連携し、スコアを自動取り込み | `SYSTEM_IMPORT` |

連携時に必要な情報は `employee_id`・`evaluation_period_id`・`achievement_score`・`credo_score`・`is_top20_achievement` の5項目。連携API口は将来拡張として設計に組み込んでおく（`POST /api/admin/degree360/import`）。

```sql
CREATE TABLE degree360_scores (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID         NOT NULL REFERENCES employees(id),
  evaluation_period_id  UUID         NOT NULL REFERENCES evaluation_periods(id),
  achievement_score     NUMERIC(3,1),
    -- 360度「成果」スコア。社内360度評価システムで算出された値をHRが入力または連携で取り込む
  credo_score           NUMERIC(3,1),
    -- 360度「クレド」スコア。同上
  is_top20_achievement  BOOLEAN      NOT NULL DEFAULT FALSE,
    -- 全体回答者の上位20%以内かどうか（achievement_scoreの加算条件。HRまたは連携で設定）
  source                VARCHAR(30)  NOT NULL DEFAULT 'HR_INPUT',
    -- HR_INPUT: HR手動入力またはCSVインポート（ベータ版）
    -- SYSTEM_IMPORT: 社内360度評価システムとのAPI連携による自動取り込み（将来対応）
  imported_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, evaluation_period_id)
);
```

#### `approval_requests`

> **v1.5 更新**: 承認プロセスの多段化に伴いステータスを細分化。

```sql
-- 承認ステップごとに1レコードを作成する。
-- 例: GOAL_APPROVAL（4段階）では上長・事業部長・経営の各ステップで計3レコードが順番に生成される。
-- requester_id: 申請を起こした社員（全ステップ共通）
-- approver_id:  当該ステップの承認者（ステップごとに異なる）
-- MEETING_REJECTION: requester_id=差し戻しを実行した部長、approver_id=差し戻し実行者とする
CREATE TABLE approval_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type   VARCHAR(30) NOT NULL,
    -- GOAL_APPROVAL / GOAL_REVISION / MEETING_REJECTION
  goal_set_id    UUID        NOT NULL REFERENCES goal_sets(id),
  requester_id   UUID        NOT NULL REFERENCES employees(id),
  approver_id    UUID        NOT NULL REFERENCES employees(id),
  status         VARCHAR(30) NOT NULL,
    -- PENDING / APPROVED / REJECTED
  rejection_note TEXT,
    -- 差し戻し・修正依頼時のコメント。REJECTED / MEETING_REJECTION 時は必須
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);
```

### 6.3 APIエンドポイント設計（REST）

```
# 目標
GET    /api/goals                               # 目標一覧（クエリパラメータでフィルタ）
POST   /api/goals                               # 目標セット作成
GET    /api/goals/:goalSetId                    # 目標詳細
PATCH  /api/goals/:goalSetId                    # 目標編集（DRAFT / REJECTED / MEETING_REJECTED のみ受付。それ以外は 409）
POST   /api/goals/:goalSetId/submit             # 承認申請提出
POST   /api/goals/:goalSetId/revision           # 目標修正申請（APPROVED 後の制度的修正。条件あり）
POST   /api/goals/:goalSetId/meeting-reject     # 最終承認後差し戻し（DEPT_MANAGER以上/HR/ADMIN・APPROVED時のみ）

# 承認
GET    /api/approvals                           # 承認待ち一覧
POST   /api/approvals/:requestId/approve        # 承認
POST   /api/approvals/:requestId/reject         # 差し戻し

# 評価
POST   /api/goals/:goalSetId/midterm-review     # 中間振り返り提出
POST   /api/goals/:goalSetId/self-review        # 自己評価提出
POST   /api/goals/:goalSetId/manager-review     # 上長評価提出

# 最終評価（v1.1: 360度スコア取り込みエンドポイントを追加）
GET    /api/admin/evaluations                   # 評価調整一覧
PATCH  /api/admin/evaluations/:goalSetId        # 最終評価調整・確定
POST   /api/admin/degree360-scores              # 360度スコアのHR手動入力
POST   /api/admin/degree360-scores/import       # 360度スコアの一括インポート（CSV）
GET    /api/admin/evaluations/:goalSetId/score-preview  # 合算スコアのプレビュー

# 履歴・レポート
GET    /api/employees/:employeeId/history       # 社員の期別履歴
GET    /api/reports/summary                     # 評価サマリ（集計）

# 管理
GET    /api/admin/periods                       # 評価期一覧
POST   /api/admin/periods                       # 評価期作成
PATCH  /api/admin/periods/:periodId/phases      # フェーズ更新
GET    /api/admin/users                         # ユーザー一覧
POST   /api/admin/users                         # ユーザー作成
PATCH  /api/admin/users/:userId                 # ユーザー更新
POST   /api/admin/smarthr/import                # SmartHR CSVによる人事属性一括更新（v1.5追加）
GET    /api/admin/organizations                 # 組織一覧
POST   /api/admin/organizations                 # 組織スナップショット作成
PATCH  /api/admin/goal-sets/:goalSetId          # 期中目標設定・期中クローズフラグのセット（HR/ADMINのみ）
                                                # is_midterm_entry=TRUE: 期中目標設定を許可
                                                # is_midterm_closed=TRUE: 期中クローズ（フェーズ外評価入力）を許可
```

---

## 7. 組織変更対応の設計方針

### 7.1 基本方針

**「評価期時点の組織状態をスナップショットとして記録する」方式**を採用する。

組織マスタをリアルタイムに更新するだけの設計では、過去の評価記録と現在の組織が乖離し、「あのとき誰の配下だったか」「当時の部署名は何だったか」が追跡不能になる。これを防ぐため、スナップショット方式を採用する。

### 7.2 スナップショット方式の詳細

```
評価期A（2024年度）                評価期B（2025年度）
organization_snapshots             organization_snapshots
  ├ 人事部（A期）                    ├ HRユニット（B期）← 改名
  │   └ 採用チーム（A期）             │   └ 採用・オンボチーム（B期）← 再編
  └ ...                             └ ...

organization_memberships
  社員X ─── 採用チーム（A期）       valid_from:2024-10-01, valid_to:2025-09-30
  社員X ─── 採用・オンボチーム（B期） valid_from:2025-10-01, valid_to:NULL
```

- 評価期の開始前（または期中の組織変更時）に管理者が組織スナップショットを作成する
- 社員の所属変更は新しい `organization_memberships` レコードを追加し、旧レコードの `valid_to` を更新する
- `goal_sets` は目標設定時点の `membership_id` を保持するため、どの期の組織状態でも正確に参照できる

### 7.3 期中の人事異動の扱い

- 期中に部署異動が発生した場合、新しい `organization_memberships` レコードを作成する
- 目標セットの `membership_id` は目標設定時点のものを保持し続け、変更しない
- 上長変更が発生した場合、承認フローの上長は `approval_requests` に記録された時点の `approver_id` で管理する

### 7.4 等級変更の扱い

- 等級変更は新しい `organization_memberships` レコードの作成で管理する（`valid_from` を等級変更日に設定）
- MBO対象外（等級1〜2）→ 対象（等級3以上）になった場合、その期から `goal_sets.is_mbo_target = TRUE` とする

**等級変更の適用タイミング（v1.7 更新）:**

| 変更タイミング | 適用ルール |
|--------------|-----------|
| 中間振り返り（2月）での等級2→3昇格 | **当期下期（2月〜9月）から適用が原則**。既存の等級2時の goal_set の `is_active` を FALSE に更新（論理削除）し、`is_mbo_target = TRUE` の新しい goal_set を作成する。修正理由コード `GRADE_PROMOTION` を使用（→ F-06） |
| 上記以外のタイミングでの等級変更 | 原則として次期から適用。HR判断で当期適用も可能 |

### 7.5 雇用形態変更の扱い

> **v1.1 追加**: `employee_type` 追加に伴い、変更時の扱いを定義した。

- 契約社員→正社員への変更等は `employee_type` 変更日を `valid_from` として新しい `organization_memberships` レコードを作成する
- 雇用形態変更によりMBO対象になる場合（CONTRACT → REGULAR かつ grade >= 3）、その期から `goal_sets.is_mbo_target = TRUE` とする

---

## 8. 非機能要件

### 8.1 パフォーマンス

| 要件 | 目標値 |
|------|--------|
| 画面レスポンスタイム（通常操作） | 95パーセンタイルで2秒以内 |
| 目標一覧ページのロード | 3秒以内（最大500件表示想定） |
| 同時接続ユーザー数 | 最大100ユーザー同時接続に対応 |
| データ保存期間 | 10年間（過去目標・評価データの長期保存） |

### 8.2 セキュリティ

- **認証**: Supabase Auth によるID・パスワード認証を必須とする
- **認可**: ロールベースアクセス制御（RBAC）を徹底し、APIレベルで権限チェックを実施する
- **通信**: 全通信をHTTPS（TLS 1.2以上）で暗号化する
- **入力検証**: すべてのAPI入力に対してバリデーションを行い、SQLインジェクション・XSSを防ぐ
- **監査ログ**: 目標の作成・変更・承認・評価確定など重要操作のログを**10年間**保持する（目標・評価データと同等の保存期間。人事制度上の証跡として評価期をまたいだ参照が必要なため）
- **セッション**: セッションタイムアウトは30分（非アクティブ時）とする

### 8.3 可用性・信頼性

- 稼働率目標: 99.5%以上（計画メンテナンスを除く）
- バックアップ: Supabaseの自動バックアップ機能を活用（日次、7世代保持）
- 評価フェーズのピーク時（10月・2月・7月・8〜9月）に負荷が集中するため、事前に負荷確認を実施すること

### 8.4 保守性・拡張性

- APIはRESTで設計し、将来的なモバイルアプリ対応を考慮する
- 360度評価スコアの連携API口（`POST /api/admin/degree360/import`）を設計に組み込む。連携先は社内内製の360度評価システム。ベータ版はHR手動入力・CSVインポートで運用し、将来的にAPI連携による自動取り込みに移行する
- 環境: 開発 / ステージング / 本番の3環境を分離する

### 8.5 アクセシビリティ

- WCAG 2.1 AA準拠を目標とする
- 日本語UIのみ対応（多言語対応は将来検討）

---

## 9. 将来のAWS移行方針

ベータ版（Vercel + Supabase）から本番運用（AWS）への移行は以下の方針で行う。

| レイヤー | ベータ版 | 本番（AWS） | 移行の容易さ |
|----------|----------|-------------|-------------|
| フロントエンド | Vercel | AWS Amplify Hosting | Next.jsのままデプロイ先変更のみ |
| データベース | Supabase PostgreSQL | Amazon RDS for PostgreSQL | PostgreSQL → PostgreSQL のため移行容易 |
| コネクションプール | Supabase PgBouncer内蔵 | Amazon RDS Proxy | 設定変更のみ |
| 認証 | Supabase Auth（ID・パスワード認証） | Amazon Cognito | メール/社員IDベースの認証へ切り替え |
| ストレージ | Supabase Storage | Amazon S3 | SDK切り替えのみ |
| メール通知 | AWS SES | SendGrid | 送信API切り替えのみ |

### AWS本番構成イメージ

```
ユーザー
  ↓
CloudFront + WAF
  ↓
Amplify Hosting（Next.js）
  ↓
RDS Proxy（コネクションプール管理）
  ↓
RDS PostgreSQL（プライベートサブネット内）
```

---

## 10. 付録

### 付録A: 評価ステータス遷移図

#### 目標セット（`goal_sets.status`）

**等級3以上（`is_mbo_target = TRUE`）:**

```
DRAFT
  │ 社員が承認申請
  ↓
PENDING_MANAGER（直属上長承認待ち）
  │ 上長が承認             │ 上長が差し戻し
  ↓                       ↓
PENDING_DIVISION（事業部長承認待ち）  REJECTED
  │ 事業部長が承認          │ 差し戻し後修正
  ↓                       ↓
PENDING_EXECUTIVE（経営承認待ち）    REJECTED
  │ 経営が承認             │ 経営が差し戻し
  ↓                       ↓
APPROVED（確定）
  │ 難易度調整が必要な場合（最終承認後差し戻し）
  ↓
MEETING_REJECTED（最終承認後差し戻し）
  │ 社員が修正・再申請
  ↓
PENDING_MANAGER（再承認フロー開始）
```

> **注記**: 各承認段階（MANAGER / DIVISION / EXECUTIVE）において、承認者は内容を確認し、不備があれば `REJECTED` として差し戻すことができる。`MEETING_REJECTED` は `APPROVED` 後にのみ発生する別フローであり、通常の差し戻し（`REJECTED`）とは区別される。

**等級1〜2（`is_mbo_target = FALSE`）:** ← v1.2追加

```
DRAFT
  │ 社員が保存（承認フローなし）
  ↓
SAVED
```

#### 評価期フェーズ遷移

```
GOAL_SETTING（10〜1月）
  → MIDTERM_REVIEW（2月）
  → DEGREE360_EVALUATION（7月） ← v1.1追加
  → SELF_REVIEW（8〜9月上旬）
  → MANAGER_REVIEW（8〜9月中旬）
  → ADJUSTMENT（10月）
  → CLOSED
```

### 付録B: 等級定義概要

| 等級 | 共通 | HRパートナー | スペシャリスト | エンジニア | 役職 |
|------|------|-------------|--------------|-----------|------|
| 8 | パートナー | パートナー | パートナー | - | 部長・事業部長 |
| 7 | ディレクター | ディレクター | ディレクター | フェロー/CTO/VPoE | 部長・事業部長 |
| 6 | シニアマネジャー | シニアマネジャー | シニアマネジャー | シニアエンジニアリングマネジャー/プリンシパルエンジニア | ユニット長 |
| 5 | マネジャー | マネジャー | マネジャー | エンジニアリングマネジャー/リードエンジニア | ユニット長 |
| 4 | シニアコンサルタント/チームリーダー | シニアHRパートナー | アシスタントマネジャー | シニアエンジニア | チームリーダー |
| 3 | コンサルタント | HRパートナー | シニアスタッフ | ミドルエンジニア | メンバー |
| 2 | アナリスト | アソシエイト | スタッフ | エンジニア | メンバー |
| 1 | - | スタッフ | スタッフ | アソシエイトエンジニア | メンバー |

> 等級3以上の正社員がMBO評価対象。等級1〜2の正社員はMBO評価対象外（360度評価のみ）。

### 付録C: 用語集

> **v1.1 更新**: 「五大症状」「クレドスコア」「360度成果スコア」「連動パターン」を追加した。

| 用語 | 説明 |
|------|------|
| MBO | Management By Objectives（目標管理制度） |
| KPI連動目標 | 会社・部署のKPIに紐づいた個人目標（2件設定） |
| 組織貢献目標 | 組織内の協力・育成・改善等に関する目標（1件設定） |
| 評価期 | MBOサイクルの1年間の単位（10月〜翌年9月） |
| 達成基準 | 1.2（挑戦目標）/ 1.0（達成目標）/ 0.8（最低目標）の3段階 |
| MBOスコア | 3目標の加重平均スコア。達成度スコア×ウェイトの合計で算出 |
| 組織スナップショット | 特定評価期時点での組織構造の記録 |
| 目標バージョン | 修正申請ごとに記録される目標内容の版 |
| employee_type | 雇用形態の区分（REGULAR/CONTRACT/ASSISTANT）。ロールとは独立した別軸 |
| 連動パターン | KPI目標・組織貢献目標がどのように上位目標と連動しているかを示す区分。KPI目標は「分解」「先行指標」「役割設定」の3種、組織貢献目標は「上位目標」「チーム力向上」の2種 |
| 360度成果スコア | 360度評価において「成果」観点で評価された数値スコア。4.5以上かつ全体上位20%以内の場合、MBOスコアに10ポイント加算される |
| クレドスコア | 360度評価において「クレド（行動規範）」観点で評価された数値スコア。等級5以上で6.5以上、等級3〜4で6.0以上の場合、MBOスコアに3ポイント加算される |
| 五大症状 | 評価バイアスの代表的な5類型。①ハロー効果（全体印象の影響）、②寛大化傾向（思い入れによる甘め評価）、③厳格化傾向（優秀者を基準とした厳め評価）、④中心化傾向（差をつけない中間評価）、⑤期末効果（直前印象のみによる評価） |
| 昇格・登用 | 360度評価の能力スコアが「4：そう思う」以上を参考値として部門長が意思決定し、経営で最終承認 |
| 降格・降職 | 360度評価の成果スコアが「3：どちらともいえない」未満の場合に審議対象となり、経営で最終承認 |
