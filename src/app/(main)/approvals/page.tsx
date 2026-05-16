import { Metadata } from 'next';
import { ApprovalList } from '@/components/approvals/ApprovalList';

export const metadata: Metadata = {
  title: '承認・申請管理',
};

export default function ApprovalsPage() {
  return (
    <div className="container mx-auto py-8">
      <ApprovalList />
    </div>
  );
}
