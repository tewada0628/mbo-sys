'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function PhaseSwitcherButton({ phaseId }: { phaseId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSwitch = async () => {
    if (!confirm('このフェーズを現在有効な状態に切り替えますか？他のフェーズの期間は変更されます。')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/phases/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseId }),
      });

      if (!res.ok) {
        throw new Error('フェーズの切り替えに失敗しました。');
      }

      router.refresh();
      alert('フェーズを切り替えました。');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'フェーズの切り替えに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleSwitch} disabled={isLoading} variant="outline" size="sm">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'このフェーズを有効化'}
    </Button>
  );
}
