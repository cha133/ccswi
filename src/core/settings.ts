import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  return JSON.parse(content) as ClaudeSettings;
}

/**
 * 写入 ~/.claude/settings.json
 */
export function writeSettings(settings: ClaudeSettings): void {
  const path = claudeSettingsPath();
  writeFileSync(path, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/**
 * 追加 [1m] 后缀（小写！）
 */
function apply1m(model: string, supports1m: boolean): string {
  if (!model) return model;
  // 去掉已有的 [1m] 或 [1M] 后缀，避免重复
  const stripped = model.replace(/\[1[Mm]\]$/, "");
  return supports1m ? `${stripped}[1m]` : stripped;
}

/**
 * 从 profile + 通用配置合成最终的 settings.json
 * 这是核心函数：将 profile 的 provider 字段注入到通用配置中
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
  if (profile.opus) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = apply1m(profile.opus, profile.opus_1m);
  }
  if (profile.sonnet) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = apply1m(profile.sonnet, profile.sonnet_1m);
  }
  if (profile.haiku) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = profile.haiku;
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
 */
export function extractProfileFromSettings(name: string): Profile {
  const settings = readSettings();
  const env = (settings.env ?? {}) as Record<string, string>;

  const token = env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY ?? "";
  const endpoint = env.ANTHROPIC_BASE_URL ?? "";

  const opusParsed = parseModel1m(env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? "");
  const sonnetParsed = parseModel1m(env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? "");
  const haiku = env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? "";

  return {
    name,
    vendor: "",
    endpoint,
    token,
    opus: opusParsed.name,
    opus_1m: opusParsed.has1m,
    sonnet: sonnetParsed.name,
    sonnet_1m: sonnetParsed.has1m,
    haiku,
  };
}
