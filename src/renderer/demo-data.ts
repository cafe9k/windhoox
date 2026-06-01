/**
 * Demo data module — production-grade analysis for e-commerce payment flow.
 *
 * Scenario: user checks out from shopping cart and completes payment.
 * System supports Alipay, WeChat Pay, and bank-card payment.
 * Orders over ¥200 require SMS verification.
 * Confirmation email is sent after successful payment.
 */

import type { AgentEvent } from "../types/agent";

export const DEMO_REQUIREMENT =
  "用户可以在购物车中选择商品后，进入支付流程完成订单。系统支持支付宝、微信支付和银行卡支付。订单金额大于200元需要短信验证码二次验证。支付成功后发送订单确认邮件。";

export const DEMO_SESSION_ID = "demo-session-001";

export const DEMO_EVENTS: AgentEvent[] = [
  // 1. Analysis started
  {
    type: "run_started",
    sessionId: DEMO_SESSION_ID,
    taskId: "task-payment-analysis",
    timestamp: Date.now() - 60000,
  },

  // 2. Source reading
  {
    type: "reading_sources",
    sessionId: DEMO_SESSION_ID,
    source: "src/services/payment/PaymentService.ts",
    timestamp: Date.now() - 55000,
  },
  {
    type: "reading_sources",
    sessionId: DEMO_SESSION_ID,
    source: "src/services/payment/AlipayAdapter.ts",
    timestamp: Date.now() - 54000,
  },
  {
    type: "reading_sources",
    sessionId: DEMO_SESSION_ID,
    source: "src/services/payment/WechatPayAdapter.ts",
    timestamp: Date.now() - 53000,
  },
  {
    type: "reading_sources",
    sessionId: DEMO_SESSION_ID,
    source: "src/services/notification/SmsService.ts",
    timestamp: Date.now() - 52000,
  },
  {
    type: "reading_sources",
    sessionId: DEMO_SESSION_ID,
    source: "src/services/notification/EmailService.ts",
    timestamp: Date.now() - 51000,
  },

  // 3. Requirement insights (4 items)
  {
    type: "requirement_insight",
    sessionId: DEMO_SESSION_ID,
    insight: {
      businessRule:
        "支付渠道异步回调必须实现幂等校验：同一笔订单的重复回调不应导致重复扣款或重复发通知。回调处理需先查询订单状态，仅当状态为 PENDING 时才更新为 PAID。",
      risk: "第三方支付渠道（支付宝/微信）可能因网络超时发起重复回调，若未做幂等防护将导致用户被重复扣款，产生资损。",
      evidence:
        "PaymentService.processCallback() 第 78-92 行使用乐观锁（version 字段）更新订单状态，但未在更新前检查当前状态是否为 PENDING，存在竞态窗口。",
      confidence: "high",
    },
    timestamp: Date.now() - 45000,
  },
  {
    type: "requirement_insight",
    sessionId: DEMO_SESSION_ID,
    insight: {
      businessRule:
        "订单金额阈值触发二次验证：当订单总金额（含运费、折扣后实付金额）strictly greater than 200 元时，必须要求用户输入短信验证码。",
      risk: "阈值计算逻辑若未考虑优惠券、积分抵扣等折扣方式，可能导致大额订单绕过验证。需确认「实付金额」的计算口径。",
      evidence:
        "SmsService.shouldRequireVerification() 第 34 行直接比较 order.totalAmount，但 Order 实体中有 totalAmount（商品总价）、discountAmount、finalAmount（实付金额）三个字段，目前使用的是 totalAmount。",
      confidence: "medium",
    },
    timestamp: Date.now() - 42000,
  },
  {
    type: "requirement_insight",
    sessionId: DEMO_SESSION_ID,
    insight: {
      businessRule:
        "并发支付请求防重：同一用户在同一时刻对同一订单发起多次支付请求时，系统应仅允许一个支付请求进入第三方支付渠道，其余请求返回「支付处理中」或排队等待。",
      risk: "用户在弱网环境下可能多次点击支付按钮，若前端未做防抖且后端未做分布式锁控制，将导致同一订单生成多笔支付流水。",
      evidence:
        "支付接口 POST /api/v1/payments 未在网关层配置请求幂等键（idempotency-key），且 PaymentService.createPayment() 缺少分布式锁（Redis SET NX）。",
      confidence: "high",
    },
    timestamp: Date.now() - 39000,
  },
  {
    type: "requirement_insight",
    sessionId: DEMO_SESSION_ID,
    insight: {
      businessRule:
        "订单确认邮件发送：支付成功后需向用户注册邮箱发送确认邮件，邮件内容包含订单号、商品清单、支付金额、支付时间。邮件发送失败不应阻塞订单状态更新，但需记录失败日志并进入重试队列。",
      risk: "SMTP 服务不可用或邮件服务商限流时，若同步发送邮件将阻塞支付回调响应，可能导致支付渠道判定回调超时并触发退款。",
      evidence:
        "EmailService.sendOrderConfirmation() 当前为同步调用（await smtpClient.send()），且未配置重试策略。建议在消息队列（如 RabbitMQ）中异步处理邮件发送。",
      confidence: "medium",
    },
    timestamp: Date.now() - 36000,
  },

  // 4. Missing questions (3 items)
  {
    type: "missing_questions",
    sessionId: DEMO_SESSION_ID,
    questions: [
      {
        id: "q-001",
        category: "product",
        question:
          "支付超时时间是多少？用户发起支付后，若在 15 分钟内未完成支付，订单是否自动取消？取消后库存是否自动释放？",
      },
      {
        id: "q-002",
        category: "product",
        question:
          "短信验证码的有效期是多久？连续输入错误几次后需要重新获取？验证码发送频率是否有限制（如 60 秒内只能发一次）？",
      },
      {
        id: "q-003",
        category: "engineering",
        question:
          "退款流程是否在本次需求范围内？如果用户支付成功后立即申请退款，退款是原路退回还是退到平台余额？退款审批流程如何？",
      },
    ],
    timestamp: Date.now() - 30000,
  },

  // 5. Test case candidates (9 items)
  {
    type: "case_candidates",
    sessionId: DEMO_SESSION_ID,
    cases: [
      {
        id: "TC-001",
        title: "正常支付宝支付流程",
        description:
          "验证用户在购物车中选择商品后，使用支付宝完成支付的完整正向流程。",
        preconditions: [
          "用户已登录且已绑定支付宝",
          "购物车中有至少一件商品",
          "商品库存充足",
        ],
        steps: [
          "进入购物车页面，勾选商品，点击「去结算」",
          "确认订单信息（商品、金额、收货地址），点击「提交订单」",
          '选择支付方式为「支付宝」，点击「立即支付」',
          "系统调用支付宝统一下单接口，生成支付二维码/跳转链接",
          "用户在支付宝 APP 中完成支付",
          "支付宝异步回调通知系统支付成功",
          "系统更新订单状态为 PAID，发送确认邮件",
        ],
        expectedResult:
          '订单状态变为「已支付」，用户收到订单确认邮件，支付宝账户扣款金额与订单实付金额一致。',
        status: "pending",
      },
      {
        id: "TC-002",
        title: "微信支付异步回调幂等处理",
        description:
          "验证微信支付异步回调在重复通知场景下的幂等性，确保同一笔订单不会被重复处理。",
        preconditions: [
          "用户已提交订单并选择微信支付",
          "微信支付已成功扣款",
        ],
        steps: [
          "用户完成微信支付",
          "微信支付平台首次发送异步回调通知",
          "系统处理回调，更新订单状态为 PAID",
          "模拟微信支付平台因网络超时重发回调通知（相同 out_trade_no 和 transaction_id）",
          "系统再次收到相同回调",
        ],
        expectedResult:
          "第二次回调被幂等过滤，订单状态保持 PAID 不变，用户未收到重复邮件，支付流水仅有一条。",
        status: "pending",
      },
      {
        id: "TC-003",
        title: "银行卡支付失败重试",
        description:
          "验证银行卡支付在首次失败（如余额不足）后，用户更换银行卡再次支付的场景。",
        preconditions: [
          "用户已登录",
          "购物车中有商品，订单金额 150 元",
          "用户绑定了两张银行卡，其中第一张余额不足",
        ],
        steps: [
          '提交订单，选择「银行卡支付」，选择第一张银行卡',
          '系统调用银行扣款接口，返回「余额不足」',
          "系统提示支付失败，订单状态保持 PENDING",
          "用户返回支付页面，选择第二张银行卡",
          "系统再次调用银行扣款接口",
        ],
        expectedResult:
          "第二张银行卡扣款成功，订单状态变为 PAID。第一次失败的支付流水状态为 FAILED，不产生重复订单。",
        status: "pending",
      },
      {
        id: "TC-004",
        title: "金额大于200元触发短信验证",
        description:
          "验证当订单实付金额超过 200 元时，系统强制要求短信验证码二次验证。",
        preconditions: [
          "用户已登录且已绑定手机号",
          "购物车中商品总价 250 元，无折扣",
        ],
        steps: [
          "进入结算页面，确认订单金额 250 元",
          '选择任意支付方式，点击「立即支付」',
          "系统检测到金额 > 200 元，弹出短信验证码输入框",
          '用户点击「获取验证码」',
          "系统调用短信服务商发送验证码",
          "用户输入正确的 6 位验证码",
          "用户继续完成支付",
        ],
        expectedResult:
          "验证码校验通过后，支付流程正常继续。订单最终状态为 PAID。短信发送记录存在于日志中。",
        status: "pending",
      },
      {
        id: "TC-005",
        title: "金额小于200元无需短信验证",
        description:
          "验证当订单实付金额不超过 200 元时，支付流程不触发短信验证码。",
        preconditions: [
          "用户已登录",
          "购物车中商品总价 180 元",
        ],
        steps: [
          "进入结算页面，确认订单金额 180 元",
          '选择支付宝支付，点击「立即支付」',
        ],
        expectedResult:
          "系统直接进入支付宝支付流程，未弹出短信验证码输入框。支付完成后订单状态为 PAID。",
        status: "pending",
      },
      {
        id: "TC-006",
        title: "支付超时自动取消订单",
        description:
          "验证用户在发起支付后长时间未完成支付，系统在超时后自动取消订单并释放库存。",
        preconditions: [
          "用户已登录",
          "商品 A 库存为 5 件",
          "用户将商品 A 加入购物车并提交订单",
        ],
        steps: [
          '用户提交订单，选择支付宝支付',
          "系统生成订单，状态为 PENDING，商品 A 库存扣减为 4 件（预占库存）",
          "用户未完成支付，等待超时时间（如 15 分钟）",
          "系统定时任务扫描到该订单已超时",
        ],
        expectedResult:
          "订单状态自动变为 CANCELLED，商品 A 库存恢复为 5 件。用户收到订单取消通知。",
        status: "pending",
      },
      {
        id: "TC-007",
        title: "并发支付防重复扣款",
        description:
          "验证用户在弱网环境下快速多次点击支付按钮，系统仅发起一笔支付请求。",
        preconditions: [
          "用户已登录",
          "订单状态为 PENDING",
          "模拟弱网环境（网络延迟 3 秒）",
        ],
        steps: [
          '用户进入支付页面，点击「立即支付」',
          '在网络请求尚未返回时，用户在 1 秒内连续点击支付按钮 5 次',
          "系统处理所有点击事件",
        ],
        expectedResult:
          "系统仅向第三方支付渠道发起一笔支付请求。后端仅生成一条支付流水记录（payment_id 唯一）。用户最终只被扣款一次。",
        status: "pending",
      },
      {
        id: "TC-008",
        title: "支付成功发送确认邮件",
        description:
          "验证支付成功后，系统向用户注册邮箱发送订单确认邮件，邮件内容完整准确。",
        preconditions: [
          "用户已登录且已绑定邮箱 user@example.com",
          "订单中包含 2 件商品",
        ],
        steps: [
          "用户完成支付",
          "系统更新订单状态为 PAID",
          "系统触发邮件发送任务",
        ],
        expectedResult:
          "用户邮箱收到确认邮件，邮件主题包含订单号，正文包含商品清单（名称、数量、单价）、支付金额、支付时间、订单状态。",
        status: "pending",
      },
      {
        id: "TC-009",
        title: "网络中断后支付状态恢复",
        description:
          "验证用户在支付过程中遭遇网络中断，恢复后能够正确查询到支付结果。",
        preconditions: [
          "用户已登录",
          "订单状态为 PENDING",
          "用户已在第三方支付平台完成扣款",
        ],
        steps: [
          "用户发起支付，系统跳转至支付宝支付页面",
          "用户完成支付宝支付",
          "在支付宝回调系统期间，模拟系统网络中断 30 秒",
          "网络恢复后，用户刷新订单详情页面",
        ],
        expectedResult:
          "订单详情页面显示状态为 PAID。系统通过定时查询（轮询）或后续回调补单机制正确更新了订单状态。",
        status: "pending",
      },
    ],
    timestamp: Date.now() - 20000,
  },

  // 6. Coverage matrix
  {
    type: "coverage_matrix",
    sessionId: DEMO_SESSION_ID,
    matrix: [
      {
        requirementId: "REQ-01 正常支付流程（支付宝/微信/银行卡）",
        caseIds: ["TC-001", "TC-003", "TC-005"],
      },
      {
        requirementId: "REQ-02 安全验证（金额阈值 + 短信验证码）",
        caseIds: ["TC-004", "TC-005"],
      },
      {
        requirementId: "REQ-03 异步回调与幂等性",
        caseIds: ["TC-002", "TC-009"],
      },
      {
        requirementId: "REQ-04 异常处理（超时/并发/网络中断）",
        caseIds: ["TC-006", "TC-007", "TC-009"],
      },
      {
        requirementId: "REQ-05 通知机制（邮件确认）",
        caseIds: ["TC-008"],
      },
    ],
    timestamp: Date.now() - 15000,
  },

  // 7. Analysis completed
  {
    type: "run_completed",
    sessionId: DEMO_SESSION_ID,
    artifactPaths: {
      conversationPath: "/tmp/demo-session/conversation.md",
      insightPath: "/tmp/demo-session/insight.json",
      casesPath: "/tmp/demo-session/cases.json",
      coveragePath: "/tmp/demo-session/coverage.json",
    },
    timestamp: Date.now() - 10000,
  },
];
