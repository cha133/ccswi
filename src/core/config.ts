import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseTOML, stringifyTOML } from "confbox";
import type { ProfilesStore, Profile } from "../types";
import { profilesTomlPath, ensureCcswiDir } from "../utils/paths";

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

  return {
    active: data.active ?? null,
    profiles: data.profiles ?? {},
  };
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
