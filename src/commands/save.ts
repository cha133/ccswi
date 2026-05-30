import type { Command } from "commander";
import { loadProfiles, saveProfiles, addProfile, updateProfile } from "../core/config";
import { extractProfileFromSettings } from "../core/settings";
import { success } from "../ui/format";

export function register(program: Command): void {
  program
    .command("save [name]")
    .description("Extract current settings.json into a profile")
    .action((name?: string) => {
      const profileName = (name || "default").trim().toLowerCase();
      const store = loadProfiles();
      const profile = extractProfileFromSettings(profileName);

      if (store.profiles[profileName]) {
        updateProfile(store, profile);
        success(`Updated "${profileName}" profile from current settings.json.`);
      } else {
        addProfile(store, profile);
        success(`Extracted current settings.json as "${profileName}" profile.`);
      }

      saveProfiles(store);
    });
}
