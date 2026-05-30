import type { Command } from "commander";
import { loadProfiles, saveProfiles, addProfile, setActive } from "../core/config";
import { switchToProfile } from "../core/switch";
import { extractProfileFromSettings } from "../core/settings";
import { promptNewProfile } from "../ui/prompts";
import { success, error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("add")
    .description("Add a new profile interactively")
    .action(async () => {
      const store = loadProfiles();

      // 初次使用：profiles 完全为空时，从当前 settings.json 备份为 default
      const entries = Object.keys(store.profiles);
      if (entries.length === 0) {
        const defaultProfile = extractProfileFromSettings("default");
        // 只有当 settings.json 有实际 provider 内容时才保存
        if (defaultProfile.endpoint || defaultProfile.token || defaultProfile.opus || defaultProfile.sonnet || defaultProfile.haiku) {
          addProfile(store, defaultProfile);
          saveProfiles(store);
        }
      }

      try {
        const profile = await promptNewProfile(store);

        addProfile(store, profile);
        setActive(store, profile.name);
        saveProfiles(store);

        // 切换到新 profile
        switchToProfile(profile);

        success(`Profile "${profile.name}" added and activated.`);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
