import * as p from "@clack/prompts";
import { checkCancel } from "./prompts";
import { isWindows, isScoopInstall } from "../utils/detect";

/* ---------------- 类型定义 ---------------- */

export interface SetOptionsSelections {
  usePwsh: boolean;
  noFlicker: boolean;
  disableUpdater: boolean;
  disableInstallChecks: boolean;
  skipIdeInstall: boolean;
  noIdeConnect: boolean;
}

export interface ExtraConfigSelections {
  disableWebSearch: boolean;
  installExa: boolean;
  installCcstatusline: boolean;
}

export type DefaultMode = "auto" | "bypassPermissions" | "acceptEdits" | "plan";
export type ThemeChoice = "light" | "dark";

/* ---------------- Set options multiselect ---------------- */

type SetOptionKey =
  | "use-pwsh"
  | "no-flicker"
  | "disable-updater"
  | "disable-install-checks"
  | "skip-ide-install"
  | "no-ide-connect";

interface SetOptionDef {
  key: SetOptionKey;
  label: string;
  hint: string;
  defaultSelected: boolean;
}

function buildSetOptionDefs(): SetOptionDef[] {
  const win = isWindows();
  const scoop = isScoopInstall();
  return [
    {
      key: "use-pwsh",
      label: "use-pwsh",
      hint: "CLAUDE_CODE_USE_POWERSHELL_TOOL=1" + (win ? " (Windows default)" : ""),
      defaultSelected: win,
    },
    {
      key: "no-flicker",
      label: "no-flicker",
      hint: "CLAUDE_CODE_NO_FLICKER=1",
      defaultSelected: true,
    },
    {
      key: "disable-updater",
      label: "disable-updater",
      hint:
        "DISABLE_AUTOUPDATER=1" +
        (scoop ? " (scoop install detected)" : ""),
      defaultSelected: scoop,
    },
    {
      key: "disable-install-checks",
      label: "disable-install-checks",
      hint:
        "DISABLE_INSTALLATION_CHECKS=1" +
        (scoop ? " (scoop install detected)" : ""),
      defaultSelected: scoop,
    },
    {
      key: "skip-ide-install",
      label: "skip-ide-install",
      hint: "CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1",
      defaultSelected: true,
    },
    {
      key: "no-ide-connect",
      label: "no-ide-connect",
      hint: 'CLAUDE_CODE_AUTO_CONNECT_IDE="false"',
      defaultSelected: true,
    },
  ];
}

async function promptSetOptions(): Promise<SetOptionsSelections> {
  const defs = buildSetOptionDefs();
  const selected = checkCancel(
    await p.multiselect<SetOptionKey>({
      message: "Set options (space to toggle, enter to confirm):",
      options: defs.map((d) => ({ value: d.key, label: d.label, hint: d.hint })),
      initialValues: defs.filter((d) => d.defaultSelected).map((d) => d.key),
      required: false,
    }),
  );
  const set = new Set(selected);
  return {
    usePwsh: set.has("use-pwsh"),
    noFlicker: set.has("no-flicker"),
    disableUpdater: set.has("disable-updater"),
    disableInstallChecks: set.has("disable-install-checks"),
    skipIdeInstall: set.has("skip-ide-install"),
    noIdeConnect: set.has("no-ide-connect"),
  };
}

/* ---------------- Extra configs multiselect ---------------- */

type ExtraKey = "disable-web-search" | "install-exa" | "install-ccstatusline";

async function promptExtraConfigs(): Promise<ExtraConfigSelections> {
  const defs: { key: ExtraKey; label: string; hint: string; defaultSelected: boolean }[] = [
    {
      key: "disable-web-search",
      label: "Disable WebSearch tool",
      hint: 'permissions.deny += "WebSearch"',
      defaultSelected: true,
    },
    {
      key: "install-exa",
      label: "Install Exa MCP server",
      hint: "~/.claude.json mcpServers.exa (http)",
      defaultSelected: false,
    },
    {
      key: "install-ccstatusline",
      label: "Install ccstatusline (status line)",
      hint: "settings.statusLine = ccstatusline / bunx / npx",
      defaultSelected: false,
    },
  ];

  const selected = checkCancel(
    await p.multiselect<ExtraKey>({
      message: "Extra configs (space to toggle, enter to confirm):",
      options: defs.map((d) => ({ value: d.key, label: d.label, hint: d.hint })),
      initialValues: defs.filter((d) => d.defaultSelected).map((d) => d.key),
      required: false,
    }),
  );
  const set = new Set(selected);
  return {
    disableWebSearch: set.has("disable-web-search"),
    installExa: set.has("install-exa"),
    installCcstatusline: set.has("install-ccstatusline"),
  };
}

/* ---------------- 单选：模式 / 主题 ---------------- */

export async function promptDefaultMode(): Promise<DefaultMode> {
  return checkCancel(
    await p.select<DefaultMode>({
      message: "Default permission mode:",
      options: [
        { value: "auto", label: "auto", hint: "prompt for each tool (default)" },
        { value: "bypassPermissions", label: "bypassPermissions", hint: "allow all tools without prompting" },
        { value: "acceptEdits", label: "acceptEdits", hint: "auto-accept file edits" },
        { value: "plan", label: "plan", hint: "read-only / plan mode" },
      ],
      initialValue: "auto",
    }),
  );
}

export async function promptTheme(): Promise<ThemeChoice> {
  return checkCancel(
    await p.select<ThemeChoice>({
      message: "Theme:",
      options: [
        { value: "light", label: "light" },
        { value: "dark", label: "dark" },
      ],
      initialValue: "light",
    }),
  );
}

/* ---------------- 组合入口 ---------------- */

/**
 * 跑两组 multiselect（Set options + Extra configs）
 */
export async function promptInitOptions(): Promise<{
  setOptions: SetOptionsSelections;
  extra: ExtraConfigSelections;
}> {
  const setOptions = await promptSetOptions();
  const extra = await promptExtraConfigs();
  return { setOptions, extra };
}

/* ---------------- 工具 ---------------- */

/** 把 set 选项的布尔字典翻译成 env key/value 字典 */
export function buildEnvVarsFromSetOptions(
  sel: SetOptionsSelections,
): Record<string, string> {
  const env: Record<string, string> = {};
  if (sel.usePwsh) env.CLAUDE_CODE_USE_POWERSHELL_TOOL = "1";
  if (sel.noFlicker) env.CLAUDE_CODE_NO_FLICKER = "1";
  if (sel.disableUpdater) env.DISABLE_AUTOUPDATER = "1";
  if (sel.disableInstallChecks) env.DISABLE_INSTALLATION_CHECKS = "1";
  if (sel.skipIdeInstall) env.CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL = "1";
  if (sel.noIdeConnect) env.CLAUDE_CODE_AUTO_CONNECT_IDE = "false";
  return env;
}
