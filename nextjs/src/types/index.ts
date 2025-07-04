export type APIProvider = 'anthropic' | 'bedrock' | 'vertex';
export type ToolVersion = 'computer_use_20241022' | 'computer_use_20250124';

export interface AppConfig {
  provider: APIProvider;
  model: string;
  api_key: string;
  only_n_most_recent_images: number;
  custom_system_prompt: string;
  hide_images: boolean;
  token_efficient_tools_beta: boolean;
  tool_version: ToolVersion;
  output_tokens: number;
  thinking_budget: number;
  thinking: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | any[];
}

export interface ToolResult {
  output?: string;
  error?: string;
  base64_image?: string;
}