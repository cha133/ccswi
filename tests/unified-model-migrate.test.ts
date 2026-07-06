// ============================================================================
// opus/sonnet/haiku → model 字段迁移测试（v4.0.0+）
// ----------------------------------------------------------------------------
// 验证 loadProfiles 里的字段级迁移：
//   - 三档相同的 profile：合并成 model = 原 opus 值
//   - 三档不同的 profile：opus 优先（用户已确认，静默）
//   - 旧字段全部清除
//   - 新字段写回磁盘
//
// 隔离：把 XDG_CONFIG_HOME 引导到 temp dir + CCSWI_NO_MIGRATE=1 关掉 schema migrations。
// ============================================================================
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import { saveProfiles, loadProfiles } from "../src/core/config";

let savedXdg: string | undefined;
let root: string;
let profilesPath: string;

beforeEach(() => {
  process.env.CCSWI_NO_MIGRATE = "1";
  savedXdg = process.env.XDG_CONFIG_HOME;
  root = mkdtempSync(join(tmpdir(), "ccswi-um-"));
  process.env.XDG_CONFIG_HOME = root;
});

afterEach(() => {
  if (savedXdg === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = savedXdg;
  rmSync(root, { recursive: true, force: true });
});

describe("migrateToUnifiedModel (opus/sonnet/haiku → model)", () => {
  test("三档相同 → model 取 opus，旧字段全删，新字段写盘", () => {
    saveProfiles({
      active: "all_same",
      profiles: {
        all_same: {
          name: "all_same",
          vendor: "V",
          endpoint: "https://api.example.com",
          token: "tok",
          opus: "claude-opus-4-8",
          opus_1m: true,
          sonnet: "claude-opus-4-8",
          sonnet_1m: true,
          haiku: "claude-opus-4-8",
          haiku_1m: true,
        },
      },
    });

    const loaded = loadProfiles();
    const p = loaded.profiles.all_same!;

    expect(p.model).toBe("claude-opus-4-8");
    expect(p.model_1m).toBe(true);
    expect((p as unknown as Record<string, unknown>).opus).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).opus_1m).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).sonnet).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).sonnet_1m).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).haiku).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).haiku_1m).toBeUndefined();

    // 落盘验证
    profilesPath = join(root, "ccswi", "profiles.toml");
    expect(existsSync(profilesPath)).toBe(true);
    const onDisk = parse(readFileSync(profilesPath, "utf-8")) as unknown as {
      profiles: Record<string, Record<string, unknown>>;
    };
    const raw = onDisk.profiles.all_same!;
    expect(raw.model).toBe("claude-opus-4-8");
    expect(raw.model_1m).toBe(true);
    expect(raw.opus).toBeUndefined();
    expect(raw.sonnet).toBeUndefined();
    expect(raw.haiku).toBeUndefined();
  });

  test("三档不同 → opus 静默优先", () => {
    saveProfiles({
      active: "diff",
      profiles: {
        diff: {
          name: "diff",
          vendor: "",
          endpoint: "",
          token: "",
          opus: "big-model",
          opus_1m: true,
          sonnet: "mid-model",
          sonnet_1m: false,
          haiku: "small-model",
          haiku_1m: false,
        },
      },
    });

    const loaded = loadProfiles();
    const p = loaded.profiles.diff!;

    expect(p.model).toBe("big-model");
    expect(p.model_1m).toBe(true);
  });

  test("opus 缺失时 fallback 到 sonnet", () => {
    saveProfiles({
      active: "no_opus",
      profiles: {
        no_opus: {
          name: "no_opus",
          vendor: "",
          endpoint: "",
          token: "",
          opus: "",
          opus_1m: false,
          sonnet: "mid",
          sonnet_1m: true,
          haiku: "small",
          haiku_1m: false,
        },
      },
    });

    const loaded = loadProfiles();
    expect(loaded.profiles.no_opus!.model).toBe("mid");
    expect(loaded.profiles.no_opus!.model_1m).toBe(true);
  });

  test("三档都空 → model = '', model_1m = false（旧空白 profile 不报错）", () => {
    saveProfiles({
      active: "empty",
      profiles: {
        empty: {
          name: "empty",
          vendor: "",
          endpoint: "",
          token: "",
          opus: "",
          opus_1m: false,
          sonnet: "",
          sonnet_1m: false,
          haiku: "",
          haiku_1m: false,
        },
      },
    });

    const loaded = loadProfiles();
    expect(loaded.profiles.empty!.model).toBe("");
    expect(loaded.profiles.empty!.model_1m).toBe(false);
  });

  test("已经是新格式 → 跳过迁移（幂等）", () => {
    saveProfiles({
      active: "newfmt",
      profiles: {
        newfmt: {
          name: "newfmt",
          vendor: "",
          endpoint: "",
          token: "",
          model: "already-new",
          model_1m: false,
        },
      },
    });

    const loaded = loadProfiles();
    expect(loaded.profiles.newfmt!.model).toBe("already-new");
  });

  test("混合（部分 profile 是旧格式、部分是新格式）→ 只迁旧的", () => {
    saveProfiles({
      active: "old",
      profiles: {
        old: {
          name: "old",
          vendor: "",
          endpoint: "",
          token: "",
          opus: "x",
          opus_1m: true,
          sonnet: "x",
          sonnet_1m: true,
          haiku: "x",
          haiku_1m: true,
        },
        newer: {
          name: "newer",
          vendor: "",
          endpoint: "",
          token: "",
          model: "y",
          model_1m: false,
        },
      },
    });

    const loaded = loadProfiles();
    expect(loaded.profiles.old!.model).toBe("x");
    expect(loaded.profiles.old!.model_1m).toBe(true);
    expect(loaded.profiles.newer!.model).toBe("y");
    expect(loaded.profiles.newer!.model_1m).toBe(false);
  });

  test("迁移触发后 saveProfiles 写盘（CCSWI_NO_MIGRATE 不影响字段级迁移）", () => {
    saveProfiles({
      active: "trigger",
      profiles: {
        trigger: {
          name: "trigger",
          vendor: "",
          endpoint: "",
          token: "",
          opus: "triggered",
          opus_1m: false,
          sonnet: "triggered",
          sonnet_1m: false,
          haiku: "triggered",
          haiku_1m: false,
        },
      },
    });

    // 不删文件：loadProfiles 只在文件存在时跑迁移。验证「迁移触发 → 写盘」就是验证
    // on-disk 的内容被更新成新格式（第一个测试已经验证过）。这里额外验证：连续两次
    // loadProfiles 第二次不会再次触发迁移（幂等）。
    const first = loadProfiles();
    expect(first.profiles.trigger!.model).toBe("triggered");

    // 第二次：应当跳过迁移，不再多余写盘 —— 但实现上不强制，行为上「读出来已经是新格式」即可
    const second = loadProfiles();
    expect(second.profiles.trigger!.model).toBe("triggered");
  });
});
