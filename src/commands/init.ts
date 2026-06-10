import type { Command } from "commander";
import { runInit } from "../core/init";
import { error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("init")
    .description(
      "Wipe and rewrite ~/.claude/settings.json from scratch with chosen options (intended for fresh-install or full reset)",
    )
    .action(async () => {
      try {
        await runInit();
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
