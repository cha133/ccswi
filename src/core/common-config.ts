import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ClaudeSettings } from "../types";
import { PROVIDER_ENV_KEYS, readSettings } from "./settings";
import { commonConfigPath, ensureCcswiDir } from "../utils/paths";

/**
 * 从 settings.json 提取通用配置
 * 移除所有 provider 专属的 env var，保留其余内容
 */
export function extractCommonConfig(settings: ClaudeSettings): ClaudeSettings {
  const common: ClaudeSettings = JSON.parse(JSON.stringify(settings));

  if (common.env) {
    for (const key of PROVIDER_ENV_KEYS) {
      delete (common.env as Record<string, unknown>)[key];
    }
    // 如果 env 变成空对象了，也保留它（用户可能后续添加）
  }

  return common;
}

/**
 * 从当前 settings.json 提取通用配置并保存到 common.json
 * 这是每次切换前都会调用的函数
 */
export function extractAndSaveCommonConfig(): ClaudeSettings {
  const settings = readSettings();
  const common = extractCommonConfig(settings);
  saveCommonConfig(common);
  return common;
}

/**
 * 从 ~/.ccswi/common.json 加载通用配置
 * 如果不存在，从当前 settings.json 提取
 */
export function loadCommonConfig(): ClaudeSettings {
  const path = commonConfigPath();
  if (!existsSync(path)) {
    return extractAndSaveCommonConfig();
  }
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content) as ClaudeSettings;
}

/**
 * 保存通用配置到 ~/.ccswi/common.json
 */
export function saveCommonConfig(common: ClaudeSettings): void {
  ensureCcswiDir();
  writeFileSync(commonConfigPath(), JSON.stringify(common, null, 2) + "\n", "utf-8");
}

/**
 * 在通用配置的 env 中添加/更新字段
 */
export function setCommonEnv(key: string, value: string): void {
  const common = loadCommonConfig();
  if (!common.env) {
    common.env = {};
  }
  (common.env as Record<string, string>)[key] = value;
  saveCommonConfig(common);
}
