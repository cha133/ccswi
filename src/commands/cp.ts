import type { Command } from "commander";
import type { Profile } from "../types";
import {
  loadProfiles,
  saveProfiles,
  addProfile,
  setActive,
} from "../core/config";
import { switchToProfile } from "../core/switch";
import { resolveProfileRef } from "../utils/fuzzy";
import { setProviderContext } from "../models/api";
import { promptModel, prompt1m, loadModels } from "../ui/prompts";
import { success, error } from "../ui/format";

export function register(program: Command): void {
  program
    .command("cp <src> <new_name>")
    .description("Clone a profile with a different model (same endpoint/token/vendor)")
    .action(async (src: string, newName: string) => {
      try {
        const store = loadProfiles();

        // 1. resolve src（支持名字 / 模糊匹配 / 数字索引）
        const { profile: srcProfile } = resolveProfileRef(src, store);

        // 2. validate new name（跟 rename.ts L22-35 一致）
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

        // 3. set provider context + 预加载模型列表（跟 add.ts L222-227 同款）
        setProviderContext({
          endpoint: srcProfile.endpoint || undefined,
          modelsUrl: undefined, // src profile 不存 vendor → modelsUrl 映射；只靠 endpoint 拉
          token: srcProfile.token || undefined,
        });
        const models = await loadModels();

        // 4. 只问 model + model_1m（默认沿用 src 的值，回车保留）
        const model = await promptModel("Model:", models, srcProfile.model);
        const model1m = await prompt1m("Model", srcProfile.model_1m);

        // 5. 克隆：所有 src 字段 + 新名字 + 新 model/model_1m
        const cloned: Profile = {
          ...srcProfile,
          name: normalized,
          model: model.trim(),
          model_1m: model1m,
        };

        // 6. 落盘 + 激活（跟 add.ts L31-36 一致）
        addProfile(store, cloned);
        setActive(store, cloned.name);
        saveProfiles(store);
        switchToProfile(cloned);

        success(`Cloned "${srcProfile.name}" → "${cloned.name}".`);
      } catch (err) {
        error(String(err));
        process.exit(1);
      }
    });
}
