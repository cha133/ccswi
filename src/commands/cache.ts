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
  // 主推：ccswi cache clean
  const cache = program
    .command("cache")
    .description("Manage ccswi caches");

  cache
    .command("clean")
    .description("Clear the model list cache and force a fresh fetch")
    .action(runCleanCache);

  // 兼容旧命令：ccswi clean-cache（隐藏，不显示在 help 中）
  const legacy = new Command("clean-cache")
    .description("Clear the model list cache (deprecated, use `cache clean`)")
    .action(runCleanCache);
  program.addCommand(legacy, { hidden: true });
}
