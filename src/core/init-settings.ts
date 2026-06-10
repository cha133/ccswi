import type { Profile, ClaudeSettings } from "../types";
import { apply1m } from "./settings";

/**
 * init 流程中用户选择的"非 provider"配置
 * envVars 已经汇总好了 6 个 set 选项对应的 env key/value（不含 ANTHROPIC_*）
 */
export interface InitOptions {
  envVars: Record<string, string>;
  disableWebSearch: boolean;
  defaultMode: "auto" | "bypassPermissions" | "acceptEdits" | "plan";
  /** null 表示不安装 ccstatusline */
  statusLineCommand: string | null;
  theme: "light" | "dark";
}

/**
 * 从零构建 settings.json
 *
 * 这是 init 路径专用的 builder，独立于 buildSettingsFromProfile（switch 路径，依赖
 * 已存在的 common.json）。init 不读 common.json —— 用户的意图就是完全重建。
 */
export function buildSettingsForInit(
  profile: Profile,
  opts: InitOptions,
): ClaudeSettings {
  const settings: ClaudeSettings = {};

  // 1. env：先放 set 选项 env，再叠加 provider 字段
  const env: Record<string, string> = { ...opts.envVars };

  if (profile.endpoint) {
    env.ANTHROPIC_BASE_URL = profile.endpoint;
  }
  if (profile.token) {
    env.ANTHROPIC_AUTH_TOKEN = profile.token;
  }
  if (profile.opus) {
    const opusModel = apply1m(profile.opus, profile.opus_1m);
    env.ANTHROPIC_MODEL = opusModel;
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = opusModel;
  }
  if (profile.sonnet) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = apply1m(profile.sonnet, profile.sonnet_1m);
  }
  if (profile.haiku) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = apply1m(profile.haiku, profile.haiku_1m);
  }
  settings.env = env;

  // 2. permissions
  const permissions: Record<string, unknown> = { defaultMode: opts.defaultMode };
  if (opts.disableWebSearch) {
    permissions.deny = ["WebSearch"];
  }
  settings.permissions = permissions;

  // 3. statusLine（仅在选择安装时才写）
  if (opts.statusLineCommand) {
    settings.statusLine = {
      type: "command",
      command: opts.statusLineCommand,
      padding: 0,
      refreshInterval: 10,
    };
  }

  // 4. theme
  settings.theme = opts.theme;

  return settings;
}
