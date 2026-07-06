import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Profile, ClaudeSettings } from "../types";
import { claudeSettingsPath } from "../utils/paths";

/**
 * 读取 ~/.claude/settings.json
 * 如果不存在，返回空对象
 */
export function readSettings(): ClaudeSettings {
  const path = claudeSettingsPath();
  if (!existsSync(path)) {
    return {};
  }
  const content = readFileSync(path, "utf-8");
  try {
    return JSON.parse(content) as ClaudeSettings;
  } catch {
    console.warn("⚠ ~/.claude/settings.json 格式损坏，将按空配置处理");
    return {};
  }
}

/**
 * 写入 ~/.claude/settings.json
 */
export function writeSettings(settings: ClaudeSettings): void {
  const path = claudeSettingsPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/**
 * 在 ~/.claude/settings.json 的 env 中添加/更新一个字段。
 * 下次 switch 时，extractAndSaveCommonConfig 会自然把非 provider 字段从 settings.json 同步到 common.json。
 */
export function setSettingsEnv(key: string, value: string): void {
  const settings = readSettings();
  if (!settings.env) {
    settings.env = {};
  }
  (settings.env as Record<string, string>)[key] = value;
  writeSettings(settings);
}

/**
 * 在 ~/.claude/settings.json 的 permissions.deny 中追加一项（增量写入）。
 * 已存在的 permissions 字段（defaultMode、allow 等）原样保留。
 * 重复追加同一项是 no-op。
 */
export function setSettingsPermissionsDeny(rule: string): void {
  const settings = readSettings();
  const permissions = (settings.permissions ?? {}) as Record<string, unknown>;
  const existing = Array.isArray(permissions.deny)
    ? (permissions.deny as string[])
    : [];
  if (!existing.includes(rule)) existing.push(rule);
  permissions.deny = existing;
  settings.permissions = permissions;
  writeSettings(settings);
}

/**
 * 把 ~/.claude/settings.json 切到 bypassPermissions 模式：
 *   - permissions.defaultMode = "bypassPermissions"
 *   - skipDangerousModePermissionPrompt = true
 * 其它字段（env / permissions.allow / permissions.deny / theme 等）原样保留。
 * 可重复执行，是幂等的。
 */
export function setSettingsBypassPermissions(): void {
  const settings = readSettings();

  // 写入 permissions.defaultMode
  const permissions = (settings.permissions ?? {}) as Record<string, unknown>;
  permissions.defaultMode = "bypassPermissions";
  settings.permissions = permissions;

  // skipDangerousModePermissionPrompt 是 settings.json 根级字段，不在 permissions 里
  settings.skipDangerousModePermissionPrompt = true;

  writeSettings(settings);
}

/**
 * 追加 [1m] 后缀（小写！）
 */
export function apply1m(model: string, supports1m: boolean): string {
  if (!model) return model;
  // 去掉已有的 [1m] 或 [1M] 后缀，避免重复
  const stripped = model.replace(/\[1[Mm]\]$/, "");
  return supports1m ? `${stripped}[1m]` : stripped;
}

/**
 * 从 profile + 通用配置合成最终的 settings.json
 * 这是核心函数：将 profile 的 provider 字段注入到通用配置中
 *
 * v4.0.0+：profile 只带一个 model 字段，但为了兼容 Claude Code 内部以及下游脚本
 * （OpenRouter 集成、用户自写 wrapper 等），把同一个 model 值写到全部四个
 * ANTHROPIC_*_MODEL env slot。
 */
export function buildSettingsFromProfile(
  profile: Profile,
  common: ClaudeSettings,
): ClaudeSettings {
  // 深拷贝通用配置
  const settings: ClaudeSettings = JSON.parse(JSON.stringify(common));

  // 确保 env 对象存在
  if (!settings.env) {
    settings.env = {};
  }

  const env = settings.env as Record<string, string>;

  // 写入 provider 专属字段
  if (profile.endpoint) {
    env.ANTHROPIC_BASE_URL = profile.endpoint;
  }
  if (profile.token) {
    env.ANTHROPIC_AUTH_TOKEN = profile.token;
  }
  if (profile.model) {
    const modelValue = apply1m(profile.model, profile.model_1m);
    env.ANTHROPIC_MODEL = modelValue;
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = modelValue;
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = modelValue;
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = modelValue;
  }

  return settings;
}

/**
 * 需要从 settings.json 中移除的 provider 专属 env var 列表
 */
export const PROVIDER_ENV_KEYS = [
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME",
  "ANTHROPIC_SMALL_FAST_MODEL",
];

/**
 * 从模型名中解析出基础名和 1m 标志
 * 如 "claude-opus-4-8[1m]" → { name: "claude-opus-4-8", has1m: true }
 * 如 "mimo-v2.5-pro[1M]" → { name: "mimo-v2.5-pro", has1m: true }
 * 如 "deepseek-v4-pro" → { name: "deepseek-v4-pro", has1m: false }
 */
function parseModel1m(model: string): { name: string; has1m: boolean } {
  if (!model) return { name: "", has1m: false };
  const match = model.match(/^(.+?)\[1[Mm]\]$/);
  if (match) {
    return { name: match[1]!, has1m: true };
  }
  return { name: model, has1m: false };
}

/**
 * 从当前 settings.json 中提取 provider 字段，生成一个 Profile
 * 这是 buildSettingsFromProfile 的逆操作
 *
 * v4.0.0+：只关心一个 model 字段。读源优先级 opus slot > ANTHROPIC_MODEL >
 * sonnet/haiku slot（最后一个 fallback 是为了照顾手改 settings.json 的极端情况）。
 */
export function extractProfileFromSettings(name: string): Profile {
  const settings = readSettings();
  const env = (settings.env ?? {}) as Record<string, string>;

  const token = env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY ?? "";
  const endpoint = env.ANTHROPIC_BASE_URL ?? "";

  const modelRaw =
    env.ANTHROPIC_DEFAULT_OPUS_MODEL ??
    env.ANTHROPIC_MODEL ??
    env.ANTHROPIC_DEFAULT_SONNET_MODEL ??
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL ??
    "";
  const modelParsed = parseModel1m(modelRaw);

  return {
    name,
    vendor: "",
    endpoint,
    token,
    model: modelParsed.name,
    model_1m: modelParsed.has1m,
  };
}
