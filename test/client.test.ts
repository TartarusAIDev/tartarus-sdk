import { describe, it, expect, vi } from "vitest";
import { TartarusClient, TartarusError } from "../src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TartarusClient", () => {
  it("requires an API key", () => {
    expect(() => new TartarusClient({ apiKey: "" })).toThrow();
  });

  it("sends the right request and parses the reply", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "cmpl-1",
        model: "tartarus-coder",
        created: 0,
        choices: [
          { index: 0, message: { role: "assistant", content: "hi" }, finish_reason: "stop" },
        ],
      }),
    );
    const client = new TartarusClient({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });
    const res = await client.chat({ messages: [{ role: "user", content: "hello" }] });

    expect(res.choices[0].message.content).toBe("hi");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.tartarusai.dev/v1/chat/completions");
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe("tartarus-coder");
    expect(sent.stream).toBe(false);
    expect(init.headers).toMatchObject({ Authorization: "Bearer k" });
  });

  it("strips a trailing slash from baseURL", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ id: "1", model: "m", created: 0, choices: [] }),
    );
    const client = new TartarusClient({
      apiKey: "k",
      baseURL: "https://example.test/v1/",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await client.chat({ messages: [] });
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.test/v1/chat/completions");
  });

  it("throws TartarusError on a non-2xx response", async () => {
    const fetchMock = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    const client = new TartarusClient({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });
    await expect(client.chat({ messages: [] })).rejects.toBeInstanceOf(TartarusError);
  });

  it("streams text deltas", async () => {
    const chunks = [
      'data: {"id":"1","model":"m","choices":[{"index":0,"delta":{"content":"he"},"finish_reason":null}]}\n',
      'data: {"id":"1","model":"m","choices":[{"index":0,"delta":{"content":"llo"},"finish_reason":null}]}\n',
      "data: [DONE]\n",
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        for (const c of chunks) controller.enqueue(enc.encode(c));
        controller.close();
      },
    });
    const fetchMock = vi.fn(async () => new Response(stream, { status: 200 }));
    const client = new TartarusClient({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });

    let out = "";
    for await (const t of client.streamText({ messages: [{ role: "user", content: "hi" }] })) {
      out += t;
    }
    expect(out).toBe("hello");
  });
});
