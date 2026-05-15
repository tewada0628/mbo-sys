import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export function KpiPatternGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 flex items-center gap-1">
          <Info className="h-4 w-4" />
          <span>KPIパターンの説明</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>KPIパターンの選び方</DialogTitle>
          <DialogDescription>
            目標設定におけるKPIパターンのガイドラインです。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <h4 className="font-semibold">KPI分解 (KPI_DECOMPOSITION)</h4>
            <p className="text-sm text-muted-foreground">上位目標のKPIをさらに細分化し、自身の責任範囲におけるKPIとして設定するパターン。</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">先行指標 (LEADING_INDICATOR)</h4>
            <p className="text-sm text-muted-foreground">上位目標の遅行指標（結果）を達成するための、先行指標（プロセス）をKPIとして設定するパターン。</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">役割・貢献 (ROLE_IN_GOAL)</h4>
            <p className="text-sm text-muted-foreground">上位目標達成に向けたプロジェクトや施策において、自身の役割に基づく具体的な貢献をKPIとして設定するパターン。</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">上位目標の横展開 (UPPER_GOAL)</h4>
            <p className="text-sm text-muted-foreground">上位目標をそのまま自身の目標として受け持ち、対象範囲や領域を分担してKPIを設定するパターン。</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">チーム・組織成長 (TEAM_GROWTH)</h4>
            <p className="text-sm text-muted-foreground">チームの生産性向上、人材育成、組織課題の解決など、組織基盤の強化をKPIとして設定するパターン。</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
