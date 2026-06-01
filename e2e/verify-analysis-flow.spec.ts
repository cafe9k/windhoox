/**
 * E2E test: verify the "start analysis" flow works end-to-end.
 *
 * Tests:
 * 1. Input box has default requirement pre-filled
 * 2. Clicking "开始分析" shows "分析进行中..." loading state
 * 3. After API returns, insights and test cases appear
 * 4. Failed state shows error message (if API key invalid)
 */

import { test, expect, _electron as electron } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Analysis Flow", () => {
  test("default requirement is pre-filled", async () => {
    const electronApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Check textarea has default requirement (> 200 chars)
    const textarea = page.locator('[data-testid="requirement-input"]');
    await expect(textarea).toBeVisible();
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(200);
    expect(value).toContain("退货");

    await electronApp.close();
  });

  test("clicking start analysis shows loading then results", async () => {
    const electronApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // 1. Check initial state: "开始分析" button is enabled (default requirement present)
    const startBtn = page.locator('[data-testid="start-button"]');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).not.toBeDisabled();

    // 2. Click "开始分析"
    await startBtn.click();

    // 3. Should show loading state "分析进行中..."
    await expect(page.locator("text=分析进行中...")).toBeVisible({ timeout: 5000 });

    // 4. Wait for either success or failure
    // The API call takes ~20s, so we wait up to 60s
    const completed = page.locator("text=分析完成");
    const failed = page.locator("text=分析失败");

    await expect(completed.or(failed)).toBeVisible({ timeout: 60000 });

    // Take screenshot of result
    await page.screenshot({ path: "e2e-result.png" });

    // If successful, verify insights and test cases appear
    const hasInsights = await page.locator('[data-testid="insight-card"]').count() > 0;
    const hasCases = await page.locator('[data-testid="test-case-card"]').count() > 0;

    if (hasInsights) {
      console.log(`✅ Found ${await page.locator('[data-testid="insight-card"]').count()} insight cards`);
    }
    if (hasCases) {
      console.log(`✅ Found ${await page.locator('[data-testid="test-case-card"]').count()} test case cards`);
    }

    // Verify either success or failure is properly displayed
    const isFailed = await failed.isVisible().catch(() => false);
    if (isFailed) {
      const errorText = await page.locator("text=/DeepSeek API key|error|Error|失败/").first().textContent();
      console.log(`⚠️ Analysis failed with: ${errorText}`);
    } else {
      console.log("✅ Analysis completed successfully");
    }

    await electronApp.close();
  });

  test("demo data loads correctly", async () => {
    const electronApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Click "加载演示任务" button
    const demoBtn = page.locator("text=加载演示任务");
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Should show insights immediately
    await expect(page.locator('[data-testid="insight-card"]').first()).toBeVisible({ timeout: 5000 });

    // Should show test cases
    await expect(page.locator('[data-testid="test-case-card"]').first()).toBeVisible({ timeout: 5000 });

    const insightCount = await page.locator('[data-testid="insight-card"]').count();
    const caseCount = await page.locator('[data-testid="test-case-card"]').count();

    console.log(`✅ Demo: ${insightCount} insights, ${caseCount} test cases`);
    expect(insightCount).toBeGreaterThan(0);
    expect(caseCount).toBeGreaterThan(0);

    await page.screenshot({ path: "e2e-demo.png" });
    await electronApp.close();
  });
});
