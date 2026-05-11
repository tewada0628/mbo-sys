'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyOtp, resendOtp } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [value, setValue] = useState('');

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setResendMessage(null);
    const result = await verifyOtp(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setIsResending(true);
    setError(null);
    setResendMessage(null);

    const result = await resendOtp(email);
    if (result?.error) {
      setError(result.error);
    } else {
      setResendMessage('認証コードを再送しました。');
    }
    setIsResending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            MBO <span className="text-[#01AEBB]">System</span>
          </h1>
        </div>

        <Card className="border-t-4 border-t-[#01AEBB] shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-[#01AEBB]" />
              コード確認
            </CardTitle>
            <CardDescription>
              <span className="font-semibold text-gray-900">{email}</span>
              <br />
              に送信された8桁の認証コードを入力してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-6 flex flex-col items-center">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="token" value={value} />

              <InputOTP
                maxLength={8}
                value={value}
                onChange={(v) => setValue(v)}
                className="gap-2"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-10 h-14 text-xl" />
                  <InputOTPSlot index={1} className="w-10 h-14 text-xl" />
                  <InputOTPSlot index={2} className="w-10 h-14 text-xl" />
                  <InputOTPSlot index={3} className="w-10 h-14 text-xl" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={4} className="w-10 h-14 text-xl" />
                  <InputOTPSlot index={5} className="w-10 h-14 text-xl" />
                  <InputOTPSlot index={6} className="w-10 h-14 text-xl" />
                  <InputOTPSlot index={7} className="w-10 h-14 text-xl" />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <Alert variant="destructive" className="w-full">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {resendMessage && (
                <Alert className="w-full border-green-200 bg-green-50 text-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="font-medium">{resendMessage}</AlertDescription>
                  </div>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-[#01AEBB] hover:bg-[#0198a4]"
                disabled={isLoading || value.length !== 8}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    検証中...
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          メールが届かない場合は、迷惑メールフォルダを確認するか、
          <br />
          <button
            onClick={handleResend}
            disabled={isResending}
            className="text-[#01AEBB] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto"
          >
            {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
            再送
          </button>
          してください。
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
