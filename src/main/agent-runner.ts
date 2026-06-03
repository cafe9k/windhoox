/**
 * @deprecated This module is deprecated. Analysis is now handled by
 * the Claude Runtime via agent-handlers.ts → createClaudeRuntimeFromConfig().
 *
 * This file is kept temporarily for backward compatibility and will be
 * removed in a future cleanup step.
 */

export async function runLocalAgent(): Promise<never> {
  throw new Error(
    "runLocalAgent is deprecated. Use ClaudeRuntime via agent-handlers.ts instead."
  );
}
