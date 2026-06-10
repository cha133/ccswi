import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";

/** ~/.ccswi 目录路径 */
export function ccswiDir(): string {
  return join(homedir(), ".ccswi");
}

/** ~/.claude/settings.json 路径 */
export function claudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/** ~/.claude.json 路径（注意：是 home 根目录下，不在 ~/.claude/ 里） */
export function claudeJsonPath(): string {
  return join(homedir(), ".claude.json");
}

/** ~/.ccswi/profiles.toml 路径 */
export function profilesTomlPath(): string {
  return join(ccswiDir(), "profiles.toml");
}

/** ~/.ccswi/common.json 路径 */
export function commonConfigPath(): string {
  return join(ccswiDir(), "common.json");
}

/** ~/.ccswi/models-cache.json 路径 */
export function modelsCachePath(): string {
  return join(ccswiDir(), "models-cache.json");
}

/** 确保目录存在 */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** 确保 ccswi 目录存在 */
export function ensureCcswiDir(): void {
  ensureDir(ccswiDir());
}
