import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";

/** ~/.ccsw 目录路径 */
export function ccswDir(): string {
  return join(homedir(), ".ccsw");
}

/** ~/.claude/settings.json 路径 */
export function claudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/** ~/.ccsw/profiles.toml 路径 */
export function profilesTomlPath(): string {
  return join(ccswDir(), "profiles.toml");
}

/** ~/.ccsw/common.json 路径 */
export function commonConfigPath(): string {
  return join(ccswDir(), "common.json");
}

/** ~/.ccsw/models-cache.json 路径 */
export function modelsCachePath(): string {
  return join(ccswDir(), "models-cache.json");
}

/** 确保目录存在 */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** 确保 ccsw 目录存在 */
export function ensureCcswDir(): void {
  ensureDir(ccswDir());
}
