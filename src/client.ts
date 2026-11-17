import type { ChatRequest, ChatResponse, StreamChunk } from "./types.js";
import { parseSSE } from "./streaming.js";

export interface TartarusOptions {
  /** Bearer token from dash.tartarusai.dev. Falls back to process.env.TARTARUS_TOKEN. */
  apiKey?: string;
  /** API base URL. Defaults to the hosted endpoint. */
  baseURL?: string;
  /** Default model for every call. */
  model?: string;
  /** Inject a fetch implementation (tests, older runtimes). */
  fetch?: typeof fetch;
}

export class TartarusError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TartarusError";
    this.status = status;
  }
}

const DEFAULT_BASE = "https://api.tartarusai.dev/v1";
const DEFAULT_MODEL = "tartarus-coder";

export class TartarusClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly model: string;
  private readonly _fetch: typeof fetch;

  constructor(opts: TartarusOptions = {}) {
    this.apiKey = opts.apiKey ?? globalThis.process?.env?.TARTARUS_TOKEN ?? "";
    if (!this.apiKey) {
      throw new Error("Tartarus: no API key (pass { apiKey } or set TARTARUS_TOKEN).");
    }
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE).replace(/\/+$/, "");
    this.model = opts.model ?? DEFAULT_MODEL;
    this._fetch = opts.fetch ?? globalThis.fetch;
    if (!this._fetch) {
      throw new Error("Tartarus: global fetch not found; use Node 18+ or pass { fetch }.");
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /** A single, non-streaming chat completion. */
  async chat(req: ChatRequest): Promise<ChatResponse> {
    const res = await this._fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, ...req, stream: false }),
    });
    if (!res.ok) throw new TartarusError(res.status, await res.text());
    return (await res.json()) as ChatResponse;
  }

  /** Streaming chat completion: yields each raw chunk as it arrives. */
  async *stream(req: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const res = await this._fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, ...req, stream: true }),
    });
    if (!res.ok) throw new TartarusError(res.status, await res.text());
    if (!res.body) throw new Error("Tartarus: response has no body to stream.");
    for await (const data of parseSSE(res.body)) {
      if (data === "[DONE]") return;
      yield JSON.parse(data) as StreamChunk;
    }
  }

  /** Streaming convenience: yields only the assistant's text deltas. */
  async *streamText(req: ChatRequest): AsyncGenerator<string, void, unknown> {
    for await (const chunk of this.stream(req)) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
