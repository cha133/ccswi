// ============================================================================
// XDG migration 测试
// ----------------------------------------------------------------------------
// 验证 ~/.ccswi/ → XDG layout 的搬移逻辑：
//   - profiles.toml 从 ~/.ccswi/ 搬到 $XDG_CONFIG_HOME/ccswi/profiles.toml
//   - common.json 从 ~/.ccswi/ 搬到 $XDG_CONFIG_HOME/ccswi/common.json
//   - models-cache.json 从 ~/.ccswi/ 搬到 $XDG_CACHE_HOME/ccswi/models-cache.json
//   - 老 dir 在成功迁移后被删
//   - 失败时 staging 备份保留
//   - 全新 install（无 ~/.ccswi/）→ no-op
//   - 二进制等大、parse 通过
//
// 隔离：用 migrateToXdg({oldHome, newConfigHome, newCacheHome}) 纯函数，
// oldHome / newConfigHome / newCacheHome 注入 temp dir，碰不到用户真实 home。
// ============================================================================
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import { migrateToXdg, CURRENT_VERSION } from "../src/core/migrate";

// 关掉 XDG migration（这文件就是测 migration 本身的，不能让它 auto-run）
process.env.CCSWI_NO_MIGRATE = "1";

let oldHome: string;
let newXdgRoot: string;
let newConfigHome: string;
let newCacheHome: string;
let savedConfigHome: string | undefined;
let savedCacheHome: string | undefined;
let savedHome: string | undefined;

beforeEach(() => {
  oldHome = mkdtempSync(join(tmpdir(), "ccswi-xdg-old-"));
  newXdgRoot = mkdtempSync(join(tmpdir(), "ccswi-xdg-new-"));
  newConfigHome = join(newXdgRoot, "config");
  newCacheHome = join(newXdgRoot, "cache");

  // 注入 XDG 路径：用 env vars 把 xdgConfigHome/xdgCacheHome 引导到 temp
  savedConfigHome = process.env.XDG_CONFIG_HOME;
  savedCacheHome = process.env.XDG_CACHE_HOME;
  savedHome = process.env.HOME;
  process.env.XDG_CONFIG_HOME = newConfigHome;
  process.env.XDG_CACHE_HOME = newCacheHome;
  // HOME 也要改，因为 migrateToXdg 内部用 homedir() 找 ~/.ccswi/
  // （实际上我们注入 oldHome 参数，所以这里不影响；保险起见也改一下）
  process.env.HOME = oldHome;
});

afterEach(() => {
  if (oldHome) rmSync(oldHome, { recursive: true, force: true });
  if (newXdgRoot) rmSync(newXdgRoot, { recursive: true, force: true });
  if (savedConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = savedConfigHome;
  if (savedCacheHome === undefined) delete process.env.XDG_CACHE_HOME;
  else process.env.XDG_CACHE_HOME = savedCacheHome;
  if (savedHome === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome;
});

describe("migrateToXdg", () => {
  test("全新 install：~/.ccswi/ 不存在 → no-op", () => {
    // 不创建 oldHome/.ccswi
    migrateToXdg({ oldHome, newConfigHome, newCacheHome });
    expect(existsSync(join(newConfigHome, "ccswi"))).toBe(false);
    expect(existsSync(join(newCacheHome, "ccswi"))).toBe(false);
  });

  test("profiles.toml 搬到 XDG_CONFIG_HOME/ccswi/", () => {
    // Arrange: 老的 ~/.ccswi/profiles.toml
    const oldCcswi = join(oldHome, ".ccswi");
    mkdirSync(oldCcswi, { recursive: true });
    const oldProfiles = join(oldCcswi, "profiles.toml");
    writeFileSync(
      oldProfiles,
      `active = "minimax"

[profiles.minimax]
name = "minimax"
vendor = "minimax"
token = "test-token"
opus = "m1"
sonnet = "m2"
haiku = "m3"
`,
    );

    // Act
    migrateToXdg({ oldHome, newConfigHome, newCacheHome });

    // Assert
    const newProfiles = join(newConfigHome, "ccswi", "profiles.toml");
    expect(existsSync(newProfiles)).toBe(true);
    const data = parse(readFileSync(newProfiles, "utf-8")) as unknown as {
      active: string;
      profiles: Record<string, { opus: string; sonnet: string; haiku: string }>;
    };
    expect(data.active).toBe("minimax");
    const profile = data.profiles.minimax!;
    expect(profile.opus).toBe("m1");
    expect(profile.sonnet).toBe("m2");
    expect(profile.haiku).toBe("m3");

    // 老 dir 已被删
    expect(existsSync(oldCcswi)).toBe(false);
  });

  test("common.json 搬到 XDG_CONFIG_HOME/ccswi/", () => {
    // Arrange
    const oldCcswi = join(oldHome, ".ccswi");
    mkdirSync(oldCcswi, { recursive: true });
    const oldCommon = join(oldCcswi, "common.json");
    const commonContent = { env: { FOO: "bar", BAZ: "qux" }, permissions: { allow: [] } };
    writeFileSync(oldCommon, JSON.stringify(commonContent));

    // Act
    migrateToXdg({ oldHome, newConfigHome, newCacheHome });

    // Assert
    const newCommon = join(newConfigHome, "ccswi", "common.json");
    expect(existsSync(newCommon)).toBe(true);
    const data = JSON.parse(readFileSync(newCommon, "utf-8")) as typeof commonContent;
    expect(data.env.FOO).toBe("bar");
    expect(data.env.BAZ).toBe("qux");
    expect(data.permissions.allow).toEqual([]);

    expect(existsSync(oldCcswi)).toBe(false);
  });

  test("models-cache.json 搬到 XDG_CACHE_HOME/ccswi/", () => {
    // Arrange
    const oldCcswi = join(oldHome, ".ccswi");
    mkdirSync(oldCcswi, { recursive: true });
    const oldCache = join(oldCcswi, "models-cache.json");
    const cacheContent = {
      "endpoint|path": { fetchedAt: 1234, source: "endpoint|path", models: ["m1", "m2"] },
    };
    writeFileSync(oldCache, JSON.stringify(cacheContent));

    // Act
    migrateToXdg({ oldHome, newConfigHome, newCacheHome });

    // Assert
    const newCache = join(newCacheHome, "ccswi", "models-cache.json");
    expect(existsSync(newCache)).toBe(true);
    const data = JSON.parse(readFileSync(newCache, "utf-8")) as typeof cacheContent;
    const entry = data["endpoint|path"]!;
    expect(entry.models).toEqual(["m1", "m2"]);
    expect(entry.fetchedAt).toBe(1234);

    expect(existsSync(oldCcswi)).toBe(false);
  });

  test("profiles.toml + common.json + models-cache.json 一起迁", () => {
    // Arrange
    const oldCcswi = join(oldHome, ".ccswi");
    mkdirSync(oldCcswi, { recursive: true });
    writeFileSync(join(oldCcswi, "profiles.toml"), `active = "p1"\n[profiles.p1]\nname = "p1"\n`);
    writeFileSync(join(oldCcswi, "common.json"), `{"env":{}}`);
    writeFileSync(join(oldCcswi, "models-cache.json"), `{}`);

    // Act
    migrateToXdg({ oldHome, newConfigHome, newCacheHome });

    // Assert: 三者都搬了
    expect(existsSync(join(newConfigHome, "ccswi", "profiles.toml"))).toBe(true);
    expect(existsSync(join(newConfigHome, "ccswi", "common.json"))).toBe(true);
    expect(existsSync(join(newCacheHome, "ccswi", "models-cache.json"))).toBe(true);
    expect(existsSync(oldCcswi)).toBe(false);
  });

  test("迁移成功后老 dir 真的被删（不是留 .bak 之类）", () => {
    const oldCcswi = join(oldHome, ".ccswi");
    mkdirSync(oldCcswi, { recursive: true });
    writeFileSync(join(oldCcswi, "profiles.toml"), `active = ""\n[profiles]\n`);

    migrateToXdg({ oldHome, newConfigHome, newCacheHome });

    expect(existsSync(oldCcswi)).toBe(false);
    // staging 也不留
    const leftovers = readdirSync(oldHome).filter((n) => n.startsWith(".ccswi"));
    expect(leftovers).toEqual([]);
  });

  test("profiles.toml 内容字节级一致", () => {
    const oldCcswi = join(oldHome, ".ccswi");
    mkdirSync(oldCcswi, { recursive: true });
    const content = `active = "minimax"\n\n[profiles.minimax]\nname = "minimax"\nvendor = ""\nendpoint = "http://x"\ntoken = "tok"\nopus = "m1"\nopus_1m = false\nsonnet = "m2"\nsonnet_1m = false\nhaiku = "m3"\nhaiku_1m = false\n`;
    writeFileSync(join(oldCcswi, "profiles.toml"), content);

    migrateToXdg({ oldHome, newConfigHome, newCacheHome });

    const newContent = readFileSync(join(newConfigHome, "ccswi", "profiles.toml"), "utf-8");
    expect(newContent).toBe(content);
  });
});

describe("runStartupMigrations invariants", () => {
  // 验证 migration 系统的 "self-evidence" 约束：
  // - CURRENT_VERSION 必须 >= 1（ccswiVersion 字段有语义值）
  // 注：runStartupMigrations 内部用 homedir()，要测它必须 mock OS——留给 manual
  // smoke test 覆盖（见 plan §Verification 的「老用户迁移」段）。

  test("CURRENT_VERSION 必须 >= 1（保证 ccswiVersion 字段有值）", () => {
    expect(CURRENT_VERSION).toBeGreaterThanOrEqual(1);
  });
});
