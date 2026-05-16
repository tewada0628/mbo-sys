'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const BIAS_ITEMS = [
  ['ハロー効果', '全体印象や一部の成果だけで、他の項目まで高低に引っ張られていないか確認する。'],
  ['寛大化傾向', '関係性や努力量への思い入れで、基準より甘い評価になっていないか確認する。'],
  ['厳格化傾向', '優秀者や理想状態を基準にしすぎて、基準より厳しい評価になっていないか確認する。'],
  ['中心化傾向', '差をつけることを避け、すべてを中間評価に寄せていないか確認する。'],
  ['期末効果', '直近の出来事だけでなく、評価期間全体の実績を見ているか確認する。'],
];

export function BiasWarningBanner() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <AlertTitle className="text-amber-900">評価バイアス確認</AlertTitle>
          <AlertDescription className="text-amber-800">
            評価入力前に、以下の観点でスコアとコメントの妥当性を確認してください。
          </AlertDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-amber-900 hover:bg-amber-100"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      {isOpen && (
        <div className="col-start-1 col-end-3 mt-3 grid gap-2 md:grid-cols-2">
          {BIAS_ITEMS.map(([title, description]) => (
            <div key={title} className="rounded-md border border-amber-200 bg-white/70 p-3">
              <div className="text-sm font-semibold text-amber-950">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">{description}</p>
            </div>
          ))}
        </div>
      )}
    </Alert>
  );
}
