export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: Role;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface FunctionDef {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface Tool {
  type: "function";
  function: FunctionDef;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ToolChoice =
  | "auto"
  | "none"
  | { type: "function"; function: { name: string } };

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  tools?: Tool[];
  tool_choice?: ToolChoice;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  choices: ChatChoice[];
  usage?: Usage;
}

export interface StreamDelta {
  role?: Role;
  content?: string;
  tool_calls?: ToolCall[];
}

export interface StreamChunk {
  id: string;
  model: string;
  choices: { index: number; delta: StreamDelta; finish_reason: string | null }[];
}
