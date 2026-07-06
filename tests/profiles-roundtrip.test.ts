import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveProfiles, loadProfiles } from "../src/core/config";

let savedXdg: string | undefined;
let root: string;

beforeEach(() => {
  // 关掉 startup migrations：loadProfiles 会调它，但我们只测 round-trip 本身
  process.env.CCSWI_NO_MIGRATE = "1";
  savedXdg = process.env.XDG_CONFIG_HOME;
  root = mkdtempSync(join(tmpdir(), "ccswi-rtrip-"));
  process.env.XDG_CONFIG_HOME = root;
});

afterEach(() => {
  if (savedXdg === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = savedXdg;
  rmSync(root, { recursive: true, force: true });
});

describe("profiles.toml round-trip", () => {
  test("basic profile save → load preserves all fields", () => {
    saveProfiles({
      ccswiVersion: 1,
      active: "minimax",
      profiles: {
        minimax: {
          name: "minimax",
          vendor: "Minimax",
          endpoint: "https://api.example.com",
          token: "sk-test",
          model: "m1",
          model_1m: true,
        },
      },
    });
    const loaded = loadProfiles();
    expect(loaded.active).toBe("minimax");
    expect(loaded.ccswiVersion).toBe(1);
    const p = loaded.profiles.minimax!;
    expect(p.vendor).toBe("Minimax");
    expect(p.endpoint).toBe("https://api.example.com");
    expect(p.token).toBe("sk-test");
    expect(p.model).toBe("m1");
    expect(p.model_1m).toBe(true);
  });

  test("CJK vendor string round-trips", () => {
    const cjk = "手动配置";
    saveProfiles({
      active: "manual",
      profiles: {
        manual: {
          name: "manual",
          vendor: cjk,
          endpoint: "",
          token: "",
          model: "",
          model_1m: false,
        },
      },
    });
    expect(loadProfiles().profiles.manual!.vendor).toBe(cjk);
  });

  test("profile name with spaces round-trips", () => {
    saveProfiles({
      active: "my profile",
      profiles: {
        "my profile": {
          name: "my profile",
          vendor: "",
          endpoint: "",
          token: "",
          model: "",
          model_1m: false,
        },
      },
    });
    const loaded = loadProfiles();
    expect(loaded.active).toBe("my profile");
    expect(loaded.profiles["my profile"]!.name).toBe("my profile");
  });

  test("active: null becomes key-absent on disk and null on load", () => {
    saveProfiles({ active: null, profiles: {} });
    const raw = readFileSync(join(root, "ccswi", "profiles.toml"), "utf-8");
    expect(raw).not.toMatch(/^active\s*=/m);
    expect(loadProfiles().active).toBeNull();
  });

  test("stringify emits a trailing newline", () => {
    saveProfiles({ active: null, profiles: {} });
    const raw = readFileSync(join(root, "ccswi", "profiles.toml"), "utf-8");
    expect(raw.endsWith("\n")).toBe(true);
  });
});