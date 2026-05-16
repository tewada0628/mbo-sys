'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Goal, MidtermReview } from '@prisma/client';

type GoalWithReview = Goal & { midtermReview: MidtermReview | null };

interface MidtermReviewFormProps {
  goalSetId: string;
  goals: GoalWithReview[];
  isManager: boolean;
  isEmployee: boolean;
  onSuccess?: () => void;
}

export function MidtermReviewForm({ goalSetId, goals, isManager, isEmployee, onSuccess }: MidtermReviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState(() => 
    goals.map((g) => ({
      goalId: g.id,
      progress: g.midtermReview?.progress || '',
      comment: g.midtermReview?.comment || '',
      managerComment: g.midtermReview?.managerComment || '',
      revisionRequested: g.midtermReview?.revisionRequested || false,
      revisionRequestNote: g.midtermReview?.revisionRequestNote || '',
    }))
  );

  const isSubmittedByEmployee = !!goals[0]?.midtermReview?.employeeSubmittedAt;
  const isSubmittedByManager = !!goals[0]?.midtermReview?.managerSubmittedAt;
  
  const canEditAsEmployee = isEmployee && !isSubmittedByEmployee;
  const canEditAsManager = isManager && !isSubmittedByManager;

  const updateReview = (goalId: string, field: string, value: any) => {
    setReviews((prev) => 
      prev.map((r) => (r.goalId === goalId ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = async (action: 'save' | 'submit_employee' | 'submit_manager') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goalSetId}/midterm-review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました。');
      }

      alert(action === 'save' ? '下書き保存しました。' : '提出しました。');
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {goals.map((goal, index) => {
        const review = reviews.find((r) => r.goalId === goal.id);
        if (!review) return null;

        return (
          <Card key={goal.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>目標{index + 1}: {goal.title}</span>
                <div className="flex gap-2">
                  {goal.midtermReview?.employeeSubmittedAt && (
                    <Badge variant="secondary">社員提出済</Badge>
                  )}
                  {goal.midtermReview?.managerSubmittedAt && (
                    <Badge className="bg-green-600">上長提出済</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>進捗状況</Label>
                <Select
                  value={review.progress}
                  onValueChange={(val) => updateReview(goal.id, 'progress', val)}
                  disabled={!canEditAsEmployee}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="順調">順調</SelectItem>
                    <SelectItem value="やや遅れ">やや遅れ</SelectItem>
                    <SelectItem value="遅れ">遅れ</SelectItem>
                    <SelectItem value="完了">完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>社員コメント</Label>
                <Textarea
                  value={review.comment}
                  onChange={(e) => updateReview(goal.id, 'comment', e.target.value)}
                  disabled={!canEditAsEmployee}
                  placeholder="現在の進捗や課題を記入してください。"
                  rows={4}
                />
              </div>

              {(isManager || review.managerComment || review.revisionRequested) && (
                <div className="grid gap-2 pt-4 border-t border-border mt-4">
                  <Label>上長コメント</Label>
                  <Textarea
                    value={review.managerComment}
                    onChange={(e) => updateReview(goal.id, 'managerComment', e.target.value)}
                    disabled={!canEditAsManager}
                    placeholder="アドバイスやフィードバックを記入してください。"
                    rows={4}
                  />

                  {isManager && (
                    <div className="mt-4 space-y-4 bg-muted/50 p-4 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`revision-${goal.id}`}
                          checked={review.revisionRequested}
                          disabled={!canEditAsManager}
                          onCheckedChange={(checked) => updateReview(goal.id, 'revisionRequested', checked)}
                        />
                        <Label htmlFor={`revision-${goal.id}`} className="font-semibold cursor-pointer">
                          この目標について修正を依頼する
                        </Label>
                      </div>
                      
                      {review.revisionRequested && (
                        <div className="grid gap-2">
                          <Label>修正依頼コメント</Label>
                          <Textarea
                            value={review.revisionRequestNote}
                            onChange={(e) => updateReview(goal.id, 'revisionRequestNote', e.target.value)}
                            disabled={!canEditAsManager}
                            placeholder="具体的な修正指示を記入してください。"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end gap-4 mt-6">
        {((isEmployee && !isSubmittedByEmployee) || (isManager && !isSubmittedByManager)) && (
          <Button variant="outline" onClick={() => handleSave('save')} disabled={isSubmitting}>
            下書き保存
          </Button>
        )}
        {isEmployee && !isSubmittedByEmployee && (
          <Button onClick={() => handleSave('submit_employee')} disabled={isSubmitting}>
            社員として提出
          </Button>
        )}
        {isManager && !isSubmittedByManager && (
          <Button onClick={() => handleSave('submit_manager')} disabled={isSubmitting}>
            上長として提出
          </Button>
        )}
      </div>
    </div>
  );
}
