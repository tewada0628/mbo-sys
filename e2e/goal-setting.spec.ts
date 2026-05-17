import { expect, test } from '@playwright/test';

const memberStorageState = process.env.E2E_MEMBER_STORAGE_STATE;
const managerStorageState = process.env.E2E_MANAGER_STORAGE_STATE;
const hrStorageState = process.env.E2E_HR_STORAGE_STATE;
const evaluationPeriodId = process.env.E2E_EVALUATION_PERIOD_ID;

test.describe('goal setting approval flow', () => {
  test.skip(
    !memberStorageState || !managerStorageState || !hrStorageState || !evaluationPeriodId,
    'Set E2E_MEMBER_STORAGE_STATE, E2E_MANAGER_STORAGE_STATE, E2E_HR_STORAGE_STATE and E2E_EVALUATION_PERIOD_ID to run this flow.',
  );

  test('member submits goals and approvers approve them to APPROVED', async ({ browser }) => {
    if (!memberStorageState || !managerStorageState || !hrStorageState || !evaluationPeriodId) return;

    const runId = Date.now();
    const memberContext = await browser.newContext({ storageState: memberStorageState });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(`/goals/new?evaluationPeriodId=${evaluationPeriodId}`);
    await expect(memberPage.getByRole('heading', { name: /目標設定/ })).toBeVisible();

    const titleInputs = memberPage.getByPlaceholder('目標のタイトルを入力');
    const descriptionInputs = memberPage.getByPlaceholder('目標の具体的な内容や背景を記載');
    const criteria10Inputs = memberPage.getByPlaceholder('1.0水準の達成基準');

    for (let index = 0; index < 3; index += 1) {
      await titleInputs.nth(index).fill(`E2E目標${index + 1}-${runId}`);
      await descriptionInputs.nth(index).fill(`E2E目標${index + 1}の詳細`);
      await criteria10Inputs.nth(index).fill('期待通りの達成基準');
    }

    await memberPage.getByRole('button', { name: '承認申請' }).click();
    await expect(memberPage.getByText('承認待ち').first()).toBeVisible();
    await memberContext.close();

    const managerContext = await browser.newContext({ storageState: managerStorageState });
    const managerPage = await managerContext.newPage();
    managerPage.on('dialog', (dialog) => dialog.accept());
    await managerPage.goto('/approvals');
    await managerPage.getByRole('row', { name: /目標設定/ }).first().getByRole('button', { name: '承認' }).click();
    await managerPage.getByRole('button', { name: '承認する' }).click();
    await managerContext.close();

    const hrContext = await browser.newContext({ storageState: hrStorageState });
    const hrPage = await hrContext.newPage();
    hrPage.on('dialog', (dialog) => dialog.accept());
    await hrPage.goto('/approvals');
    await hrPage.getByRole('row', { name: /目標設定/ }).first().getByRole('button', { name: '承認' }).click();
    await hrPage.getByRole('button', { name: '承認する' }).click();
    await hrContext.close();
  });
});
