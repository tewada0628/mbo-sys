'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoalType } from '@prisma/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LockKeyhole } from 'lucide-react';
import { BiasWarningBanner } from './BiasWarningBanner';
import { ScoreDisplay } from './ScoreDisplay';

type ReviewGoal = {
  id: string;
  goalType: GoalType;
  title: string;
  description: string;
  weight: number;
  selfReview: {
    score: number;
    comment: string | null;
    submittedAt: string | null;
  } | null;
  managerReview: {
    score: number;
    comment: string | null;
    submittedAt: string | null;
  } | null;
};

interface ManagerReviewFormProps {
  goalSetId: string;
  goals: ReviewGoal[];
  isLocked: boolean;
}

const SCORE_OPTIONS = [
  { value: '1.2', label: '1.2 期待を上回る' },
  { value: '1.0', label: '1.0 期待通り' },
  { value: '0.8', label: '0.8 期待を下回る' },
  { value: '0.6', label: '0.6 大きく未達' },
];

const goalTypeLabel = (goalType: GoalType, index: number) => {
  return goalType === 'ORG_CONTRIBUTION' ? '組織貢献目標' : `KPI連動目標 ${index + 1}`;
};

export function ManagerReviewForm({ goalSetId, goals, isLocked }: ManagerReviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reviews, setReviews] = useState(() => goals.map((goal) => ({
    goalId: goal.id,
    score: goal.managerReview?.score ?? goal.selfReview?.score ?? 1.0,
    comment: goal.managerReview?.comment ?? '',
  })));

  const isSubmitted = goals.every((goal) => goal.managerReview?.submittedAt);

  const updateReview = (goalId: string, field: 'score' | 'comment', value: number | string) => {
    setReviews((current) => current.map((review) => (
      review.goalId === goalId ? { ...review, [field]: value } : review
    )));
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    const missingDifferenceComment = reviews.some((review) => {
      const goal = goals.find((item) => item.id === review.goalId);
      return goal?.selfReview && goal.selfReview.score !== review.score && review.comment.trim() === '';
    });

    if (missingDifferenceComment) {
      setErrorMessage('自己評価と異なるスコアを付ける場合は、上長コメントを入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goalSetId}/manager-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '上長評価の提出に失敗しました。');
      }

      router.refresh();
      router.push(`/goals/${goalSetId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '上長評価の提出に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BiasWarningBanner />

      {isLocked && (
        <Alert className="border-gray-200 bg-gray-50">
          <LockKeyhole className="h-4 w-4 text-gray-600" />
          <AlertTitle>自己評価の提出待ち</AlertTitle>
          <AlertDescription>
            社員の自己評価がすべて提出されるまで、上長評価は入力できません。
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {goals.map((goal, index) => {
        const review = reviews.find((item) => item.goalId === goal.id);
        if (!review) return null;

        const hasDifference = goal.selfReview ? goal.selfReview.score !== review.score : false;

        return (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle>{goalTypeLabel(goal.goalType, index)}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreDisplay score={goal.selfReview?.score} label="自己評価" />
                  <ScoreDisplay score={review.score} label="上長評価" />
                  <span className="text-xs text-muted-foreground">ウェイト {goal.weight}%</span>
                </div>
              </div>
              <div>
                <p className="font-medium">{goal.title}</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{goal.description}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground">自己評価コメント</div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{goal.selfReview?.comment || 'コメントなし'}</p>
              </div>

              <div className="grid gap-2">
                <Label>上長評価スコア</Label>
                <Select
                  value={review.score.toFixed(1)}
                  onValueChange={(value) => updateReview(goal.id, 'score', Number(value))}
                  disabled={isLocked || isSubmitted}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>上長コメント{hasDifference && <span className="ml-1 text-destructive">*</span>}</Label>
                <Textarea
                  value={review.comment}
                  onChange={(event) => updateReview(goal.id, 'comment', event.target.value)}
                  disabled={isLocked || isSubmitted}
                  rows={4}
                  placeholder="評価理由と、自己評価との差分がある場合の根拠を記入してください。"
                  className={hasDifference && review.comment.trim() === '' ? 'border-destructive' : ''}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(`/goals/${goalSetId}`)}>
          詳細に戻る
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || isLocked || isSubmitted}>
          {isSubmitted ? '提出済み' : isSubmitting ? '提出中...' : '上長評価を提出'}
        </Button>
      </div>
    </div>
  );
}
