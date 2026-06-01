import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chatCompletion,
  buildAnalysisPrompt,
  DeepSeekError,
  type DeepSeekResponse,
} from "./deepseek-client";

describe("DeepSeekError", () => {
  it("extends Error with status and code", () => {
    const error = new DeepSeekError("test message", 429, "rate_limit");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("test message");
    expect(error.status).toBe(429);
    expect(error.code).toBe("rate_limit");
    expect(error.name).toBe("DeepSeekError");
  });

  it("works without optional fields", () => {
    const error = new DeepSeekError("simple error");
    expect(error.status).toBeUndefined();
    expect(error.code).toBeUndefined();
  });
});

describe("buildAnalysisPrompt", () => {
  it("returns exactly 2 messages", () => {
    const messages = buildAnalysisPrompt("用户可以在购物车中完成支付");
    expect(messages).toHaveLength(2);
  });

  it("first message is system role", () => {
    const messages = buildAnalysisPrompt("测试需求");
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("QA analyst");
  });

  it("system prompt contains required JSON schema", () => {
    const messages = buildAnalysisPrompt("需求");
    const content = messages[0].content;
    expect(content).toContain('"insights"');
    expect(content).toContain('"questions"');
    expect(content).toContain('"cases"');
    expect(content).toContain('"coverage"');
    expect(content).toContain('"businessRule"');
    expect(content).toContain('"preconditions"');
    expect(content).toContain('"steps"');
    expect(content).toContain('"expectedResult"');
  });

  it("system prompt requires at least 3 insights and 5 cases", () => {
    const messages = buildAnalysisPrompt("需求");
    const content = messages[0].content;
    expect(content).toContain("at least 3 insights");
    expect(content).toContain("at least 5 test cases");
  });

  it("second message is user role with requirement text", () => {
    const messages = buildAnalysisPrompt("购物车支付需求");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("购物车支付需求");
  });

  it("includes the requirement text in the user message", () => {
    const requirement = "系统支持支付宝和微信支付";
    const messages = buildAnalysisPrompt(requirement);
    expect(messages[1].content).toContain(requirement);
  });
});

describe("chatCompletion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws DeepSeekError when apiKey is empty", async () => {
    await expect(
      chatCompletion(
        { apiKey: "", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
        [{ role: "user", content: "hi" }],
      ),
    ).rejects.toThrow(DeepSeekError);
  });

  it("throws with helpful message when apiKey is not configured", async () => {
    await expect(
      chatCompletion(
        { apiKey: "", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
        [{ role: "user", content: "hi" }],
      ),
    ).rejects.toThrow("DeepSeek API key is not configured");
  });

  it("calls fetch with correct URL and headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "resp-1",
          object: "chat.completion",
          created: 1234567890,
          model: "deepseek-reasoner",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: '{"test": true}' },
              finish_reason: "stop",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await chatCompletion(
      { apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
      [
        { role: "system", content: "sys" },
        { role: "user", content: "user msg" },
      ],
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-test",
    });

    const body = JSON.parse(options.body);
    expect(body.model).toBe("deepseek-reasoner");
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user msg" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(8192);
  });

  it("trims trailing slash from baseUrl", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "resp-1",
          object: "chat.completion",
          created: 1234567890,
          model: "deepseek-reasoner",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "{}" },
              finish_reason: "stop",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await chatCompletion(
      { apiKey: "sk-test", baseUrl: "https://api.deepseek.com/", model: "deepseek-reasoner" },
      [{ role: "user", content: "hi" }],
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
  });

  it("returns parsed response on success", async () => {
    const expectedResponse: DeepSeekResponse = {
      id: "resp-1",
      object: "chat.completion",
      created: 1234567890,
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: '{"insights": []}' },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(expectedResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await chatCompletion(
      { apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
      [{ role: "user", content: "hi" }],
    );

    expect(result).toEqual(expectedResponse);
  });

  it("throws DeepSeekError on HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limit exceeded"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      chatCompletion(
        { apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
        [{ role: "user", content: "hi" }],
      ),
    ).rejects.toSatisfy((err: any) => {
      expect(err).toBeInstanceOf(DeepSeekError);
      expect(err.message).toContain("429");
      expect(err.message).toContain("Rate limit exceeded");
      expect(err.status).toBe(429);
      return true;
    });
  });

  it("throws DeepSeekError on fetch failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      chatCompletion(
        { apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
        [{ role: "user", content: "hi" }],
      ),
    ).rejects.toThrow("Network error");
  });

  it("handles error body that fails to parse", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.reject(new Error("Failed to read")),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      chatCompletion(
        { apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
        [{ role: "user", content: "hi" }],
      ),
    ).rejects.toSatisfy((err: any) => {
      expect(err.message).toContain("500");
      expect(err.message).toContain("Unknown error");
      return true;
    });
  });
});
