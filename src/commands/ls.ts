import type { Command } from "commander";
import { loadProfiles } from "../core/config";
import { formatProfileTable } from "../ui/format";

export function register(program: Command): void {
  program
    .command("ls")
    .description("List all profiles")
    .action(() => {
      const store = loadProfiles();
      formatProfileTable(store);
    });
}
