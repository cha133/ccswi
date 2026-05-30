import type { Command } from "commander";
import type { Profile } from "../types";
import { loadProfiles, saveProfiles } from "../core/config";
import { resolveProfileRef } from "../utils/fuzzy";
import { success, error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("rename <old> <new>")
    .description("Rename a profile")
    .action((old: string, newName: string) => {
      const store = loadProfiles();

      let profile: Profile;
      let key: string;
      try {
        ({ profile, key } = resolveProfileRef(old, store));
      } catch (e) {
        error(String(e));
        process.exit(1);
      }

      const normalized = newName.trim().toLowerCase();
      if (!normalized) {
        error("New name is required.");
        process.exit(1);
      }
      if (/[/\\:*?"<>|]/.test(normalized)) {
        error('Name cannot contain special characters: / \\ : * ? " < > |');
        process.exit(1);
      }
      if (store.profiles[normalized]) {
        error(`Profile "${normalized}" already exists.`);
        process.exit(1);
      }

      const oldName = profile.name;
      profile.name = normalized;
      store.profiles[normalized] = profile;
      delete store.profiles[key];

      if (store.active === key) {
        store.active = normalized;
      }

      saveProfiles(store);
      success(`Renamed "${oldName}" → "${normalized}".`);
    });
}
