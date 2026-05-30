import type { Profile } from "../types";
import { loadProfiles, saveProfiles, setActive } from "./config";
import { extractAndSaveCommonConfig } from "./common-config";
import { buildSettingsFromProfile, writeSettings } from "./settings";

/**
 * 切换到指定 profile
 * 流程：从当前 settings.json 提取通用配置 → 合成新 settings.json → 写入
 * 所有 profile（包括 default）走同一流程
 */
export function switchToProfile(profile: Profile): void {
  // 1. 从当前 settings.json 重新提取通用配置（保留用户手动修改的非 provider 字段）
  const common = extractAndSaveCommonConfig();

  // 2. 用 profile + 通用配置合成最终 settings.json
  const settings = buildSettingsFromProfile(profile, common);

  // 3. 写入 ~/.claude/settings.json
  writeSettings(settings);
}

/**
 * 切换到指定 profile 并更新 active 状态
 */
export function switchToProfileAndUpdateActive(profile: Profile): void {
  switchToProfile(profile);

  // 更新 active 状态
  const store = loadProfiles();
  setActive(store, profile.name);
  saveProfiles(store);
}
