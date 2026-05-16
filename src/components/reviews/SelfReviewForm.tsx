'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoalType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
};

interface SelfReviewFormProps {
  goalSetId: string;
  goals: ReviewGoal[];
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

export function SelfReviewForm({ goalSetId, goals }: SelfReviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState(() => goals.map((goal) => ({
    goalId: goal.id,
    score: goal.selfReview?.score ?? 1.0,
    comment: goal.selfReview?.comment ?? '',
  })));

  const isSubmitted = goals.every((goal) => goal.selfReview?.submittedAt);

  const updateReview = (goalId: string, field: 'score' | 'comment', value: number | string) => {
    setReviews((current) => current.map((review) => (
      review.goalId === goalId ? { ...review, [field]: value } : review
    )));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goalSetId}/self-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '自己評価の提出に失敗しました。');
      }

      router.refresh();
      router.push(`/goals/${goalSetId}?selfReviewSubmitted=1`);
    } catch (error) {
      alert(error instanceof Error ? error.message : '自己評価の提出に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {goals.map((goal, index) => {
        const review = reviews.find((item) => item.goalId === goal.id);
        if (!review) return null;

        return (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle>{goalTypeLabel(goal.goalType, index)}</CardTitle>
                <div className="flex items-center gap-2">
                  <ScoreDisplay score={review.score} label="自己評価" />
                  <span className="text-xs text-muted-foreground">ウェイト {goal.weight}%</span>
                </div>
              </div>
              <div>
                <p className="font-medium">{goal.title}</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{goal.description}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>達成スコア</Label>
                <Select
                  value={review.score.toFixed(1)}
                  onValueChange={(value) => updateReview(goal.id, 'score', Number(value))}
                  disabled={isSubmitted}
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
                <Label>自己評価コメント</Label>
                <Textarea
                  value={review.comment}
                  onChange={(event) => updateReview(goal.id, 'comment', event.target.value)}
                  disabled={isSubmitted}
                  rows={4}
                  placeholder="成果、未達要因、次期に活かす観点を記入してください。"
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
        <Button onClick={handleSubmit} disabled={isSubmitting || isSubmitted}>
          {isSubmitted ? '提出済み' : isSubmitting ? '提出中...' : '自己評価を提出'}
        </Button>
      </div>
    </div>
  );
}
