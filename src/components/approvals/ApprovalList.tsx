'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ApprovalActionModal } from './ApprovalActionModal';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { ApprovalRequest, GoalSet, Employee, EvaluationPeriod } from '@prisma/client';

type ApprovalRequestWithDetails = ApprovalRequest & {
  requester: Employee;
  goalSet: GoalSet & {
    evaluationPeriod: EvaluationPeriod;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export function ApprovalList() {
  const { data, error, mutate } = useSWR<{ requests: ApprovalRequestWithDetails[] }>('/api/approvals', fetcher);
  
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestWithDetails | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (error) return <div className="p-4 text-destructive">データの取得に失敗しました。</div>;
  if (!data) return <div className="p-4">読み込み中...</div>;

  const requests = data.requests || [];

  const filteredRequests = requests.filter((req) => {
    if (activeTab === 'pending') return req.status === 'PENDING';
    if (activeTab === 'approved') return req.status === 'APPROVED';
    if (activeTab === 'rejected') return req.status === 'REJECTED';
    return false;
  });

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'GOAL_APPROVAL': return '目標設定';
      case 'GOAL_REVISION': return '目標修正';
      case 'MEETING_REJECTION': return '最終承認後差し戻し';
      default: return type;
    }
  };

  const openActionModal = (request: ApprovalRequestWithDetails, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
  };

  const closeActionModal = () => {
    setSelectedRequest(null);
    setActionType(null);
  };

  const handleActionSubmit = async (note?: string) => {
    if (!selectedRequest || !actionType) return;
    
    setIsSubmitting(true);
    try {
      const endpoint = `/api/approvals/${selectedRequest.id}/${actionType}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionNote: note }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '操作に失敗しました。');
      }

      alert(actionType === 'approve' ? '承認しました。' : '差し戻しました。');
      
      await mutate();
      closeActionModal();
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>承認・申請管理</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              承認待ち 
              {requests.filter(r => r.status === 'PENDING').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {requests.filter(r => r.status === 'PENDING').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">承認済み</TabsTrigger>
            <TabsTrigger value="rejected">差し戻し済み</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申請日</TableHead>
                    <TableHead>申請者</TableHead>
                    <TableHead>申請内容</TableHead>
                    <TableHead>申請種別</TableHead>
                    {activeTab === 'pending' && <TableHead>アクション</TableHead>}
                    {activeTab !== 'pending' && <TableHead>処理日</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeTab === 'pending' ? 5 : 5} className="text-center py-8 text-muted-foreground">
                        データがありません。
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          {format(new Date(req.requestedAt), 'yyyy/MM/dd', { locale: ja })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {req.requester.name}
                        </TableCell>
                        <TableCell>
                          {req.goalSet.evaluationPeriod.name} {getRequestTypeLabel(req.requestType)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRequestTypeLabel(req.requestType)}</Badge>
                        </TableCell>
                        {activeTab === 'pending' && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/goals/${req.goalSetId}`}>
                                  詳細確認
                                </Link>
                              </Button>
                              <Button size="sm" onClick={() => openActionModal(req, 'approve')}>
                                承認
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => openActionModal(req, 'reject')}>
                                差し戻し
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        {activeTab !== 'pending' && (
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <span>
                                {req.resolvedAt 
                                  ? format(new Date(req.resolvedAt), 'yyyy/MM/dd HH:mm', { locale: ja })
                                  : '-'}
                              </span>
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/goals/${req.goalSetId}`}>
                                  詳細を見る
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <ApprovalActionModal
        isOpen={!!selectedRequest}
        onClose={closeActionModal}
        actionType={actionType}
        onSubmit={handleActionSubmit}
        isSubmitting={isSubmitting}
        employeeName={selectedRequest?.requester.name || ''}
      />
    </Card>
  );
}
