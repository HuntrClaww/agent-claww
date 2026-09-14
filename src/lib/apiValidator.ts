export interface ValidationResult {
  isValid: boolean;
  provider?: string;
  message: string;
  error?: string;
}

// Shared with apiClient.ts's own provider calls - reads an error body as
// text first and only tries JSON on top of that, so a non-JSON error body
// (gateway timeout page, proxy/CORS failure, empty body) can't throw here.
// Each validate*Key() below used to call response.json() directly on a
// non-ok response; a malformed body would throw, land in that function's
// outer catch, and report "failed to connect / check your internet
// connection" even when the real issue was a bad key with an odd error
// page - misleading, not a crash, but worth fixing since apiClient.ts
// already fixed this exact bug class (Known Issue, Completed Items #141)
// and this sibling file was never included in that pass.
import { parseErrorMessage } from './apiClient';

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

  // OpenRouter key format (sk-or-v1-...) - checked before the generic
  // sk- OpenAI fallback below, since OpenRouter's prefix is itself a
  // superset of "sk-".
  if (apiKey.startsWith('sk-or-')) {
    return await validateOpenRouterKey(apiKey);
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

    const errorMsg = await parseErrorMessage(response);
    return {
      isValid: false,
      provider: 'anthropic',
      message: `❌ Anthropic API Error: ${errorMsg}`,
      error: errorMsg,
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

    const errorMsg = await parseErrorMessage(response);
    return {
      isValid: false,
      provider: 'openai',
      message: `❌ OpenAI API Error: ${errorMsg}`,
      error: errorMsg,
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

async function validateOpenRouterKey(apiKey: string): Promise<ValidationResult> {
  try {
    // OpenRouter's dedicated key-info endpoint - built specifically for
    // checking whether a key is valid (and its current limits/usage),
    // rather than piggybacking on /models which doesn't require auth
    // and so wouldn't actually prove the key works.
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return {
        isValid: true,
        provider: 'openrouter',
        message: '✅ OpenRouter API key is valid and working.',
      };
    }

    if (response.status === 401) {
      return {
        isValid: false,
        provider: 'openrouter',
        message: '❌ OpenRouter API key is invalid or expired.',
        error: 'Unauthorized',
      };
    }

    const errorMsg = await parseErrorMessage(response);
    return {
      isValid: false,
      provider: 'openrouter',
      message: `❌ OpenRouter API Error: ${errorMsg}`,
      error: errorMsg,
    };
  } catch (err) {
    return {
      isValid: false,
      provider: 'openrouter',
      message: '❌ Failed to connect to OpenRouter API. Check your internet connection.',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

async function validateGeminiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch(
      // Matches the model used in apiClient.ts's sendToGemini/streamFromGemini
      // - see the comment there for why 'gemini-pro' (removed by Google,
      // returns 404) was replaced with the 'gemini-flash-latest' alias.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest?key=${apiKey}`,
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

    const errorMsg = await parseErrorMessage(response);
    return {
      isValid: false,
      provider: 'gemini',
      message: `❌ Google Gemini API Error: ${errorMsg}`,
      error: errorMsg,
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
