import type { Command } from "commander";
import { homedir } from "node:os";
import {
  readClaudeJson,
  writeClaudeJson,
  findHomeProjectKey,
  DEFAULT_PROJECT_CONFIG,
  setClaudeJsonOnboarding,
  setClaudeJsonMcpServer,
  type ProjectConfig,
} from "../core/claude-json";
import { setSettingsEnv, setSettingsPermissionsDeny } from "../core/settings";
import { success, error, info } from "../ui/format";

/**
 * `ccswi tool` —— 调整 ~/.claude/settings.json 和 ~/.claude.json 里的行为开关
 * 11 个扁平子命令，分三组：
 *   - settings.json env vars（6 个，原 set 命令）
 *   - claude.json per-project state（skip-project-onboarding / trust-home）
 *   - init 派生的外科手术式开关（deny-web-search / install-exa / complete-onboarding）
 */
export function register(program: Command): void {
  const tool = program
    .command("tool")
    .description(
      "Tweak ~/.claude/settings.json and ~/.claude.json behavior flags",
    );

  // ---- settings.json env toggles（原 set 命令） ----

  tool
    .command("use-pwsh")
    .description(
      "Use PowerShell tool (CLAUDE_CODE_USE_POWERSHELL_TOOL=1) — ~/.claude/settings.json",
    )
    .action(() => {
      try {
        setSettingsEnv("CLAUDE_CODE_USE_POWERSHELL_TOOL", "1");
        success("PowerShell tool enabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("no-flicker")
    .description(
      "Enable no-flicker / fullscreen rendering (CLAUDE_CODE_NO_FLICKER=1) — ~/.claude/settings.json",
    )
    .action(() => {
      try {
        setSettingsEnv("CLAUDE_CODE_NO_FLICKER", "1");
        success("No-flicker rendering enabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("disable-updater")
    .description(
      "Disable auto-updater (DISABLE_AUTOUPDATER=1) — ~/.claude/settings.json",
    )
    .action(() => {
      try {
        setSettingsEnv("DISABLE_AUTOUPDATER", "1");
        success("Auto-updater disabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("disable-install-checks")
    .description(
      "Disable installation checks (DISABLE_INSTALLATION_CHECKS=1) — ~/.claude/settings.json",
    )
    .action(() => {
      try {
        setSettingsEnv("DISABLE_INSTALLATION_CHECKS", "1");
        success("Installation checks disabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("skip-ide-install")
    .description(
      "Skip auto-installing IDE extension (CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1) — ~/.claude/settings.json",
    )
    .action(() => {
      try {
        setSettingsEnv("CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL", "1");
        success("IDE extension auto-install skipped.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("no-ide-connect")
    .description(
      'Disable auto-connecting to IDE (CLAUDE_CODE_AUTO_CONNECT_IDE="false") — ~/.claude/settings.json',
    )
    .action(() => {
      try {
        setSettingsEnv("CLAUDE_CODE_AUTO_CONNECT_IDE", "false");
        success("IDE auto-connect disabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("deny-web-search")
    .description(
      'Add "WebSearch" to permissions.deny (preserves defaultMode/allow) — ~/.claude/settings.json',
    )
    .action(() => {
      try {
        setSettingsPermissionsDeny("WebSearch");
        success("WebSearch tool denied in permissions.deny.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  // ---- claude.json per-project state（原有） ----

  tool
    .command("skip-project-onboarding")
    .description(
      "Set projectOnboardingSeenCount=4 on all projects to suppress onboarding screens — ~/.claude.json",
    )
    .action(() => {
      try {
        const data = readClaudeJson();
        const projects: Record<string, ProjectConfig> = data.projects ?? {};
        const total = Object.keys(projects).length;
        if (total === 0) {
          info("No projects in ~/.claude.json — nothing to skip.");
          return;
        }
        for (const entry of Object.values(projects)) {
          entry.projectOnboardingSeenCount = 4;
          entry.hasCompletedProjectOnboarding = true;
        }
        data.projects = projects;
        writeClaudeJson(data);
        success(
          `Marked ${total} project${total === 1 ? "" : "s"} as onboarded. ` +
            `Onboarding screens will be skipped.`,
        );
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("trust-home")
    .description("Mark the home directory as trusted in ~/.claude.json")
    .action(() => {
      try {
        const data = readClaudeJson();
        const projects: Record<string, ProjectConfig> = data.projects ?? {};
        const home = homedir();
        const existingKey = findHomeProjectKey(projects, home);
        if (existingKey) {
          const entry = projects[existingKey];
          if (entry) entry.hasTrustDialogAccepted = true;
          info(`Updated existing entry at key "${existingKey}"`);
        } else {
          projects[home] = {
            ...DEFAULT_PROJECT_CONFIG,
            hasTrustDialogAccepted: true,
          };
          info(`Created new entry at key "${home}"`);
        }
        data.projects = projects;
        writeClaudeJson(data);
        success(
          "Home directory marked as trusted. Trust dialog should no longer appear.",
        );
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  // ---- init 派生的外科手术式开关 ----

  tool
    .command("install-exa")
    .description(
      "Inject Exa MCP server (https://mcp.exa.ai/mcp) into mcpServers — ~/.claude.json",
    )
    .action(() => {
      try {
        setClaudeJsonMcpServer("exa", {
          type: "http",
          url: "https://mcp.exa.ai/mcp",
        });
        success("Exa MCP server installed in ~/.claude.json.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  tool
    .command("complete-onboarding")
    .description("Set hasCompletedOnboarding=true at top level — ~/.claude.json")
    .action(() => {
      try {
        setClaudeJsonOnboarding();
        success("hasCompletedOnboarding set to true.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
