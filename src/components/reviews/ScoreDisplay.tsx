import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number | null | undefined;
  label?: string;
  className?: string;
}

const getScoreLabel = (score: number) => {
  if (score >= 1.2) return '期待を上回る';
  if (score >= 1.0) return '期待通り';
  if (score >= 0.8) return '期待を下回る';
  return '大きく未達';
};

const getScoreClassName = (score: number) => {
  if (score >= 1.2) return 'border-green-200 bg-green-50 text-green-700';
  if (score >= 1.0) return 'border-[#01AEBB]/20 bg-[#01AEBB]/10 text-[#017d86]';
  if (score >= 0.8) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
};

export function ScoreDisplay({ score, label, className }: ScoreDisplayProps) {
  if (score == null) {
    return (
      <Badge variant="outline" className={cn('bg-gray-50 text-gray-600', className)}>
        {label ? `${label}: ` : ''}未入力
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(getScoreClassName(score), className)}>
      {label ? `${label}: ` : ''}{score.toFixed(1)} ({getScoreLabel(score)})
    </Badge>
  );
}
