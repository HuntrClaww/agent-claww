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

    try {
      switch (this.config.provider) {
        case 'anthropic':
          return await this.sendToAnthropic(userMessage, character, extraContext);
        case 'openai':
          return await this.sendToOpenAI(userMessage, character, extraContext);
        case 'gemini':
          return await this.sendToGemini(userMessage, character, extraContext);
        default:
          return {
            success: false,
            error: 'Unknown provider.',
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: this.config.provider,
      };
    }
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
      const errorData = await response.json();
      return {
        success: false,
        error: `Anthropic API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`,
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
      const errorData = await response.json();
      return {
        success: false,
        error: `OpenAI API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`,
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.apiKey}`,
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
      const errorData = await response.json();
      return {
        success: false,
        error: `Google Gemini API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`,
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
    if (!extraContext) return basePrompt;
    return `${basePrompt}\n\nReference information about this character (from external sources — use it to inform personality and background, but respond naturally in your own words, not as a recitation):\n${extraContext}`;
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
