import { expect, test } from '@playwright/test';

const hrStorageState = process.env.E2E_HR_STORAGE_STATE;
const evaluationPeriodId = process.env.E2E_EVALUATION_PERIOD_ID;
const employeeCode = process.env.E2E_EMPLOYEE_CODE ?? '40001';

test.describe('evaluation adjustment flow', () => {
  test.skip(
    !hrStorageState || !evaluationPeriodId,
    'Set E2E_HR_STORAGE_STATE and E2E_EVALUATION_PERIOD_ID to run this flow.',
  );

  test('HR imports 360 degree scores from CSV on review adjustment screen', async ({ browser }) => {
    if (!hrStorageState || !evaluationPeriodId) return;

    const context = await browser.newContext({ storageState: hrStorageState });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/admin/review-adjustment');
    await expect(page.getByRole('heading', { name: '評価調整・確定' })).toBeVisible();

    await page.getByRole('button', { name: '360度スコアCSV取込' }).click();
    await page.getByLabel('CSVファイル').setInputFiles({
      name: 'degree360-e2e.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'employee_code,achievement_score,credo_score,is_top20_achievement',
        `${employeeCode},4.6,6.5,true`,
      ].join('\n')),
    });
    await page.getByRole('button', { name: '取込' }).click();

    await expect(page.getByText('360度スコアCSV取込')).toBeVisible();
    await context.close();
  });
});
