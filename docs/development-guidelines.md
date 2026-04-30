# 開発ガイドライン

**プロジェクト名**: 社内MBO管理システム  
**バージョン**: 1.1  
**作成日**: 2026-04-30  
**対象読者**: 開発担当者  
**参照**: `docs/architecture.md` v1.0 / `docs/repository-structure.md` v1.1

---

## 目次

1. [コーディング規約](#1-コーディング規約)
   - [1.1 TypeScript](#11-typescript)
   - [1.2 React / Next.js](#12-react--nextjs)
   - [1.3 Route Handler（API）](#13-route-handlerapi)
   - [1.4 Prisma の利用規則](#14-prisma-の利用規則)
   - [1.5 エラーハンドリング](#15-エラーハンドリング)
   - [1.6 コメントの記述方針](#16-コメントの記述方針)
   - [1.7 セキュリティ](#17-セキュリティ)
   - [1.8 インポート規則](#18-インポート規則)
2. [命名規則](#2-命名規則)
3. [スタイリング規約](#3-スタイリング規約)
4. [テスト規約](#4-テスト規約)
5. [Git規約](#5-git規約)

---

## 1. コーディング規約

### 1.1 TypeScript

- **strict モードを常に有効にする**（`tsconfig.json` に `"strict": true`）
- `any` 型の使用を原則禁止とする。どうしても必要な場合は `// eslint-disable-next-line @typescript-eslint/no-explicit-any` と理由コメントを付与する
- `unknown` を使用し、型ガードで絞り込む
- 型アサーション（`as`）はコンパイラが型を推論できない境界部分のみで使用する
- `null` / `undefined` の非 null アサーション（`!`）は禁止。Optional chaining（`?.`）と nullish coalescing（`??`）を使用する
- `enum` は使用せず、`const` オブジェクト + `typeof` による union 型を使用する
- **型定義は `type` で統一する**（`interface` は使用しない）。サードパーティ型を拡張する場合のみ `interface extends` を例外的に許可する

```typescript
// 推奨: const + typeof
const GoalSetStatus = {
  DRAFT: 'DRAFT',
  PENDING_MANAGER: 'PENDING_MANAGER',
  APPROVED: 'APPROVED',
} as const;
type GoalSetStatus = typeof GoalSetStatus[keyof typeof GoalSetStatus];

// 非推奨: enum
enum GoalSetStatus { DRAFT, PENDING_MANAGER, APPROVED }
```

### 1.2 React / Next.js

#### コンポーネントの種類と使い分け

| 種類 | 条件 | デフォルト |
| -- | -- | ------ |
| React Server Component (RSC) | データフェッチのみ・インタラクション不要 | はい |
| Client Component | `useState` / `useEffect` / イベントハンドラが必要 | 明示的に `'use client'` を付与 |

- `'use client'` はコンポーネントツリーの**葉に近い位置**に限定し、境界を広げすぎない
- RSC では直接 Prisma を呼び出してよい。クライアントサイドの再フェッチが必要な場合は SWR を使用する

#### 関数コンポーネントの記述スタイル

```typescript
// 推奨: function 宣言（RSC・Client Component 共通）
export default function GoalCard({ goal }: GoalCardProps) {
  return <div>{goal.title}</div>;
}

// 非推奨: アロー関数コンポーネント（デフォルトエクスポートには使わない）
const GoalCard = ({ goal }: GoalCardProps) => <div />;
export default GoalCard;
```

- Props 型は `interface` ではなく `type` を使用し、ファイル内に定義する（`types/` には置かない）
- コンポーネントの型名は `コンポーネント名 + Props`（例: `GoalCardProps`）

#### データフェッチ

- RSC では `await prisma.xxx.findMany(...)` を直接記述する
- Client Component のデータフェッチには SWR を使用する。`fetch` を直接呼ぶ `useEffect` は書かない
- SWR のキーは `/api/` で始まる文字列とする（例: `useSWR('/api/goals')`）

#### Server Actions の採用方針

**本プロジェクトでは Server Actions を採用しない。** データ変更操作はすべて Route Handler（REST API）経由で行う。

理由:

- 認証・認可・フェーズ制御チェックを API 境界に集約するため（Server Action では暗黙的に呼ばれ、チェックが散在しやすい）
- REST API として設計することで、将来のモバイルアプリ対応時に同一エンドポイントを再利用できるため

### 1.3 Route Handler（API）

各 Route Handler は以下の順序で処理を行う:

1. Supabase Auth によるセッション検証（未認証 → `401`）
2. `lib/permissions.ts` によるロール・所有者チェック（不正 → `403`）
3. フェーズ制御チェック（フェーズ外 → `403`）
4. `lib/validations/` の Zod スキーマによるリクエストボディバリデーション（不正 → `400`）
5. ビジネスロジック実行
6. レスポンス返却

```typescript
export async function POST(req: Request, { params }: { params: { goalSetId: string } }) {
  // 1. 認証
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. 認可
  const allowed = await canSubmitGoal(session.user, params.goalSetId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 3. フェーズ制御
  const inPhase = await isGoalSettingPhaseActive();
  if (!inPhase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 4. バリデーション
  const body = await req.json();
  const parsed = submitGoalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // 5. ビジネスロジック
  // ...
}
```

#### レスポンスフォーマット

Route Handler のレスポンスは以下の形式に統一する。

| 操作 | ステータス | ボディ |
| -- | ------- | ---- |
| GET（単一リソース取得） | `200` | リソースオブジェクト直接 |
| GET（リスト取得） | `200` | リソース配列直接 |
| POST（新規作成） | `201` | 作成されたリソースオブジェクト |
| PATCH（更新） | `200` | 更新後のリソースオブジェクト |
| POST（操作系・リソース返却不要） | `200` | `{ success: true }` |
| エラー（全般） | 適切な 4xx / 5xx | `{ error: string }` |

```typescript
// 成功（単一リソース）
return NextResponse.json(goalSet, { status: 200 });

// 成功（新規作成）
return NextResponse.json(newGoalSet, { status: 201 });

// 成功（操作系）
return NextResponse.json({ success: true });

// エラー
return NextResponse.json({ error: 'リソースが見つかりません' }, { status: 404 });
```

### 1.4 Prisma の利用規則

- Prisma クライアントは必ず `lib/db.ts` のシングルトンをインポートして使用する。`new PrismaClient()` を直接呼ばない
- PgBouncer Transaction モードの制限により、`prisma.$transaction(callback)` 形式は使用禁止。複数操作をアトミックに実行する場合はクエリ配列渡し形式を使用する

```typescript
// 推奨: クエリ配列渡し（PgBouncer Transaction モードで使用可）
await prisma.$transaction([
  prisma.goalSet.update({ where: { id }, data: { status: 'APPROVED' } }),
  prisma.approvalRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } }),
]);

// 禁止: Interactive Transaction（PgBouncer Transaction モードで使用不可）
await prisma.$transaction(async (tx) => {
  await tx.goalSet.update(...);
});
```

- N+1クエリを防ぐため、必要なリレーションは `include` / `select` で一括ロードする
- `include` で全カラムを取得する必要がない場合は `select` で絞り込む

### 1.5 エラーハンドリング

- Route Handler ではすべての例外を `try-catch` で捕捉し、適切な HTTP ステータスコードを返す
- クライアントに返すエラーメッセージはユーザー向けの簡潔なものとし、スタックトレースを含めない
- サーバーログにはスタックトレースを記録する（`console.error(error)` 等）

### 1.6 コメントの記述方針

- **コメントはコードで表現できない「なぜ（WHY）」のみに限定する**
- 変数名・関数名で意図が伝わる場合はコメントを書かない
- 処理の「何（WHAT）」を説明するコメントは書かない

```typescript
// 推奨: WHY が非自明な場合のみ
// PgBouncer Transaction モードでは Interactive Transaction が使えないためクエリ配列渡しを使用
await prisma.$transaction([...]);

// 非推奨: WHAT を説明するだけのコメント
// ゴールセットのステータスをAPPROVEDに更新する
await prisma.goalSet.update({ data: { status: 'APPROVED' } });
```

- 多行コメントブロックは書かない。どうしても必要な場合も1行に収める
- JSDoc / TSDoc は公開 API（外部ライブラリ等）を除き書かない

### 1.7 セキュリティ

- **XSS**: JSX は `dangerouslySetInnerHTML` を使用しない。HTMLをそのまま出力しない
- **SQLインジェクション**: Prisma のパラメータバインドを使用。生クエリ（`$queryRaw`）は原則使用しない
- **CSRF**: Next.js の Same-Site Cookie と Supabase Auth のトークン検証で対策する
- **環境変数**: DB接続情報・APIキーをコードにハードコードしない。`SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアントサイドに渡さない

### 1.8 インポート規則

#### パスエイリアス

`@/` は `src/` ディレクトリへのエイリアスとして `tsconfig.json` の `paths` に設定する。ファイル間のインポートは相対パス（`../../`）ではなく **`@/` を使用する**。

```typescript
// 推奨
import { prisma } from '@/lib/db';
import { GoalCard } from '@/components/goals/GoalCard';

// 非推奨: 相対パス
import { prisma } from '../../../lib/db';
```

同一ディレクトリ内のファイルを参照する場合は `./` 相対パスを使用してよい。

#### インポート順序

以下の順序で記述し、グループ間に空行を1行入れる（ESLint `import/order` ルールで自動チェック）。

```typescript
// 1. Node.js 標準モジュール
import path from 'path';

// 2. サードパーティパッケージ
import { NextResponse } from 'next/server';
import { z } from 'zod';

// 3. 内部モジュール（@/ エイリアス）
import { prisma } from '@/lib/db';
import { canSubmitGoal } from '@/lib/permissions';

// 4. 相対パス
import type { GoalCardProps } from './types';
```

---

## 2. 命名規則

### 2.1 ファイル・ディレクトリ

| 対象 | 規則 | 例 |
| -- | -- | - |
| ページファイル | `page.tsx`（固定） | `app/(main)/dashboard/page.tsx` |
| Route Handler ファイル | `route.ts`（固定） | `app/api/goals/route.ts` |
| コンポーネントファイル | PascalCase + `.tsx` | `GoalCard.tsx` |
| ライブラリ・ユーティリティ | camelCase + `.ts` | `permissions.ts` |
| カスタム Hooks | `use` プレフィックス + PascalCase + `.ts` | `useCurrentUser.ts` |
| テストファイル（Jest） | `対象ファイル名.test.ts(x)` | `score.test.ts` |
| テストファイル（Playwright） | `機能名.spec.ts` | `goal-setting.spec.ts` |

### 2.2 TypeScript

| 対象 | 規則 | 例 |
| -- | -- | - |
| React コンポーネント | PascalCase | `GoalCard` / `ApprovalStepIndicator` |
| 関数・変数 | camelCase | `getMboScore` / `currentUser` |
| 定数（モジュールスコープ） | SCREAMING_SNAKE_CASE | `MAX_GOALS_PER_SET` |
| 型・インターフェース | PascalCase | `GoalSetStatus` / `GoalCardProps` |
| Zod スキーマ変数 | camelCase + `Schema` サフィックス | `submitGoalSchema` |
| カスタム Hooks | `use` プレフィックス + camelCase | `useCurrentUser` / `useNotifications` |

### 2.3 データベース・API

| 対象 | 規則 | 例 |
| -- | -- | - |
| DB テーブル名 | snake_case（複数形） | `goal_sets` / `approval_requests` |
| DB カラム名 | snake_case | `employee_id` / `created_at` |
| API パス | kebab-case | `/api/goal-sets` / `/api/degree360-scores` |
| API パスパラメータ | camelCase | `:goalSetId` / `:employeeId` |
| 環境変数 | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |

### 2.4 Prisma スキーマ

- モデル名は PascalCase（単数形）で定義する（例: `GoalSet` / `Employee`）
- フィールド名は camelCase（Prisma がDBの snake_case と自動マッピングする）
- リレーション名は参照先のモデル名（単数 / 複数形）を使用する

```prisma
model GoalSet {
  id         String   @id @default(uuid())
  employeeId String   @map("employee_id")
  employee   Employee @relation(fields: [employeeId], references: [id])

  @@map("goal_sets")
}
```

---

## 3. スタイリング規約

### 3.1 基本方針

- スタイリングは **Tailwind CSS のユーティリティクラス**を使用する
- カスタム CSS ファイルはグローバルスタイル（`app/globals.css`）のみに限定し、コンポーネントレベルの CSS ファイルは作成しない
- インラインスタイル（`style={{ }}` 属性）は使用しない

### 3.2 デザインシステム

#### カラーパレット

| 用途 | カラーコード | Tailwind クラス | 使用上の注意 |
| -- | --------- | ------------ | --------- |
| プライマリ（装飾） | `#01AEBB` | `primary`（カスタム） | テキストカラーへの使用禁止（コントラスト比 2.7:1 で WCAG AA 未達） |
| 本文テキスト | `#1A1A1A` | `text-gray-900` 相当 | 白背景とのコントラスト比 約16:1 |
| エラー | `#C0392B` | `text-red-600` 相当 | エラーメッセージ・危険操作 |
| 成功 | `#27AE60` | `text-green-600` 相当 | 完了状態・肯定操作 |
| 警告 | `#E67E22` | `text-orange-500` 相当 | 注意が必要な状態 |

- `#01AEBB` はボタン背景・ボーダー・アイコン等の**装飾要素に限定**する
- テキストカラーへの使用は WCAG 2.1 AA 基準（通常テキスト 4.5:1）を満たさないため禁止

#### コンポーネントライブラリ

- **shadcn/ui** をベースとして使用する（`src/components/ui/` に CLI で生成されたソースコードが配置される）
- shadcn/ui のコンポーネントは**直接編集してよい**（CLI でコピーされたソースコードはプロジェクトの一部であり、直接変更することが設計意図）
- ただし CLI で再生成（`npx shadcn@latest add <component>`）すると上書きされるため、カスタマイズ内容は再生成前に差分をバックアップしておく
- 軽微なスタイル調整は `cn()` ユーティリティと `className` prop で行い、コンポーネント本体の編集は最小限にとどめる

### 3.3 Tailwind CSS の記述ルール

- クラス名の並び順は **Tailwind CSS の公式推奨順**（Prettier プラグイン `prettier-plugin-tailwindcss` で自動整列）
- 条件付きクラスは `cn()` ユーティリティ（shadcn/ui の `lib/utils.ts` が提供）を使用する

```typescript
import { cn } from '@/lib/utils';

// 推奨
<div className={cn('rounded-lg p-4', isActive && 'bg-primary text-white')} />

// 非推奨: テンプレートリテラルで結合
<div className={`rounded-lg p-4 ${isActive ? 'bg-primary text-white' : ''}`} />
```

- レスポンシブ対応は Tailwind のブレークポイントプレフィックスを使用する（`sm:` / `md:` / `lg:`）

### 3.4 アクセシビリティ（スタイリング観点）

- インタラクティブ要素にはフォーカスリングを維持する。`focus:outline-none` だけで消すのは禁止。代わりに `focus-visible:ring-2 focus-visible:ring-primary` 等を組み合わせて代替の視覚的フォーカスを提供する
- エラーメッセージは色だけで伝えず、テキストでも明示する
- アイコンのみのボタンには `aria-label` を付与する

---

## 4. テスト規約

### 4.1 テスト種別と責務

| テスト種別 | ツール | 対象 | 配置先 |
| ------- | ---- | -- | ---- |
| ユニットテスト | Jest | ビジネスロジック（スコア計算・権限チェック等） | `__tests__/unit/lib/` |
| コンポーネントテスト | Jest + Testing Library | ビジネスロジックを含む UI コンポーネント | `__tests__/unit/components/` |
| E2Eテスト | Playwright | 主要フロー（目標設定〜承認〜評価確定） | `e2e/` |

### 4.2 テストファイルの配置

- Jest テストは `__tests__/` に集約し、対応する `src/` のディレクトリ構造を `__tests__/unit/` 以下にミラーする
- Playwright E2E テストは `e2e/` に配置する（`__tests__/` には置かない）

```text
src/lib/score.ts         → __tests__/unit/lib/score.test.ts
src/components/goals/GoalCard.tsx → __tests__/unit/components/goals/GoalCard.test.tsx
e2e/goal-setting.spec.ts（Playwright）
```

### 4.3 ユニットテストの方針

- **スコア計算**（`lib/score.ts`）・**権限チェック**（`lib/permissions.ts`）・**フェーズ判定**（`lib/phases.ts`）はユニットテストを必ず作成する
- テストは Arrange-Act-Assert パターンで記述する
- DB / 外部サービスへの依存はモックする（Jest の `jest.mock()`）
- テスト名は「状況 + 期待する結果」の形式で日本語記述してよい（例: `重みの合計が100%のとき、バリデーションが通る`）

```typescript
describe('calculateMboScore', () => {
  it('重みの合計が100%のとき、加重平均スコアを返す', () => {
    const goals = [
      { score: 4, weight: 60 },
      { score: 2, weight: 40 },
    ];
    expect(calculateMboScore(goals)).toBe(3.2);
  });
});
```

### 4.4 コンポーネントテストの方針

- ビジネスロジックを含むコンポーネント（例: `ApprovalStepIndicator`）はコンポーネントテストを作成する
- ユーザー操作を起点にしたテストを書く（`fireEvent` / `userEvent`）
- コンポーネントの内部実装（状態変数名・プライベート関数）ではなく、表示結果を検証する

```typescript
it('APPROVED ステータスのとき「承認済み」バッジを表示する', () => {
  render(<ApprovalStepIndicator status="APPROVED" />);
  expect(screen.getByText('承認済み')).toBeInTheDocument();
});
```

### 4.5 E2Eテストの方針

- クリティカルパスのみに限定する（目標設定→承認→評価確定の主要フロー）
- テスト用のシード DB を使用し、本番・ステージング DB には接続しない
- Playwright の `page.getByRole()` / `page.getByLabel()` 等のセマンティックセレクタを優先し、CSS セレクタや `id` 属性への依存を避ける

### 4.6 カバレッジ目標

| 対象 | カバレッジ目標 |
| -- | ---------- |
| ビジネスロジック（`lib/` 配下） | 80% 以上 |
| ビジネスロジックを含む UI コンポーネント | 全件 |
| E2E クリティカルパス | 全件 |

---

## 5. Git規約

### 5.1 ブランチ戦略

**GitHub Flow** を採用する（`main` ブランチ + `feature/*` ブランチのみ）。

```text
main
  └─ feature/add-goal-revision-flow
  └─ feature/fix-score-calculation-bug
  └─ feature/improve-notification-ui
```

- `main` への直接 push は禁止。必ず PR を経由する
- `develop` / `staging` ブランチは作成しない（ステージングは Vercel の PR プレビュー環境で代替）
- `feature/` ブランチ名は kebab-case で機能の内容を端的に表す

### 5.2 コミットメッセージ

**Conventional Commits** 形式を使用する。

```text
<type>(<scope>): <description>

[optional body]
[optional footer]
```

- **言語**: `<description>` および本文は**日本語**で記述する
- **文字数**: `<type>(<scope>): <description>` の行全体を **72文字以内**に収める
- **本文**: 72文字で折り返す。変更の「なぜ」を書き、「何をしたか」はコードが伝える

#### type 一覧

| type | 用途 |
| --- | -- |
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `refactor` | 動作を変えないリファクタリング |
| `style` | コードフォーマット・Lint修正（ロジックの変更なし） |
| `test` | テストの追加・修正 |
| `docs` | ドキュメントのみの変更 |
| `chore` | ビルドプロセス・補助ツールの変更（package.json更新等） |
| `perf` | パフォーマンス改善 |
| `ci` | CI/CD 設定の変更 |

#### scope の例

`goals` / `approvals` / `reviews` / `admin` / `auth` / `notifications` / `db` / `api`

#### コミットメッセージの例

```text
feat(goals): 目標修正申請フローを追加

差し戻し時に MEMBER が修正申請を提出できる機能を実装。
approval_requests に GOAL_REVISION タイプのレコードを生成する。

Closes #42
```

```text
fix(score): 重みが0の目標が含まれる場合の計算誤りを修正
```

### 5.3 プルリクエスト

- PR タイトルはコミットメッセージと同じ Conventional Commits 形式にする
- PR 本文には以下を含める:
  - 変更の概要（なぜこの変更が必要か）
  - テスト方法（手動確認した場合はスクリーンショットを含める）
  - 関連 Issue 番号（`Closes #XX`）
- セルフレビュー後、1名以上のレビュー承認を必須とする
- Prisma マイグレーションファイル（`prisma/migrations/`）は必ず PR に含める

### 5.4 マージ方針

- PR のマージには **Squash merge** を使用する（コミット履歴を1つにまとめて `main` を簡潔に保つ）
- マージ後の `feature/*` ブランチは削除する

### 5.5 CI チェック

以下がすべて green でなければマージしない:

| チェック | コマンド |
| ----- | ------ |
| Lint | `eslint src/ --ext .ts,.tsx` |
| 型チェック | `tsc --noEmit` |
| ユニット・コンポーネントテスト | `jest` |

E2Eテスト（Playwright）はリリース前の手動実行とし、CI での自動実行は任意とする。
