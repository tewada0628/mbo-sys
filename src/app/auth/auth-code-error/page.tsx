import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md border-t-4 border-t-red-500 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            認証エラー
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            ログイン処理中にエラーが発生しました。リンクの期限が切れているか、既に使用されている可能性があります。
          </p>
          <div className="pt-4">
            <Button asChild className="w-full bg-[#01AEBB] hover:bg-[#0198a4]">
              <Link href="/login">ログイン画面に戻る</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
