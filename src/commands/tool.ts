import type { Command } from "commander";
import { homedir } from "node:os";
import {
  readClaudeJson,
  writeClaudeJson,
  findHomeProjectKey,
  DEFAULT_PROJECT_CONFIG,
  type ProjectConfig,
} from "../core/claude-json";
import { success, error, info } from "../ui/format";

/**
 * `ccswi tool` —— 调整 ~/.claude.json 里 claude-code 的行为开关
 * 跟 `set` 不同：`set` 改的是 ~/.claude/settings.json 的 env vars，
 * 这里改的是 ~/.claude.json 里 per-project 的状态字段
 */
export function register(program: Command): void {
  const tool = program
    .command("tool")
    .description("Tweak ~/.claude.json behavior flags");

  tool
    .command("skip-project-onboarding")
    .description(
      "Set projectOnboardingSeenCount=4 on all projects to suppress onboarding screens",
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
}