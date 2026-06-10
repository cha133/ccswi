import { existsSync, copyFileSync, rmSync } from "node:fs";
import * as p from "@clack/prompts";
import { claudeSettingsPath, commonConfigPath } from "../utils/paths";
import { writeSettings } from "./settings";
import { loadProfiles, saveProfiles, addProfile, setActive } from "./config";
import { readClaudeJson, writeClaudeJson, type ClaudeJsonShape, type McpServerEntry } from "./claude-json";
import { buildSettingsForInit, type InitOptions } from "./init-settings";
import { promptNewProfile, checkCancel } from "../ui/prompts";
import {
  promptInitOptions,
  promptDefaultMode,
  promptTheme,
  buildEnvVarsFromSetOptions,
} from "../ui/init-prompts";
import { detectCcstatuslineCommand } from "../utils/detect";
import { success, info } from "../ui/format";

/** 二次确认（取消时直接退出，无副作用） */
async function confirmOrCancel(message: string): Promise<boolean> {
  const value = checkCancel(
    await p.confirm({ message, initialValue: false }),
  );
  return value;
}

/**
 * ~/.claude.json 合并策略：
 * - hasCompletedOnboarding / theme：覆盖写入
 * - mcpServers：浅合并（不丢用户已有的 server，但同名的会被新值覆盖）
 * - 其他字段：原样保留
 */
function mergeClaudeJson(
  existing: ClaudeJsonShape,
  bootstrap: {
    hasCompletedOnboarding: true;
    theme: string;
    mcpServers?: Record<string, McpServerEntry>;
  },
): ClaudeJsonShape {
  const result: ClaudeJsonShape = { ...existing };
  result.hasCompletedOnboarding = bootstrap.hasCompletedOnboarding;
  result.theme = bootstrap.theme;
  if (bootstrap.mcpServers) {
    result.mcpServers = {
      ...(existing.mcpServers ?? {}),
      ...bootstrap.mcpServers,
    };
  }
  return result;
}

/**
 * init 命令的核心编排
 * 严格遵循"取消安全"原则：在用户走完全部向导之前不写任何文件（.bak 例外）
 */
export async function runInit(): Promise<void> {
  // 1. settings.json 是否已存在？决定是否需要确认 + 备份
  const settingsPath = claudeSettingsPath();
  const settingsExist = existsSync(settingsPath);

  if (settingsExist) {
    info(`Existing settings.json detected at ${settingsPath}`);
    const proceed = await confirmOrCancel(
      "Wipe ~/.claude/settings.json and rewrite from scratch? (a backup will be created at settings.json.bak)",
    );
    if (!proceed) {
      p.cancel("Init cancelled. No changes made.");
      return;
    }
    copyFileSync(settingsPath, settingsPath + ".bak");
    info(`Backed up to ${settingsPath}.bak`);
  } else {
    info("No existing settings.json — will create fresh.");
  }

  // 2. 加载已有 profiles（保留），跑完整的 profile 创建向导
  const store = loadProfiles();
  const profile = await promptNewProfile(store);

  // 3. 跑 init 选项向导
  const { setOptions, extra } = await promptInitOptions();
  const theme = await promptTheme();
  const defaultMode = await promptDefaultMode();

  // ---- 至此用户已确认全部选项，下面才开始真正写文件 ----

  // 4. 汇总 init 选项
  const envVars = buildEnvVarsFromSetOptions(setOptions);
  const statusLineCommand = extra.installCcstatusline
    ? detectCcstatuslineCommand()
    : null;

  const initOpts: InitOptions = {
    envVars,
    disableWebSearch: extra.disableWebSearch,
    defaultMode,
    statusLineCommand,
    theme,
  };

  // 5. 从零构建并写入 settings.json
  const settings = buildSettingsForInit(profile, initOpts);
  writeSettings(settings);

  // 6. 清掉派生缓存 common.json，下次 switch 会自愈
  rmSync(commonConfigPath(), { force: true });

  // 7. 保存 profile 并设为 active
  addProfile(store, profile);
  setActive(store, profile.name);
  saveProfiles(store);

  // 8. bootstrap ~/.claude.json
  const claudeJson = readClaudeJson();
  const merged = mergeClaudeJson(claudeJson, {
    hasCompletedOnboarding: true,
    theme,
    mcpServers: extra.installExa
      ? { exa: { type: "http", url: "https://mcp.exa.ai/mcp" } }
      : undefined,
  });
  writeClaudeJson(merged);

  // 9. 报告结果
  success(`Initialized. Active profile: "${profile.name}".`);
  if (settingsExist) {
    info(`Previous settings.json backed up at ${settingsPath}.bak`);
  }
  if (extra.installCcstatusline) {
    info(`statusLine command: ${statusLineCommand}`);
  }
  if (extra.installExa) {
    info("Exa MCP server installed in ~/.claude.json");
  }
}
