# 認証コード再送機能 実装タスクリスト

**ステアリングディレクトリ**: `.steering/20260511-add-resend-otp-feature/`
**作成日**: 2026-05-11

- [ ] **Server Action の実装**
  - [ ] `src/app/auth/actions.ts` に `resendOtp` 関数を追加
- [ ] **検証画面の UI 修正**
  - [ ] `src/app/login/verify/page.tsx` に再送処理用のステートを追加 (`isResending`, `resendMessage`)
  - [ ] `handleResend` 関数の実装
  - [ ] 「再送」ボタンへのイベントハンドラ設定とローディング表示
  - [ ] 再送成功メッセージの表示エリア追加
- [ ] **動作確認**
  - [ ] 実際に「再送」をクリックしてメールが届くか確認
  - [ ] 再送中のボタン無効化が機能しているか確認
