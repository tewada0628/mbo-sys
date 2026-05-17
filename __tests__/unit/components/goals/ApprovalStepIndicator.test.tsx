import { renderToStaticMarkup } from 'react-dom/server';
import { ApprovalStepIndicator } from '@/components/goals/ApprovalStepIndicator';

describe('ApprovalStepIndicator', () => {
  it('does not render the full approval flow for draft goals', () => {
    const html = renderToStaticMarkup(<ApprovalStepIndicator status="DRAFT" />);

    expect(html).toBe('');
  });

  it('renders pending manager approval as the current step in the full variant', () => {
    const html = renderToStaticMarkup(<ApprovalStepIndicator status="PENDING_MANAGER" />);

    expect(html).toContain('本人入力');
    expect(html).toContain('上長承認');
    expect(html).toContain('事業部長承認');
    expect(html).toContain('経営承認');
    expect(html).toContain('確定');
    expect(html).toContain('>2</div>');
  });

  it('marks all steps completed when approved', () => {
    const html = renderToStaticMarkup(<ApprovalStepIndicator status="APPROVED" />);

    expect(html).toContain('本人入力');
    expect(html).toContain('確定');
    expect(html).toContain('style="width:100%"');
  });

  it('renders compact status labels for non-MBO targets', () => {
    const html = renderToStaticMarkup(
      <ApprovalStepIndicator status="SAVED" isMboTarget={false} variant="compact" />,
    );

    expect(html).toContain('保存済み');
    expect(html).toContain('本人入力');
    expect(html).not.toContain('承認ステップ:');
  });

  it('renders revision pending state without completing approved status', () => {
    const html = renderToStaticMarkup(
      <ApprovalStepIndicator status="APPROVED" isRevisionPending variant="compact" />,
    );

    expect(html).toContain('承認済み');
    expect(html).toContain('承認ステップ: 本人入力');
  });
});
