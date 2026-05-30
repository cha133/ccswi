import type { Command } from "commander";
import { loadProfiles, getProfileEntries } from "../core/config";
import { switchToProfileAndUpdateActive } from "../core/switch";
import { resolveProfileRef } from "../utils/fuzzy";
import { success, error, formatProfileDetail } from "../ui/format";

export function register(program: Command): void {
  program
    .command("use <ref>")
    .description("Switch to a profile (name or index)")
    .action((ref: string) => {
      try {
        const store = loadProfiles();
        const entries = getProfileEntries(store);

        // 如果是数字，转换为 0-based 索引再查找
        const index = parseInt(ref, 10);
        let profile, key;
        if (!isNaN(index)) {
          const result = resolveProfileRef(String(index), store);
          profile = result.profile;
          key = result.key;
        } else {
          const result = resolveProfileRef(ref, store);
          profile = result.profile;
          key = result.key;
        }

        switchToProfileAndUpdateActive(profile);
        success(`Switched to "${profile.name}".`);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
