// Session Token Budget
//
// A client-side, heuristic safety net against runaway API usage
// within one chat session - NOT an exact accounting of provider
// credits or billing. Chat completion APIs don't expose remaining
// account credits to the client, so this can't know a real balance;
// what it CAN do is stop the app from silently sending request after
// request once a conversation has clearly gotten long, so a runaway
// loop or an unexpectedly long session doesn't burn through credits
// (or hit a provider's rate limit) with no warning.
//
// Token counts here are estimated via the common ~4 chars/token
// heuristic (English text) - close enough for a soft warning, not
// precise enough to rely on for anything billing-critical.

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Rough sizing rationale: a sustained back-and-forth chat runs maybe
// 300-600 tokens per exchange (prompt + response + conversation
// history now being included - see the history feature this budget
// ships alongside). At that rate, ~40k tokens is roughly 30-60
// minutes of continuous conversation for most people, which matches
// the "should comfortably last a real session" goal without letting
// things run unbounded. These are deliberately round, adjustable
// numbers, not derived from any specific provider's actual limits.
export const SESSION_TOKEN_WARNING = 40_000;
export const SESSION_TOKEN_STOP = 60_000;

export type BudgetStatus = 'ok' | 'warning' | 'stop';

export function classifyBudget(totalEstimatedTokens: number): BudgetStatus {
  if (totalEstimatedTokens >= SESSION_TOKEN_STOP) return 'stop';
  if (totalEstimatedTokens >= SESSION_TOKEN_WARNING) return 'warning';
  return 'ok';
}
