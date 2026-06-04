import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseTOML, stringifyTOML } from "confbox";
import type { ProfilesStore, Profile } from "../types";
import { profilesTomlPath, ensureCcswiDir } from "../utils/paths";

/**
 * 检测并迁移旧格式的 profile（opus/sonnet/haiku → main/fast）
 * 返回 true 表示发生了迁移，需要回写文件
 */
function migrateOldProfiles(store: ProfilesStore): boolean {
  let migrated = false;
  for (const [key, raw] of Object.entries(store.profiles)) {
    const p = raw as unknown as Record<string, unknown>;
    // 检测旧字段：存在 opus/sonnet/haiku 字段
    if ("opus" in p || "sonnet" in p || "haiku" in p) {
      const opus = (p.opus as string) ?? "";
      const opus1m = (p.opus_1m as boolean) ?? false;
      const sonnet = (p.sonnet as string) ?? "";
      const sonnet1m = (p.sonnet_1m as boolean) ?? false;
      const haiku = (p.haiku as string) ?? "";

      // 主模型 = opus
      p.main = opus;
      p.main_1m = opus1m;
      // 快速模型：优先取 sonnet（如果和 opus 不同），否则取 haiku
      if (sonnet && sonnet !== opus) {
        p.fast = sonnet;
        p.fast_1m = sonnet1m;
      } else {
        p.fast = haiku;
        p.fast_1m = false;
      }

      // 删除旧字段
      delete p.opus;
      delete p.opus_1m;
      delete p.sonnet;
      delete p.sonnet_1m;
      delete p.haiku;

      migrated = true;
    }
  }
  return migrated;
}

const EMPTY_STORE: ProfilesStore = { active: null, profiles: {} };

/**
 * 从 ~/.ccswi/profiles.toml 加载所有 profile
 * 如果文件不存在，返回空 store
 */
export function loadProfiles(): ProfilesStore {
  const path = profilesTomlPath();
  if (!existsSync(path)) {
    return structuredClone(EMPTY_STORE);
  }

  const content = readFileSync(path, "utf-8");
  let data: ProfilesStore;
  try {
    data = parseTOML(content) as ProfilesStore;
  } catch {
    console.warn("⚠ ~/.ccswi/profiles.toml 格式损坏，将按空配置处理");
    return structuredClone(EMPTY_STORE);
  }

  // 基本校验
  if (!data || typeof data !== "object" || !data.profiles) {
    return structuredClone(EMPTY_STORE);
  }

  const store: ProfilesStore = {
    active: data.active ?? null,
    profiles: data.profiles ?? {},
  };

  // 自动迁移旧格式（opus/sonnet/haiku → main/fast）
  if (migrateOldProfiles(store)) {
    saveProfiles(store);
  }

  return store;
}

/**
 * 保存 profiles 到 ~/.ccswi/profiles.toml
 */
export function saveProfiles(store: ProfilesStore): void {
  ensureCcswiDir();
  const content = stringifyTOML(store);
  writeFileSync(profilesTomlPath(), content, "utf-8");
}

/**
 * 获取当前 active 的 profile
 */
export function getActiveProfile(store: ProfilesStore): Profile | null {
  if (!store.active) return null;
  return store.profiles[store.active] ?? null;
}

/**
 * 添加一个新 profile
 */
export function addProfile(store: ProfilesStore, profile: Profile): void {
  if (store.profiles[profile.name]) {
    throw new Error(`Profile "${profile.name}" already exists.`);
  }
  store.profiles[profile.name] = profile;
}

/**
 * 更新已有 profile
 */
export function updateProfile(store: ProfilesStore, profile: Profile): void {
  if (!store.profiles[profile.name]) {
    throw new Error(`Profile "${profile.name}" not found.`);
  }
  store.profiles[profile.name] = profile;
}

/**
 * 删除 profile
 */
export function removeProfile(store: ProfilesStore, name: string): void {
  if (!store.profiles[name]) {
    throw new Error(`Profile "${name}" not found.`);
  }
  delete store.profiles[name];
  // 如果删的是 active，清空 active
  if (store.active === name) {
    store.active = null;
  }
}

/**
 * 设置 active profile
 */
export function setActive(store: ProfilesStore, name: string): void {
  if (!store.profiles[name]) {
    throw new Error(`Profile "${name}" not found.`);
  }
  store.active = name;
}

/**
 * 获取所有 profile 的有序列表（按添加顺序）
 */
export function getProfileEntries(store: ProfilesStore): Array<[string, Profile]> {
  return Object.entries(store.profiles);
}
