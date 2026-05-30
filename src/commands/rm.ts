import type { Command } from "commander";
import { loadProfiles, saveProfiles, removeProfile } from "../core/config";
import { switchToProfileAndUpdateActive } from "../core/switch";
import { resolveProfileRef } from "../utils/fuzzy";
import { promptConfirmDelete } from "../ui/prompts";
import { success, error, warn } from "../ui/format";
import { createEmptyProfile } from "../types";

export function register(program: Command): void {
  program
    .command("rm <ref>")
    .description("Remove a profile")
    .action(async (ref: string) => {
      try {
        const store = loadProfiles();
        const { profile, key } = resolveProfileRef(ref, store);
        const isActive = store.active === key;

        const confirmed = await promptConfirmDelete(profile.name, isActive);
        if (!confirmed) {
          warn("Cancelled.");
          return;
        }

        removeProfile(store, key);
        saveProfiles(store);

        // 如果删的是 active，自动切回 default
        if (isActive) {
          if (store.profiles["default"]) {
            switchToProfileAndUpdateActive(store.profiles["default"]!);
            warn("Switched to default profile.");
          } else {
            // 没有 default，创建一个空的
            const emptyDefault = createEmptyProfile("default");
            store.profiles["default"] = emptyDefault;
            store.active = "default";
            saveProfiles(store);
            switchToProfileAndUpdateActive(emptyDefault);
            warn("Created and switched to empty default profile.");
          }
        }

        success(`Profile "${profile.name}" removed.`);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
