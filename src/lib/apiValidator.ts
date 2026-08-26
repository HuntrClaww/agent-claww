export interface ValidationResult {
  isValid: boolean;
  provider?: string;
  message: string;
  error?: string;
}

export async function validateAPIKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || !apiKey.trim()) {
    return {
      isValid: false,
      message: 'API key is empty.',
    };
  }

  // Anthropic key format
  if (apiKey.startsWith('sk-ant-')) {
    return await validateAnthropicKey(apiKey);
  }

  // OpenAI key format
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
    return await validateOpenAIKey(apiKey);
  }

  // Gemini key format (usually longer)
  if (apiKey.length > 30) {
    return await validateGeminiKey(apiKey);
  }

  return {
    isValid: false,
    message: 'API key format not recognized. Make sure it\'s correctly copied.',
  };
}

async function validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'test',
          },
        ],
      }),
    });

    if (response.ok) {
      return {
        isValid: true,
        provider: 'anthropic',
        message: '✅ Anthropic API key is valid and working.',
      };
    }

    if (response.status === 401) {
      return {
        isValid: false,
        provider: 'anthropic',
        message: '❌ Anthropic API key is invalid or expired.',
        error: 'Unauthorized',
      };
    }

    if (response.status === 429) {
      return {
        isValid: true,
        provider: 'anthropic',
        message: '✅ Anthropic key is valid (rate limited). Try again in a moment.',
      };
    }

    const errorData = await response.json();
    return {
      isValid: false,
      provider: 'anthropic',
      message: `❌ Anthropic API Error: ${errorData.error?.message || 'Unknown error'}`,
      error: errorData.error?.message,
    };
  } catch (err) {
    return {
      isValid: false,
      provider: 'anthropic',
      message: '❌ Failed to connect to Anthropic API. Check your internet connection.',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return {
        isValid: true,
        provider: 'openai',
        message: '✅ OpenAI API key is valid and working.',
      };
    }

    if (response.status === 401) {
      return {
        isValid: false,
        provider: 'openai',
        message: '❌ OpenAI API key is invalid or expired.',
        error: 'Unauthorized',
      };
    }

    const errorData = await response.json();
    return {
      isValid: false,
      provider: 'openai',
      message: `❌ OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`,
      error: errorData.error?.message,
    };
  } catch (err) {
    return {
      isValid: false,
      provider: 'openai',
      message: '❌ Failed to connect to OpenAI API. Check your internet connection.',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

async function validateGeminiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro?key=${apiKey}`,
      {
        method: 'GET',
      }
    );

    if (response.ok) {
      return {
        isValid: true,
        provider: 'gemini',
        message: '✅ Google Gemini API key is valid and working.',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        isValid: false,
        provider: 'gemini',
        message: '❌ Google Gemini API key is invalid or expired.',
        error: 'Unauthorized',
      };
    }

    const errorData = await response.json();
    return {
      isValid: false,
      provider: 'gemini',
      message: `❌ Google Gemini API Error: ${errorData.error?.message || 'Unknown error'}`,
      error: errorData.error?.message,
    };
  } catch (err) {
    return {
      isValid: false,
      provider: 'gemini',
      message: '❌ Failed to connect to Google Gemini API. Check your internet connection.',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
