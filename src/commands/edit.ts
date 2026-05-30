import type { Command } from "commander";
import { loadProfiles, saveProfiles, updateProfile } from "../core/config";
import { switchToProfile } from "../core/switch";
import { resolveProfileRef } from "../utils/fuzzy";
import { promptEditProfile } from "../ui/prompts";
import { success, error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("edit <ref>")
    .description("Edit an existing profile")
    .action(async (ref: string) => {
      try {
        const store = loadProfiles();
        const { profile: existing } = resolveProfileRef(ref, store);

        const updated = await promptEditProfile(existing);

        updateProfile(store, updated);
        saveProfiles(store);

        // 如果是当前 active，重新应用
        if (store.active === updated.name) {
          switchToProfile(updated);
        }

        success(`Profile "${updated.name}" updated.`);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
