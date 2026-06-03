# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/verify-analysis-flow.spec.ts >> Analysis Flow >> demo data loads correctly via prompt click
- Location: e2e/verify-analysis-flow.spec.ts:95:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=分析中...').or(locator('text=正在处理...'))
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=分析中...').or(locator('text=正在处理...'))

```

```yaml
- strong: Windhoox
- text: 测试设计工作台
- button "查看 Agent 执行进度":
  - img "close-circle"
  - text: 分析失败
- img "check-circle"
- text: 本地 Agent 分析失败
- img "cloud"
- text: Claude API
- button "setting AI 配置":
  - img "setting"
  - text: AI 配置
- complementary:
  - button "plus 新建测试任务":
    - img "plus"
    - text: 新建测试任务
  - separator: 会话
  - list:
    - listitem: 共同购买推荐资源逻辑 评审中 18 条候选用例
    - listitem: 办签材料自动分类 待补资料 缺少接口样例
  - separator: 上下文资料
  - img "question-circle"
  - text: 暂无资料
- main:
  - strong: Agent 工作台
  - text: 分析失败
  - img "close-circle"
  - strong: 分析失败
  - text: "分析过程中出现错误，请重试 【需求背景】 公司正在开发一套电商平台的支付系统，用户可以在购物车中选择商品后，进入支付流程完成订单。 【功能需求】 1. 支付渠道：系统支持支付宝、微信支付和银行卡支付三种支付方式。用户可以在支付页面选择任意一种支付方式完成付款。 2. 安全验证：订单金额大于200元时，系统必须要求用户进行短信验证码二次验证。验证码有效期为5分钟，连续输错3次后需要重新获取，60秒内只能发送一次验证码。 3. 支付超时：用户发起支付后，如果在15分钟内未完成支付，订单自动取消并释放库存。 4. 并发控制：同一用户在同一时刻对同一订单发起多次支付请求时，系统应仅允许一个支付请求进入第三方支付渠道，其余请求返回「支付处理中」。 5. 异步回调：第三方支付渠道的异步回调必须实现幂等校验，同一笔订单的重复回调不应导致重复扣款或重复发通知。 6. 通知机制：支付成功后需向用户注册邮箱发送确认邮件，邮件内容包含订单号、商品清单、支付金额、支付时间。邮件发送失败不应阻塞订单状态更新，但需记录失败日志并进入重试队列。 7. 退款流程：用户支付成功后可立即申请退款，退款原路退回到原支付渠道，退款金额不得超过原订单实付金额。 【非功能需求】 - 支付接口响应时间不超过3秒 - 系统需要支持至少1000并发支付请求 - 所有支付流水需要保留至少3年用于审计 【相关接口】 - POST /api/v1/payments — 创建支付 - POST /api/v1/payments/callback — 支付回调 - POST /api/v1/payments/refund — 申请退款 - GET /api/v1/payments/{id} — 查询支付状态"
  - img "play-circle"
  - text: 开始分析测试需求...
  - img "close-circle"
  - text: 分析失败：Claude API 未配置。请在设置中填写 Anthropic API Key。
  - textbox "补充说明或继续分析..."
  - button "arrow-up":
    - img "arrow-up"
- button "left":
  - img "left"
```

# Test source

```ts
  26  | 
  27  |     const page = await electronApp.firstWindow();
  28  |     await page.waitForLoadState("domcontentloaded");
  29  | 
  30  |     // Check welcome screen is visible
  31  |     await expect(page.locator("text=开始一次测试设计任务")).toBeVisible();
  32  |     await expect(page.getByRole("heading", { name: "快捷任务" })).toBeVisible();
  33  | 
  34  |     // Check prompts are visible
  35  |     await expect(page.locator("text=粘贴需求生成用例")).toBeVisible();
  36  |     await expect(page.locator("text=基于本地资料分析")).toBeVisible();
  37  |     await expect(page.locator("text=Demo 演示")).toBeVisible();
  38  | 
  39  |     await electronApp.close();
  40  |   });
  41  | 
  42  |   test("clicking Demo fills input and submitting shows loading then results", async () => {
  43  |     const electronApp = await electron.launch({
  44  |       args: ["."],
  45  |       env: {
  46  |         ...process.env,
  47  |         VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
  48  |       },
  49  |     });
  50  | 
  51  |     const page = await electronApp.firstWindow();
  52  |     await page.waitForLoadState("domcontentloaded");
  53  | 
  54  |     // 1. Click "Demo 演示" prompt
  55  |     const demoPrompt = page.locator("text=Demo 演示");
  56  |     await expect(demoPrompt).toBeVisible();
  57  |     await demoPrompt.click();
  58  | 
  59  |     // 2. Wait a bit for input to be filled
  60  |     await page.waitForTimeout(500);
  61  | 
  62  |     // 3. Submit via Sender (press Enter or click send button)
  63  |     // Sender component has a textarea and send button
  64  |     const textarea = page.getByRole("textbox", { name: "输入需求描述" });
  65  |     await expect(textarea).toBeVisible();
  66  | 
  67  |     // Press Enter to submit
  68  |     await textarea.press("Enter");
  69  | 
  70  |     // 4. Should show loading state "分析中..." or "正在处理..."
  71  |     await expect(page.locator("text=分析中...").or(page.locator("text=正在处理..."))).toBeVisible({ timeout: 5000 });
  72  | 
  73  |     // 5. Wait for either success or failure
  74  |     // The API call takes ~20s, so we wait up to 60s
  75  |     const completed = page.locator("text=分析完成");
  76  |     const failed = page.locator("text=分析失败");
  77  | 
  78  |     await expect(completed.or(failed)).toBeVisible({ timeout: 60000 });
  79  | 
  80  |     // Take screenshot of result
  81  |     await page.screenshot({ path: "e2e-result.png" });
  82  | 
  83  |     // Verify either success or failure is properly displayed
  84  |     const isFailed = await failed.isVisible().catch(() => false);
  85  |     if (isFailed) {
  86  |       const errorText = await page.locator("text=/API|error|Error|失败/").first().textContent();
  87  |       console.log(`⚠️ Analysis failed with: ${errorText}`);
  88  |     } else {
  89  |       console.log("✅ Analysis completed successfully");
  90  |     }
  91  | 
  92  |     await electronApp.close();
  93  |   });
  94  | 
  95  |   test("demo data loads correctly via prompt click", async () => {
  96  |     const electronApp = await electron.launch({
  97  |       args: ["."],
  98  |       env: {
  99  |         ...process.env,
  100 |         VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
  101 |       },
  102 |     });
  103 | 
  104 |     const page = await electronApp.firstWindow();
  105 |     await page.waitForLoadState("domcontentloaded");
  106 | 
  107 |     // Click "Demo 演示" prompt
  108 |     const demoPrompt = page.locator("text=Demo 演示");
  109 |     await expect(demoPrompt).toBeVisible();
  110 |     await demoPrompt.click();
  111 | 
  112 |     // Wait a bit for input to be filled
  113 |     await page.waitForTimeout(500);
  114 | 
  115 |     // Verify textarea has content
  116 |     const textarea = page.getByRole("textbox", { name: "输入需求描述" });
  117 |     await expect(textarea).toBeVisible();
  118 |     const value = await textarea.inputValue();
  119 |     expect(value.length).toBeGreaterThan(100);
  120 |     expect(value).toContain("支付");
  121 | 
  122 |     // Submit
  123 |     await textarea.press("Enter");
  124 | 
  125 |     // Should show loading
> 126 |     await expect(page.locator("text=分析中...").or(page.locator("text=正在处理..."))).toBeVisible({ timeout: 5000 });
      |                                                                                ^ Error: expect(locator).toBeVisible() failed
  127 | 
  128 |     // Wait for result
  129 |     const completed = page.locator("text=分析完成");
  130 |     const failed = page.locator("text=分析失败");
  131 |     await expect(completed.or(failed)).toBeVisible({ timeout: 60000 });
  132 | 
  133 |     await page.screenshot({ path: "e2e-demo.png" });
  134 | 
  135 |     const isFailed = await failed.isVisible().catch(() => false);
  136 |     if (!isFailed) {
  137 |       console.log("✅ Demo analysis completed successfully");
  138 |     } else {
  139 |       console.log("⚠️ Demo analysis failed (expected if no API key)");
  140 |     }
  141 | 
  142 |     await electronApp.close();
  143 |   });
  144 | });
  145 | 
```