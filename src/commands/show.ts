import type { Command } from "commander";
import { loadProfiles, getProfileEntries } from "../core/config";
import { resolveProfileRef } from "../utils/fuzzy";
import { formatProfileDetail, error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("show [ref]")
    .description("Show profile details (defaults to active profile)")
    .action((ref?: string) => {
      try {
        const store = loadProfiles();

        if (!ref) {
          // 显示当前 active
          if (!store.active || !store.profiles[store.active]) {
            error("No active profile.");
            process.exit(1);
          }
          const entries = getProfileEntries(store);
          const index = entries.findIndex(([k]) => k === store.active);
          formatProfileDetail(store.profiles[store.active]!, index);
          return;
        }

        const { profile } = resolveProfileRef(ref, store);
        const entries = getProfileEntries(store);
        const index = entries.findIndex(([k]) => k === profile.name);
        formatProfileDetail(profile, index);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
