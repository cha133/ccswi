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

      // 初次使用：profiles 完全为空时，检查是否需要备份当前 settings.json 为 default
      const entries = Object.keys(store.profiles);
      const needsDefaultBackup = entries.length === 0;

      try {
        // 先执行交互流程，如果用户取消则不会保存任何东西
        const profile = await promptNewProfile(store);

        // 交互成功后才保存 default 备份（如果有的话）
        if (needsDefaultBackup) {
          const defaultProfile = extractProfileFromSettings("default");
          if (defaultProfile.endpoint || defaultProfile.token || defaultProfile.model) {
            addProfile(store, defaultProfile);
          }
        }

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
