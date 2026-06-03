/**
 * Claude resource path utilities.
 *
 * Resolves paths for Claude agents/ and skills/ resources in both
 * development and production (packaged) environments.
 *
 * - Development: {projectRoot}/resources/claude
 * - Production:  {process.resourcesPath}/claude
 */

import path from "node:path";
import { app } from "electron";

/**
 * Whether the app is running from a packaged build.
 */
export function isPackaged(): boolean {
  return app.isPackaged;
}

/**
 * Get the root path for Claude resources.
 *
 * Development: resolves to `{cwd}/resources/claude`
 * Production:  resolves to `{resourcesPath}/claude`
 */
export function getClaudeResourcesPath(): string {
  if (isPackaged()) {
    return path.join(process.resourcesPath, "claude");
  }
  return path.join(process.cwd(), "resources", "claude");
}

/**
 * Get the path for Claude agents directory.
 */
export function getClaudeAgentsPath(): string {
  return path.join(getClaudeResourcesPath(), "agents");
}

/**
 * Get the path for Claude skills directory.
 */
export function getClaudeSkillsPath(): string {
  return path.join(getClaudeResourcesPath(), "skills");
}
