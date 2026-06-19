import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { xdgConfigHome, xdgCacheHome } from "./xdg";

/** ~/.claude/settings.json 路径（Claude Code 自己的，不动） */
export function claudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/** ~/.claude.json 路径（注意：是 home 根目录下，不在 ~/.claude/ 里） */
export function claudeJsonPath(): string {
  return join(homedir(), ".claude.json");
}

/** $XDG_CONFIG_HOME/ccswi/profiles.toml 路径 */
export function profilesTomlPath(): string {
  return join(xdgConfigHome(), "ccswi", "profiles.toml");
}

/** $XDG_CONFIG_HOME/ccswi/common.json 路径 */
export function commonConfigPath(): string {
  return join(xdgConfigHome(), "ccswi", "common.json");
}

/** $XDG_CACHE_HOME/ccswi/models-cache.json 路径 */
export function modelsCachePath(): string {
  return join(xdgCacheHome(), "ccswi", "models-cache.json");
}

/** 确保目录存在 */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** 确保 ccswi config 根目录存在（profiles.toml + common.json 所在） */
export function ensureCcswiConfigDir(): void {
  ensureDir(join(xdgConfigHome(), "ccswi"));
}

/** 确保 ccswi cache 根目录存在（models-cache.json 所在） */
export function ensureCcswiCacheDir(): void {
  ensureDir(join(xdgCacheHome(), "ccswi"));
}

/** @deprecated 用 ensureCcswiConfigDir 替代。保留旧名以不破坏外部 import（如有） */
export function ensureCcswiDir(): void {
  ensureCcswiConfigDir();
}
