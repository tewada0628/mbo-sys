# 認証コード再送機能の実装設計

**ステアリングディレクトリ**: `.steering/20260511-add-resend-otp-feature/`
**作成日**: 2026-05-11
**設計者**: Antigravity

## 1. 実装アプローチ

### 1.1 Server Action の追加
`src/app/auth/actions.ts` に、メールアドレスを受け取って OTP を再送する `resendOtp` 関数を追加する。
中身は `signIn` 関数とほぼ同様だが、リダイレクトは行わず、結果（成功/失敗）を返すのみとする。

### 1.2 UI の修正
`src/app/login/verify/page.tsx` において：
- 「再送」ボタンを `<button>` から Server Action を呼び出す関数に紐付ける。
- 再送中のローディング状態を管理する `isResending` ステートを追加する。
- 再送完了時のメッセージ（「コードを再送しました」等）を表示するステートを追加する。

## 2. 変更内容

### 2.1 [MODIFY] [actions.ts](file:///Users/t-wada/dev/mbo-sys/src/app/auth/actions.ts)
- `resendOtp(email: string)` Server Action を追加。
- Prisma でのユーザー存在確認も行い、未登録ユーザーへの再送は行わないようにする。

### 2.2 [MODIFY] [page.tsx](file:///Users/t-wada/dev/mbo-sys/src/app/login/verify/page.tsx)
- `resendOtp` をインポート。
- `handleResend` 関数を実装。
- UI に成功メッセージ表示エリアを追加。

## 3. 影響範囲の分析
- 既存のログイン（`signIn`）や検証（`verifyOtp`）には影響を与えない。
- 画面遷移が発生しないため、ユーザーが入力中のコードが消える心配もない。

## 4. テスト計画
- 正常系：再送ボタンをクリックし、実際にメールが届くこと、画面に「再送しました」と表示されること。
- 異常系：無効なメールアドレス（クエリパラメータの改ざん等）で再送を試みた場合にエラーが表示されること。
