import type { Command } from "commander";
import { loadProfiles, saveProfiles, removeProfile, setActive } from "../core/config";
import { switchToProfile } from "../core/switch";
import { resolveProfileRef } from "../utils/fuzzy";
import { promptConfirmDelete } from "../ui/prompts";
import { success, error, warn } from "../ui/format";

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

        // 如果删的是 active，需要切换到其他 profile 或清空 active
        if (isActive) {
          const entries = Object.entries(store.profiles);
          if (entries.length === 0) {
            // 没有任何 profile 了，清空 active（和初始状态一致）
            store.active = null;
            warn("No profiles left. Active cleared.");
          } else if (store.profiles["default"]) {
            // 优先切到 default
            setActive(store, "default");
            switchToProfile(store.profiles["default"]!);
            warn("Switched to default profile.");
          } else {
            // 没有 default，切到列表第一个
            const [firstKey, firstProfile] = entries[0]!;
            setActive(store, firstKey);
            switchToProfile(firstProfile);
            warn(`Switched to "${firstProfile.name}".`);
          }
        }

        saveProfiles(store);
        success(`Profile "${profile.name}" removed.`);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
