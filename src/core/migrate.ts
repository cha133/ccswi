// ============================================================================
// ccswi schema/layout migrations
// ----------------------------------------------------------------------------
// 每次 layout 改变加一个 entry 进 MIGRATIONS 数组。runStartupMigrations() 检查
// 是否有 pending migration（通过探测老 ~/.ccswi/ + 读 XDG config 的 ccswiVersion），
// 跑了之后写 ccswiVersion = CURRENT_VERSION 到新 XDG config。
//
// 跟 package.json version 无关——是 schema/layout 的 version。保留 3 个 ccswi
// 版本后（v6.0.0+）可删除本文件 + ProfilesStore.ccswiVersion 字段 + 调用点 + CCSWI_NO_MIGRATE。
// ============================================================================
import {
  existsSync,
  renameSync,
  rmSync,
  statSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseTOML, stringifyTOML } from "confbox";
import { xdgConfigHome, xdgCacheHome } from "../utils/xdg";
import { profilesTomlPath, ensureCcswiConfigDir } from "../utils/paths";

/** 当前最大支持的 schema version。新 migration 加在 MIGRATIONS 末尾。 */
export const CURRENT_VERSION = 1;

interface Migration {
  version: number;
  /** file-moving / external-state migration */
  run: () => void;
}

/**
 * Pending migrations。runStartupMigrations() 按 version 顺序跑。
 *
 * v3.0.0 首次启用 migrateToXdg（从 ~/.ccswi/ 搬到 XDG root）。3 个版本后（v6.0.0+）
 * 删除整个 MIGRATIONS 数组 + 当前条目 + runStartupMigrations 调用 + CCSWI_NO_MIGRATE env var。
 */
const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    run: () =>
      migrateToXdg({
        oldHome: homedir(),
        newConfigHome: xdgConfigHome(),
        newCacheHome: xdgCacheHome(),
      }),
  },
] as const;

/**
 * 在 ccswi 启动早期跑一次（loadProfiles 头部调）。幂等。
 *
 * 跳过条件：CCSWI_NO_MIGRATE=1 / 没有任何 pending migration。
 */
export function runStartupMigrations(): void {
  if (shouldSkip()) return;
  const configPath = profilesTomlPath();
  const current = readCcswiVersionFromDisk(configPath);
  const target = CURRENT_VERSION;
  if (current >= target) return;

  for (const m of MIGRATIONS) {
    if (current < m.version) {
      try {
        m.run();
      } catch (e) {
        console.error(`⚠ ccswi migration to schema v${m.version} failed: ${(e as Error).message}`);
        return; // 不 bump，下次启动再试
      }
    }
  }
  // 跑成功才 bump version
  bumpCcswiVersionOnDisk(configPath, target);
}

function shouldSkip(): boolean {
  if (process.env.CCSWI_NO_MIGRATE === "1") return true;
  return false;
}

function readCcswiVersionFromDisk(configPath: string): number {
  if (!existsSync(configPath)) return 0;
  try {
    const data = parseTOML(readFileSync(configPath, "utf-8")) as { ccswiVersion?: number };
    return data.ccswiVersion ?? 0;
  } catch {
    return 0;
  }
}

function bumpCcswiVersionOnDisk(configPath: string, version: number): void {
  // 全新 install 还无 config 文件：等首次 saveProfiles 时再带 ccswiVersion
  if (!existsSync(configPath)) return;
  let data: Record<string, unknown>;
  try {
    data = parseTOML(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return; // 解析失败不致命，下个 save 覆盖
  }
  data.ccswiVersion = version;
  ensureCcswiConfigDir();
  const tmp = `${configPath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, stringifyTOML(data), "utf-8");
  renameSync(tmp, configPath);
}

/**
 * 暴露的纯函数版本（paths 注入）——测试用。
 * 生产环境走 runStartupMigrations() 间接调用。
 */
export function migrateToXdg(params: {
  oldHome: string;
  newConfigHome: string;
  newCacheHome: string;
}): void {
  const { oldHome, newConfigHome, newCacheHome } = params;
  const old = join(oldHome, ".ccswi");
  if (!existsSync(old)) return; // 全新安装，无事可做

  // Staging rename：原子（同一 volume），失败时老 dir 不变可重试
  const staging = `${old}.migrating-${process.pid}-${Date.now()}`;
  try {
    renameSync(old, staging);
  } catch (e) {
    throw new Error(`failed to rename ${old} → staging: ${(e as Error).message}`);
  }

  try {
    // profiles.toml
    const oldProfiles = join(staging, "profiles.toml");
    if (existsSync(oldProfiles)) {
      const newDir = join(newConfigHome, "ccswi");
      mkdirSync(newDir, { recursive: true });
      copyFileSync(oldProfiles, join(newDir, "profiles.toml"));
      assertCopyMatches(oldProfiles, join(newDir, "profiles.toml"));
      try {
        parseTOML(readFileSync(join(newDir, "profiles.toml"), "utf-8"));
      } catch (e) {
        throw new Error(`migrated profiles.toml is not valid TOML: ${(e as Error).message}`);
      }
    }

    // common.json
    const oldCommon = join(staging, "common.json");
    if (existsSync(oldCommon)) {
      const newDir = join(newConfigHome, "ccswi");
      mkdirSync(newDir, { recursive: true });
      copyFileSync(oldCommon, join(newDir, "common.json"));
      assertCopyMatches(oldCommon, join(newDir, "common.json"));
      try {
        JSON.parse(readFileSync(join(newDir, "common.json"), "utf-8"));
      } catch (e) {
        throw new Error(`migrated common.json is not valid JSON: ${(e as Error).message}`);
      }
    }

    // models-cache.json
    const oldCache = join(staging, "models-cache.json");
    if (existsSync(oldCache)) {
      const newDir = join(newCacheHome, "ccswi");
      mkdirSync(newDir, { recursive: true });
      copyFileSync(oldCache, join(newDir, "models-cache.json"));
      assertCopyMatches(oldCache, join(newDir, "models-cache.json"));
      try {
        JSON.parse(readFileSync(join(newDir, "models-cache.json"), "utf-8"));
      } catch (e) {
        throw new Error(`migrated models-cache.json is not valid JSON: ${(e as Error).message}`);
      }
    }

    // 全部成功才删 staging
    rmSync(staging, { recursive: true, force: true });
    console.log(`✓ ccswi: migrated ~/.ccswi/ → XDG layout`);
  } catch (e) {
    console.error(`⚠ ccswi XDG migration failed: ${(e as Error).message}`);
    console.error(`  staging copy preserved at ${staging} for manual recovery`);
    console.error(`  to retry: rm -rf ~/.ccswi && mv '${staging}' ~/.ccswi && restart ccswi`);
    // 把 staging 留作 rollback；不 re-throw，让 CLI 继续用空 config 跑
  }
}

function assertCopyMatches(src: string, dst: string): void {
  const s1 = statSync(src).size;
  const s2 = statSync(dst).size;
  if (s1 !== s2) {
    throw new Error(`size mismatch after copy: ${src} (${s1}B) vs ${dst} (${s2}B)`);
  }
}
