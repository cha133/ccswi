import { Command } from "commander";
import { clearModelCache } from "../models/api";
import { success, error } from "../ui/format";

function runCleanCache(): void {
  try {
    clearModelCache();
    success("Model cache cleared.");
  } catch (err) {
    error(String(err));
    process.exit(1);
  }
}

export function register(program: Command): void {
  const cache = program
    .command("cache")
    .description("Manage ccswi caches");

  cache
    .command("clean")
    .description("Clear the model list cache and force a fresh fetch")
    .action(runCleanCache);
}
