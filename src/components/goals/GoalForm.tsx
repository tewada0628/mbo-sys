'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod/dist/zod';
import { goalSetSchema } from '@/lib/validations/goal';
import { z } from 'zod';
import { GoalType } from '@prisma/client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Save, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KpiPatternGuide } from './KpiPatternGuide';
import { useRouter } from 'next/navigation';

type GoalFormValues = z.infer<typeof goalSetSchema>;

interface GoalFormProps {
  initialData?: GoalFormValues;
  goalSetId?: string;
  isMboExempt?: boolean;
  isRevision?: boolean;
}

const defaultGoals = [
  {
    title: '',
    description: '',
    goalType: GoalType.KPI_1,
    weight: 40,
    visibility: 'DEPARTMENT' as const,
    kpiPattern: 'KPI_DECOMPOSITION',
    criteria12: '',
    criteria10: '',
    criteria08: '',
  },
  {
    title: '',
    description: '',
    goalType: GoalType.KPI_2,
    weight: 40,
    visibility: 'DEPARTMENT' as const,
    kpiPattern: 'KPI_DECOMPOSITION',
    criteria12: '',
    criteria10: '',
    criteria08: '',
  },
  {
    title: '',
    description: '',
    goalType: GoalType.ORG_CONTRIBUTION,
    weight: 20,
    visibility: 'DEPARTMENT' as const,
    kpiPattern: undefined,
    criteria12: '',
    criteria10: '',
    criteria08: '',
  },
];

export function GoalForm({ initialData, goalSetId, isMboExempt, isRevision }: GoalFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSetSchema),
    defaultValues: initialData || { goals: defaultGoals },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "goals",
  });

  const watchGoals = form.watch('goals');
  const totalWeight = watchGoals?.reduce((sum, g) => sum + (Number(g.weight) || 0), 0) || 0;

  const onSubmit = async (data: GoalFormValues, submitType: 'save' | 'submit') => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      
      const endpoint = isRevision ? `/api/goals/${goalSetId}/revision` : (goalSetId ? `/api/goals/${goalSetId}` : `/api/goals`);
      const method = isRevision ? 'POST' : (goalSetId ? 'PATCH' : 'POST');

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('保存に失敗しました');
      }

      const resData = await res.json();
      const currentGoalSetId = goalSetId || resData.id;

      if (submitType === 'submit' && !isMboExempt && !isRevision) {
        const submitRes = await fetch(`/api/goals/${currentGoalSetId}/submit`, {
          method: 'POST',
        });
        if (!submitRes.ok) {
          throw new Error('申請に失敗しました');
        }
      }

      router.push(`/goals/${currentGoalSetId}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-8">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">目標設定</h3>
            <div className={`text-sm font-medium px-3 py-1 rounded-md ${totalWeight === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              ウェイト合計: {totalWeight}% {totalWeight !== 100 && '(100%にしてください)'}
            </div>
          </div>
          <div className="flex gap-2">
            {!isRevision && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={form.handleSubmit((d) => onSubmit(d, 'save'))}
              >
                <Save className="w-4 h-4 mr-2" />
                下書き保存
              </Button>
            )}
            {(!isMboExempt || isRevision) && (
              <Button
                type="button"
                disabled={isSubmitting || totalWeight !== 100}
                onClick={form.handleSubmit((d) => onSubmit(d, 'submit'))}
              >
                <Send className="w-4 h-4 mr-2" />
                {isRevision ? '修正申請' : '承認申請'}
              </Button>
            )}
          </div>
        </div>

        {isRevision && (
          <Card className="border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="text-lg">修正申請の理由</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="revisionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>修正理由 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="理由を選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="KPI_CHANGE">KPI・目標数値の変更</SelectItem>
                        <SelectItem value="STANDARD_DEVIATION">前提条件の大きな変化</SelectItem>
                        <SelectItem value="ROLE_CHANGE">役割・異動による変更</SelectItem>
                        <SelectItem value="MIDTERM_ENTRY">期中入社</SelectItem>
                        <SelectItem value="EARLY_CLOSURE">早期達成・目標クローズ</SelectItem>
                        <SelectItem value="GRADE_PROMOTION">期中昇格</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revisionNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>変更内容・理由の詳細 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="どの目標をどのように変更するのか、その理由を詳しく記載してください" 
                        className="min-h-[100px] bg-white" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {fields.map((field, index) => {
            const isKpi = field.goalType === GoalType.KPI_1 || field.goalType === GoalType.KPI_2;
            const titleLabel = isKpi ? `KPI連動目標 ${index + 1}` : `組織貢献目標`;

            return (
              <Card key={field.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{titleLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <FormField
                        control={form.control}
                        name={`goals.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>目標タイトル *</FormLabel>
                            <FormControl>
                              <Input placeholder="目標のタイトルを入力" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <FormField
                        control={form.control}
                        name={`goals.${index}.weight`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ウェイト (%) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`goals.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>詳細内容 *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="目標の具体的な内容や背景を記載" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isKpi && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`goals.${index}.kpiPattern`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>KPIパターン</FormLabel>
                              <KpiPatternGuide />
                            </div>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="パターンを選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="KPI_DECOMPOSITION">KPI分解</SelectItem>
                                <SelectItem value="LEADING_INDICATOR">先行指標</SelectItem>
                                <SelectItem value="ROLE_IN_GOAL">役割・貢献</SelectItem>
                                <SelectItem value="UPPER_GOAL">上位目標の横展開</SelectItem>
                                <SelectItem value="TEAM_GROWTH">チーム・組織成長</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`goals.${index}.visibility`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>公開範囲</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="公開範囲を選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SELF_ONLY">非公開 (本人と上長のみ)</SelectItem>
                                <SelectItem value="DEPARTMENT">部内公開</SelectItem>
                                <SelectItem value="COMPANY">全社公開</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {!isKpi && (
                    <div className="w-1/2 pr-2">
                      <FormField
                        control={form.control}
                        name={`goals.${index}.visibility`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>公開範囲</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="公開範囲を選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SELF_ONLY">非公開 (本人と上長のみ)</SelectItem>
                                <SelectItem value="DEPARTMENT">部内公開</SelectItem>
                                <SelectItem value="COMPANY">全社公開</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground">達成基準</h4>
                    
                    <FormField
                      control={form.control}
                      name={`goals.${index}.criteria12`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1.2水準 (期待を上回る)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="1.2水準の達成基準" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`goals.${index}.criteria10`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1.0水準 (期待通り) *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="1.0水準の達成基準" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`goals.${index}.criteria08`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>0.8水準 (期待を下回る)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="0.8水準の達成基準" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </form>
    </Form>
  );
}
