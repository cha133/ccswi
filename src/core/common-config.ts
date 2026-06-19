import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ClaudeSettings } from "../types";
import { PROVIDER_ENV_KEYS, readSettings } from "./settings";
import { commonConfigPath, ensureCcswiConfigDir } from "../utils/paths";

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
 * 从 $XDG_CONFIG_HOME/ccswi/common.json 加载通用配置
 * 如果不存在，从当前 settings.json 提取
 */
export function loadCommonConfig(): ClaudeSettings {
  const path = commonConfigPath();
  if (!existsSync(path)) {
    return extractAndSaveCommonConfig();
  }
  const content = readFileSync(path, "utf-8");
  try {
    return JSON.parse(content) as ClaudeSettings;
  } catch {
    console.warn("⚠ common.json 格式损坏，将重新从 settings.json 提取");
    return extractAndSaveCommonConfig();
  }
}

/**
 * 保存通用配置到 $XDG_CONFIG_HOME/ccswi/common.json（原子写：tmp + rename）
 */
export function saveCommonConfig(common: ClaudeSettings): void {
  ensureCcswiConfigDir();
  const path = commonConfigPath();
  const tmp = join(tmpdir(), `ccswi-common-${process.pid}-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify(common, null, 2) + "\n", "utf-8");
  renameSync(tmp, path);
}
