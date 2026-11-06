import { test, expect } from '@playwright/test';

// §117 (recruiter start): signup → onboarding → create + publish a job.
test('recruiter can sign up, onboard, and publish a job', async ({ page }) => {
  const email = `recruiter+${Date.now()}@e2e.test`;

  // Sign up (dev path: name + email, no password).
  await page.goto('/signup');
  await page.getByPlaceholder('Jane Doe').fill('E2E Recruiter');
  await page.getByPlaceholder('you@company.com').fill(email);
  await page.waitForTimeout(500); // allow hydration (run against `next start`)
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue' }).click(); // name prefilled
  await page.getByPlaceholder('Acme Inc.').fill('E2E Test Co');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Create workspace' }).click();

  // Lands on the dashboard
  await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), E2E/ })).toBeVisible();

  // Create a job
  await page.getByRole('link', { name: 'Create job' }).first().click();
  await expect(page).toHaveURL(/\/app\/jobs\/new/);
  await page.getByPlaceholder('Senior Backend Engineer').fill('E2E Backend Engineer');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Description step — write manually
  await page.getByText('Write manually').click();
  await page.getByPlaceholder(/Write the job description/).fill('We are hiring an E2E backend engineer.');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Review → publish
  await page.getByRole('button', { name: 'Publish job' }).click();
  await expect(page.getByText('Published')).toBeVisible({ timeout: 15_000 });
});
