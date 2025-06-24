import axios from 'axios';

const API_BASE_URL = '';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | any[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  system_prompt_suffix?: string;
  only_n_most_recent_images?: number;
  tool_version?: string;
  max_tokens?: number;
  thinking_budget?: number;
  token_efficient_tools_beta?: boolean;
}

export interface ChatResponse {
  messages: ChatMessage[];
  tool_results: Record<string, any>;
}

export interface StreamEvent {
  type: 'message' | 'tool_use' | 'tool_result' | 'status' | 'done' | 'error' | 'keepalive' | 'text';
  role?: 'assistant';
  content?: string;
  text?: string;
  tool_name?: string;
  tool_input?: any;
  tool_id?: string;
  output?: string;
  error?: string;
  base64_image?: string;
  message?: string;
  messages?: ChatMessage[];
}

export interface JsInspectRequest {
  code: string;
  inspect_data?: Record<string, any>;
  timeout_ms?: number;
  return_type?: string;
}

export interface JsInspectResponse {
  success: boolean;
  result?: any;
  formatted_result?: string;
  result_type?: string;
  execution_time?: number;
  error?: string;
  inspect_data?: Record<string, any>;
}

class ApiClient {
  private client = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 300000, // 5 minutes for long-running operations
  });


  async sendChatStream(
    request: ChatRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<void> {
    const response = await fetch(`/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
          const message = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 2);
          
          if (message.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(message.slice(6));
              onEvent(eventData);
              
              // If we receive 'done', break the loop
              if (eventData.type === 'done') {
                return;
              }
            } catch (e) {
              console.error('Error parsing SSE message:', e, message);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async jsInspect(request: JsInspectRequest): Promise<JsInspectResponse> {
    const response = await this.client.post<JsInspectResponse>('/js-inspect', request);
    return response.data;
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<StreamEvent, void, unknown> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
          const message = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 2);
          
          if (message.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(message.slice(6));
              yield eventData;
              
              // If we receive 'done', break the loop
              if (eventData.type === 'done') {
                return;
              }
            } catch (e) {
              console.error('Error parsing SSE message:', e, message);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const apiClient = new ApiClient();