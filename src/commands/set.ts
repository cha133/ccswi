import type { Command } from "commander";
import { setCommonEnv } from "../core/common-config";
import { loadProfiles, getActiveProfile } from "../core/config";
import { switchToProfile } from "../core/switch";
import { success, error } from "../ui/format";

export function register(program: Command): void {
  const setCmd = program
    .command("set")
    .description("Modify common config options");

  setCmd
    .command("disable-updater")
    .description("Disable auto-updater (DISABLE_AUTOUPDATER=1, DISABLE_INSTALLATION_CHECKS=1)")
    .action(() => {
      try {
        setCommonEnv("DISABLE_AUTOUPDATER", "1");
        setCommonEnv("DISABLE_INSTALLATION_CHECKS", "1");
        reapplyActive();
        success("Auto-updater disabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  setCmd
    .command("use-pwsh")
    .description("Use PowerShell tool (CLAUDE_CODE_USE_POWERSHELL_TOOL=1)")
    .action(() => {
      try {
        setCommonEnv("CLAUDE_CODE_USE_POWERSHELL_TOOL", "1");
        reapplyActive();
        success("PowerShell tool enabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  setCmd
    .command("no-flicker")
    .description("Enable no-flicker / fullscreen rendering (CLAUDE_CODE_NO_FLICKER=1)")
    .action(() => {
      try {
        setCommonEnv("CLAUDE_CODE_NO_FLICKER", "1");
        reapplyActive();
        success("No-flicker rendering enabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  setCmd
    .command("skip-ide-install")
    .description("Skip auto-installing IDE extension (CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1)")
    .action(() => {
      try {
        setCommonEnv("CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL", "1");
        reapplyActive();
        success("IDE extension auto-install skipped.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });

  setCmd
    .command("no-ide-connect")
    .description("Disable auto-connecting to IDE (CLAUDE_CODE_AUTO_CONNECT_IDE=false)")
    .action(() => {
      try {
        setCommonEnv("CLAUDE_CODE_AUTO_CONNECT_IDE", "false");
        reapplyActive();
        success("IDE auto-connect disabled.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}

/**
 * 重新应用当前 active profile（如果有）
 */
function reapplyActive(): void {
  const store = loadProfiles();
  const active = getActiveProfile(store);
  if (active) {
    switchToProfile(active);
  }
}
