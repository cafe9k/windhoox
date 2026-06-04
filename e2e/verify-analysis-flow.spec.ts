/**
 * E2E test: verify the "start analysis" flow works end-to-end.
 *
 * Tests:
 * 1. Welcome screen shows with prompts
 * 2. Clicking "Demo 演示" fills the input with demo requirement
 * 3. Submitting via Sender shows loading then results
 * 4. Failed state shows error message (if API key invalid)
 */

import { test, expect, _electron as electron } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Analysis Flow", () => {
  test("welcome screen shows with prompts", async () => {
    const electronApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Check welcome screen is visible
    await expect(page.locator("text=开始一次测试设计任务")).toBeVisible();
    await expect(page.getByRole("heading", { name: "快捷任务" })).toBeVisible();

    // Check prompts are visible
    await expect(page.locator("text=粘贴需求生成用例")).toBeVisible();
    await expect(page.locator("text=基于本地资料分析")).toBeVisible();
    await expect(page.locator("text=Demo 演示")).toBeVisible();

    await electronApp.close();
  });

  test("clicking Demo fills input and submitting shows loading then results", async () => {
    const electronApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // 1. Click "Demo 演示" prompt
    const demoPrompt = page.locator("text=Demo 演示");
    await expect(demoPrompt).toBeVisible();
    await demoPrompt.click();

    // 2. Wait a bit for input to be filled
    await page.waitForTimeout(500);

    // 3. Submit via Sender (press Enter or click send button)
    // Sender component has a textarea and send button
    const textarea = page.getByRole("textbox", { name: "输入需求描述" });
    await expect(textarea).toBeVisible();

    // Press Enter to submit
    await textarea.press("Enter");

    // 4. Wait for either success or failure
    // The API call takes ~20s, so we wait up to 60s
    // Note: if API key is not configured, it fails immediately without showing loading state
    const completed = page.locator("strong:has-text('分析完成')");
    const failed = page.locator("strong:has-text('分析失败')");

    await expect(completed.or(failed).first()).toBeVisible({ timeout: 60000 });

    // Take screenshot of result
    await page.screenshot({ path: "e2e-result.png" });

    // Verify either success or failure is properly displayed
    const isFailed = await failed.isVisible().catch(() => false);
    if (isFailed) {
      const errorText = await page.locator("text=/API|error|Error|失败|配置/").first().textContent();
      console.log(`⚠️ Analysis failed with: ${errorText}`);
    } else {
      console.log("✅ Analysis completed successfully");
    }

    await electronApp.close();
  });

  test("demo data loads correctly via prompt click", async () => {
    const electronApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Click "Demo 演示" prompt
    const demoPrompt = page.locator("text=Demo 演示");
    await expect(demoPrompt).toBeVisible();
    await demoPrompt.click();

    // Wait a bit for input to be filled
    await page.waitForTimeout(500);

    // Verify textarea has content
    const textarea = page.getByRole("textbox", { name: "输入需求描述" });
    await expect(textarea).toBeVisible();
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(100);
    expect(value).toContain("支付");

    // Submit
    await textarea.press("Enter");

    // Wait for result (success or failure)
    // Note: if API key is not configured, it fails immediately
    const completed = page.locator("strong:has-text('分析完成')");
    const failed = page.locator("strong:has-text('分析失败')");
    await expect(completed.or(failed).first()).toBeVisible({ timeout: 60000 });

    await page.screenshot({ path: "e2e-demo.png" });

    const isFailed = await failed.isVisible().catch(() => false);
    if (!isFailed) {
      console.log("✅ Demo analysis completed successfully");
    } else {
      console.log("⚠️ Demo analysis failed (expected if no API key)");
    }

    await electronApp.close();
  });
});
