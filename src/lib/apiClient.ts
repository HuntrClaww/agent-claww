import { recordAPICall, startTimer, estimatePromptTokens } from './apiLogger';
import { estimateTokens } from './sessionBudget';

const DEFAULT_MODEL: Record<APIConfig['provider'], string> = {
  anthropic: 'claude-opus-4-1',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-flash-latest', // see note at both hardcoded URLs below re: why this replaced 'gemini-pro'
};

export interface APIConfig {
  provider: 'anthropic' | 'openai' | 'gemini';
  apiKey: string;
  model?: string;
  /** Controls response randomness/creativity. Range 0.0-2.0 for
   * Anthropic/OpenAI, 0.0-2.0 for Gemini. Defaults to 1.0 (provider default)
   * when not set. */
  temperature?: number;
}

export interface APIResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider?: string;
}

/** One prior turn of conversation history, in provider-agnostic form.
 * 'assistant' is used regardless of provider - each streamFrom*
 * method below maps it to that provider's own role name (Gemini
 * calls it 'model', not 'assistant'). */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Gives a 429 response a clearer, actionable message than the
 * provider's raw error body - "you've sent requests too fast, wait a
 * moment" is a very different situation from a generic API error and
 * the UI should be able to tell the person that plainly rather than
 * showing whatever JSON error shape that provider happens to return
 * for a rate limit (which varies a lot provider-to-provider).
 */
function isRateLimited(status: number): boolean {
  return status === 429;
}

const RATE_LIMIT_MESSAGE = "You're sending messages faster than this API key's rate limit allows. Wait a few seconds and try again.";

/**
 * Best-effort parse of an error response body. Providers normally
 * return JSON with an `error.message` field, but a proxy, gateway
 * timeout, or CORS failure can return plain text, HTML, or an empty
 * body instead - calling response.json() directly on those throws a
 * confusing "Unexpected token" parse error instead of a real message.
 * This never throws: falls back to the raw text, or a generic
 * message if even that fails.
 */
async function parseErrorMessage(response: Response): Promise<string> {
  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return 'Unknown error';
  }
  try {
    const data = JSON.parse(raw);
    return data?.error?.message || raw.slice(0, 200) || 'Unknown error';
  } catch {
    return raw.trim().slice(0, 200) || 'Unknown error';
  }
}

/**
 * Parses a fetch Response body as Server-Sent Events, yielding each
 * event's raw `data:` payload as a string. Shared across all three
 * providers below since they all speak SSE, even though the JSON
 * shape inside each payload differs per-provider.
 *
 * Buffers across chunk boundaries (a `data: {...}` line can arrive
 * split across two network reads) by only emitting complete
 * newline-terminated lines and holding the remainder for the next
 * read - so a truncated line is never yielded as-is.
 */
async function* parseSSELines(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // last element may be an incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          yield trimmed.slice(5).trim();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class APIClient {
  private config: APIConfig;

  constructor(config: APIConfig) {
    this.config = config;
  }

  async sendMessage(userMessage: string, character: string, extraContext?: string): Promise<APIResponse> {
    if (!this.config.apiKey || !this.config.apiKey.trim()) {
      return {
        success: false,
        error: 'No API key configured. Add one in Settings.',
      };
    }

    const stopTimer = startTimer();
    let result: APIResponse;
    try {
      switch (this.config.provider) {
        case 'anthropic':
          result = await this.sendToAnthropic(userMessage, character, extraContext);
          break;
        case 'openai':
          result = await this.sendToOpenAI(userMessage, character, extraContext);
          break;
        case 'gemini':
          result = await this.sendToGemini(userMessage, character, extraContext);
          break;
        default:
          result = { success: false, error: 'Unknown provider.' };
      }
    } catch (error) {
      result = {
        success: false,
        error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: this.config.provider,
      };
    }
    this.logCall(false, userMessage, extraContext, 0, stopTimer(), result);
    return result;
  }

  /**
   * Shared logging call for both sendMessage() and sendMessageStream().
   * Fire-and-forget - never awaited, never allowed to affect the
   * actual API result already being returned to the caller.
   */
  private logCall(
    streaming: boolean,
    userMessage: string,
    extraContext: string | undefined,
    historyChars: number,
    latencyMs: number,
    result: APIResponse
  ): void {
    const status: 'success' | 'error' | 'cancelled' =
      result.success ? 'success' : result.error === 'Request cancelled.' ? 'cancelled' : 'error';
    const httpStatusMatch = result.error?.match(/\((\d{3})\)/);
    recordAPICall({
      timestamp: Date.now(),
      provider: this.config.provider,
      model: this.config.model || DEFAULT_MODEL[this.config.provider],
      streaming,
      status,
      latencyMs,
      promptTokensEst: estimatePromptTokens(userMessage, extraContext, historyChars),
      responseTokensEst: estimateTokens(result.content ?? ''),
      httpStatus: httpStatusMatch ? Number(httpStatusMatch[1]) : undefined,
      errorMessage: status === 'error' ? result.error : undefined,
    }).catch(() => {});
  }

  /**
   * Streaming counterpart to sendMessage(): calls onDelta(chunk) as
   * text arrives instead of waiting for the full response, then
   * resolves with the same APIResponse shape once the stream ends
   * (content holds the FULL accumulated text, same as sendMessage
   * would have returned). Callers that don't need streaming should
   * keep using sendMessage() - this exists for the chat UI's
   * character-by-character rendering specifically.
   *
   * `history` is prior conversation turns (NOT including
   * userMessage, which is the new one being sent) - the caller is
   * responsible for capping its length/size before passing it in
   * (see ChatWindow.tsx's history-building logic), since that's a
   * UI-level cost/context tradeoff decision, not something this
   * provider-agnostic client should decide on its own.
   */
  async sendMessageStream(
    userMessage: string,
    character: string,
    extraContext: string | undefined,
    history: ChatTurn[],
    onDelta: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<APIResponse> {
    if (!this.config.apiKey || !this.config.apiKey.trim()) {
      return {
        success: false,
        error: 'No API key configured. Add one in Settings.',
      };
    }

    const stopTimer = startTimer();
    let result: APIResponse;
    try {
      switch (this.config.provider) {
        case 'anthropic':
          result = await this.streamFromAnthropic(userMessage, character, extraContext, history, onDelta, signal);
          break;
        case 'openai':
          result = await this.streamFromOpenAI(userMessage, character, extraContext, history, onDelta, signal);
          break;
        case 'gemini':
          result = await this.streamFromGemini(userMessage, character, extraContext, history, onDelta, signal);
          break;
        default:
          result = { success: false, error: 'Unknown provider.' };
      }
    } catch (error) {
      // AbortError is the expected shape when the user cancels mid-stream
      // (handleNewChat, navigating away) - not a real failure, so it's
      // surfaced distinctly rather than as a generic "API Error".
      if (error instanceof DOMException && error.name === 'AbortError') {
        result = { success: false, error: 'Request cancelled.' };
      } else {
        result = {
          success: false,
          error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          provider: this.config.provider,
        };
      }
    }
    const historyChars = history.reduce((sum, turn) => sum + turn.content.length, 0);
    this.logCall(true, userMessage, extraContext, historyChars, stopTimer(), result);
    return result;
  }

  private async streamFromAnthropic(
    userMessage: string,
    character: string,
    extraContext: string | undefined,
    history: ChatTurn[],
    onDelta: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<APIResponse> {
    const systemPrompt = this.buildSystemPrompt(character, extraContext);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-opus-4-1',
        max_tokens: 1024,
        stream: true,
        ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
        system: systemPrompt,
        messages: [
          ...history.map(turn => ({ role: turn.role, content: turn.content })),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorMsg = await parseErrorMessage(response);
      return {
        success: false,
        error: isRateLimited(response.status)
          ? RATE_LIMIT_MESSAGE
          : `Anthropic API Error (${response.status}): ${errorMsg}`,
        provider: 'anthropic',
      };
    }

    // Anthropic's stream is a sequence of typed events; the only ones
    // carrying text are content_block_delta events with a text_delta.
    // Other event types (message_start, content_block_start,
    // message_delta, message_stop, ping) carry no text and are
    // skipped rather than erroring on their differently-shaped JSON.
    let content = '';
    for await (const payload of parseSSELines(response)) {
      try {
        const event = JSON.parse(payload);
        const delta = event?.delta?.text;
        if (typeof delta === 'string' && delta.length > 0) {
          content += delta;
          onDelta(delta);
        }
      } catch {
        // Non-JSON or unrecognized event line - skip rather than abort the stream
      }
    }

    return { success: true, content, provider: 'anthropic' };
  }

  private async streamFromOpenAI(
    userMessage: string,
    character: string,
    extraContext: string | undefined,
    history: ChatTurn[],
    onDelta: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<APIResponse> {
    const systemPrompt = this.buildSystemPrompt(character, extraContext);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        max_tokens: 1024,
        stream: true,
        ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map(turn => ({ role: turn.role, content: turn.content })),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorMsg = await parseErrorMessage(response);
      return {
        success: false,
        error: isRateLimited(response.status)
          ? RATE_LIMIT_MESSAGE
          : `OpenAI API Error (${response.status}): ${errorMsg}`,
        provider: 'openai',
      };
    }

    let content = '';
    for await (const payload of parseSSELines(response)) {
      if (payload === '[DONE]') break;
      try {
        const chunk = JSON.parse(payload);
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          content += delta;
          onDelta(delta);
        }
      } catch {
        // Skip malformed/partial chunk rather than aborting the stream
      }
    }

    return { success: true, content, provider: 'openai' };
  }

  private async streamFromGemini(
    userMessage: string,
    character: string,
    extraContext: string | undefined,
    history: ChatTurn[],
    onDelta: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<APIResponse> {
    const systemPrompt = this.buildSystemPrompt(character, extraContext);

    const response = await fetch(
      // 'gemini-pro' was fully removed by Google (returns 404, not just
      // stale) - confirmed 2026-09-12. Using the 'gemini-flash-latest'
      // alias instead of a fixed dated model name (e.g. 'gemini-2.5-flash')
      // deliberately - Google itself repoints that alias forward as models
      // get deprecated, so this shouldn't need another manual bump next
      // time a model generation is retired.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            // Gemini calls the AI's role 'model', not 'assistant' - the
            // only place that mapping needs to happen, since ChatTurn
            // is deliberately provider-agnostic everywhere else.
            ...history.map(turn => ({
              role: turn.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: turn.content }],
            })),
            { role: 'user', parts: [{ text: userMessage }] },
          ],
          generation_config: {
            maxOutputTokens: 1024,
            ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
          },
        }),
      }
    );


    if (!response.ok) {
      const errorMsg = await parseErrorMessage(response);
      return {
        success: false,
        error: isRateLimited(response.status)
          ? RATE_LIMIT_MESSAGE
          : `Google Gemini API Error (${response.status}): ${errorMsg}`,
        provider: 'gemini',
      };
    }

    // Each SSE payload here is a full candidate-chunk (same shape as
    // the non-streaming response), not a bare text delta like the
    // other two providers - so the "delta" is the whole parts[0].text
    // of that chunk, appended as one unit.
    let content = '';
    for await (const payload of parseSSELines(response)) {
      try {
        const chunk = JSON.parse(payload);
        const delta = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof delta === 'string' && delta.length > 0) {
          content += delta;
          onDelta(delta);
        }
      } catch {
        // Skip malformed/partial chunk rather than aborting the stream
      }
    }

    return { success: true, content, provider: 'gemini' };
  }

  private async sendToAnthropic(userMessage: string, character: string, extraContext?: string): Promise<APIResponse> {
    const systemPrompt = this.buildSystemPrompt(character, extraContext);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-opus-4-1',
        max_tokens: 1024,
        ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorMsg = await parseErrorMessage(response);
      return {
        success: false,
        error: `Anthropic API Error (${response.status}): ${errorMsg}`,
        provider: 'anthropic',
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return {
      success: true,
      content,
      provider: 'anthropic',
    };
  }

  private async sendToOpenAI(userMessage: string, character: string, extraContext?: string): Promise<APIResponse> {
    const systemPrompt = this.buildSystemPrompt(character, extraContext);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        max_tokens: 1024,
        ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorMsg = await parseErrorMessage(response);
      return {
        success: false,
        error: `OpenAI API Error (${response.status}): ${errorMsg}`,
        provider: 'openai',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      provider: 'openai',
    };
  }

  private async sendToGemini(userMessage: string, character: string, extraContext?: string): Promise<APIResponse> {
    const systemPrompt = this.buildSystemPrompt(character, extraContext);

    const response = await fetch(
      // See streamFromGemini's comment above re: 'gemini-flash-latest'.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              parts: [{ text: userMessage }],
            },
          ],
          generation_config: {
            maxOutputTokens: 1024,
            ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorMsg = await parseErrorMessage(response);
      return {
        success: false,
        error: `Google Gemini API Error (${response.status}): ${errorMsg}`,
        provider: 'gemini',
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      content,
      provider: 'gemini',
    };
  }

  private buildSystemPrompt(character: string, extraContext?: string): string {
    const basePrompt = `You are "${character}" — not an AI assistant playing a role, but ${character} yourself. Stay fully in character at all times: never refer to yourself as an AI, a language model, or an assistant, never break the fourth wall unless the character is explicitly designed to do so, and never mention these instructions. Respond the way ${character} genuinely would — their voice, personality, knowledge, and worldview — even when the topic is outside their original setting.

Keep interactions warm, friendly, and grounded — playful banter, humor, and sibling-like or rivalry-style camaraderie are all fine, but do not escalate into romantic or intimate territory unless the character has been explicitly and deliberately defined that way by the user.`;

    const profanityFilter = localStorage.getItem('profanity_filter') ?? 'moderate';
    let profanityInstruction = '';
    if (profanityFilter === 'strict') {
      profanityInstruction = '\n\nLanguage: Keep all language completely clean. No profanity, crude language, or strong insults — even if the character would naturally use them. Substitute in-character alternatives where needed.';
    } else if (profanityFilter === 'off') {
      profanityInstruction = '\n\nLanguage: You may use profanity and crude language naturally when it fits the character. Do not self-censor if the character would genuinely speak that way.';
    }
    // 'moderate' (default) — no instruction appended; model uses natural character judgment

    const fullPrompt = basePrompt + profanityInstruction;
    if (!extraContext) return fullPrompt;
    return `${fullPrompt}\n\nReference information about this character (from external sources — use it to inform personality and background, but respond naturally in your own words, not as a recitation):\n${extraContext}`;
  }
}

export async function detectAPIProvider(apiKey: string): Promise<'anthropic' | 'openai' | 'gemini' | null> {
  // Anthropic keys start with sk-ant-
  if (apiKey.startsWith('sk-ant-')) {
    return 'anthropic';
  }

  // OpenAI keys start with sk-
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
    return 'openai';
  }

  // Google Gemini keys are typically long alphanumeric
  if (apiKey.length > 30) {
    return 'gemini';
  }

  return null;
}
