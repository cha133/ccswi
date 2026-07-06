import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "smol-toml";
import type { ProfilesStore, Profile } from "../types";
import { profilesTomlPath, ensureCcswiConfigDir } from "../utils/paths";
import { runStartupMigrations, CURRENT_VERSION } from "./migrate";

/**
 * 检测并迁移 main/fast 格式的 profile（main/fast → opus/sonnet/haiku）
 * 用于兼容曾经发布的 2-model 版本的旧配置
 * 返回 true 表示发生了迁移，需要回写文件
 */
function migrateMainFastProfiles(store: ProfilesStore): boolean {
  let migrated = false;
  for (const raw of Object.values(store.profiles)) {
    const p = raw as unknown as Record<string, unknown>;
    // 检测旧字段：存在 main/fast 字段
    if ("main" in p || "fast" in p) {
      const main = (p.main as string) ?? "";
      const main1m = (p.main_1m as boolean) ?? false;
      const fast = (p.fast as string) ?? "";
      const fast1m = (p.fast_1m as boolean) ?? false;

      // opus = main；sonnet = fast（保留 1m 标志）；haiku = fast（也保留 1m 标志）
      p.opus = main;
      p.opus_1m = main1m;
      p.sonnet = fast;
      p.sonnet_1m = fast1m;
      p.haiku = fast;
      p.haiku_1m = fast1m;

      // 删除旧字段
      delete p.main;
      delete p.main_1m;
      delete p.fast;
      delete p.fast_1m;

      migrated = true;
    }
  }
  return migrated;
}

/**
 * 把 opus/sonnet/haiku 三槽位合并成单一 model/model_1m 字段
 * v4.0.0 引入：实际使用中三个槽位几乎从来不会设不同的值，所以砍成一个。
 *
 * 优先级：opus > sonnet > haiku（opus 优先；旧字段缺失时 fallback 到下一个）。
 * 三个值不同时静默取 opus（用户已确认）。
 *
 * 返回 true 表示发生了迁移，需要回写文件。
 * 1–2 周兼容期到了之后可以删掉本函数 + 调用点 + tests/unified-model-migrate.test.ts。
 */
function migrateToUnifiedModel(store: ProfilesStore): boolean {
  let migrated = false;
  for (const p of Object.values(store.profiles)) {
    const raw = p as unknown as Record<string, unknown>;
    // 已经是新格式，跳过
    if ("model" in raw) continue;

    // opus > sonnet > haiku 优先级。opus = "" 视作"未设置"，fallback 到下一档。
    // model_1m 跟 model 同步——只读被选中那一档的 1m flag，避免 opus 缺但 opus_1m 默认 false
    // 把 sonnet_1m=true 这种合理配置盖掉。
    const slots = [
      { name: raw.opus as string | undefined, has1m: raw.opus_1m as boolean | undefined },
      { name: raw.sonnet as string | undefined, has1m: raw.sonnet_1m as boolean | undefined },
      { name: raw.haiku as string | undefined, has1m: raw.haiku_1m as boolean | undefined },
    ];
    const chosen = slots.find((s) => s.name) ?? slots[slots.length - 1]!;
    const model = chosen.name ?? "";
    const model1m = chosen.has1m ?? false;

    raw.model = model;
    raw.model_1m = model1m;

    delete raw.opus;
    delete raw.opus_1m;
    delete raw.sonnet;
    delete raw.sonnet_1m;
    delete raw.haiku;
    delete raw.haiku_1m;

    migrated = true;
  }
  return migrated;
}

const EMPTY_STORE: ProfilesStore = { active: null, profiles: {} };

/**
 * 从 $XDG_CONFIG_HOME/ccswi/profiles.toml 加载所有 profile
 * 如果文件不存在，返回空 store
 *
 * 启动早期会跑一次 schema migrations（v3.0.0+：从 ~/.ccswi/ 搬到 XDG）。
 * Migration 跳过条件见 runStartupMigrations doc。
 */
export function loadProfiles(): ProfilesStore {
  // 1. Schema migrations（XDG 搬移等）。幂等，跳过条件内置。
  runStartupMigrations();

  const path = profilesTomlPath();
  if (!existsSync(path)) {
    return structuredClone(EMPTY_STORE);
  }

  const content = readFileSync(path, "utf-8");
  let data: ProfilesStore;
  try {
    data = parse(content) as unknown as ProfilesStore;
  } catch {
    console.warn("⚠ profiles.toml 格式损坏，将按空配置处理");
    return structuredClone(EMPTY_STORE);
  }

  // 基本校验
  if (!data || typeof data !== "object" || !data.profiles) {
    return structuredClone(EMPTY_STORE);
  }

  const store: ProfilesStore = {
    ccswiVersion: data.ccswiVersion,
    active: data.active ?? null,
    profiles: data.profiles ?? {},
  };

  let needsSave = false;

  // 自动迁移 main/fast 格式 → opus/sonnet/haiku
  if (migrateMainFastProfiles(store)) {
    needsSave = true;
  }

  // 自动迁移 opus/sonnet/haiku → model（v4.0.0+）
  if (migrateToUnifiedModel(store)) {
    needsSave = true;
  }

  if (needsSave) {
    saveProfiles(store);
  }

  return store;
}

/**
 * 保存 profiles 到 $XDG_CONFIG_HOME/ccswi/profiles.toml（原子写：tmp + rename）。
 * 防御性：保证 ccswiVersion = CURRENT_VERSION……
 */
export function saveProfiles(store: ProfilesStore): void {
  ensureCcswiConfigDir();
  if ((store.ccswiVersion ?? 0) < CURRENT_VERSION) {
    store.ccswiVersion = CURRENT_VERSION;
  }
  const path = profilesTomlPath();
  const tmp = join(tmpdir(), `ccswi-profiles-${process.pid}-${Date.now()}.toml`);
  writeFileSync(tmp, stringify(store as unknown as Record<string, unknown>), "utf-8");
  renameSync(tmp, path);
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
