import type { Command } from "commander";
import { clearModelCache } from "../models/api";
import { success, error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("clean-cache")
    .description("Clear the model list cache and force a fresh fetch")
    .action(() => {
      try {
        clearModelCache();
        success("Model cache cleared.");
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
