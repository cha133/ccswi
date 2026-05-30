import * as p from "@clack/prompts";
import type { Profile, ProfilesStore, ProviderPreset } from "../types";
import { getVendorChoices, generateProfileName } from "../providers/presets";
import { getAllModelNames } from "../models/search";
import { fuzzyScore } from "../utils/fuzzy";

/**
 * 检查是否取消操作
 */
function checkCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  return value as T;
}

/**
 * 预加载模型列表（带 spinner）
 * 返回模型名数组，失败则返回 null
 */
async function loadModels(): Promise<string[] | null> {
  const s = p.spinner();
  s.start("Loading model list...");
  try {
    const models = await getAllModelNames();
    s.stop(`Loaded ${models.length} models.`);
    return models;
  } catch {
    s.stop("Failed to load models, using manual input.");
    return null;
  }
}

/**
 * 供应商选择 prompt（可搜索的 autocomplete）
 */
async function promptVendor(): Promise<ProviderPreset> {
  const choices = getVendorChoices();

  const result = checkCancel(
    await p.autocomplete<ProviderPreset>({
      message: "Select a vendor (type to search):",
      options: choices.map((preset) => ({
        value: preset,
        label: preset.name,
        hint: preset.endpoint || undefined,
      })),
      filter: (search: string, option: { value: ProviderPreset }) => {
        if (!search) return true;
        return fuzzyScore(search, option.value.name) > 0;
      },
    }),
  );

  return result;
}

/**
 * 模型选择 prompt
 * 支持自由输入（直接回车用输入的文本）或从列表中选择
 * reuseLabel: 如果提供，在列表最前面显示一个复用选项（如 "↩ Use opus model (xxx)"）
 */
async function promptModel(
  message: string,
  models: string[] | null,
  defaultValue?: string,
  reuseLabel?: string,
): Promise<string> {
  // 如果模型列表加载失败，fallback 到简单文本输入
  if (!models) {
    return checkCancel(
      await p.text({
        message,
        defaultValue: defaultValue || "",
        placeholder: "e.g. claude-sonnet-4-6, deepseek-v4-pro",
      }),
    );
  }

  const CUSTOM = "__ccsw_custom__";
  const REUSE = "__ccsw_reuse__";

  const topOptions: { value: string; label: string }[] = [];

  if (reuseLabel && defaultValue) {
    topOptions.push({ value: REUSE, label: reuseLabel });
  }
  topOptions.push({ value: CUSTOM, label: "✏️  Enter custom model name..." });

  // 使用 autocomplete，支持搜索过滤
  const result = checkCancel(
    await p.autocomplete<string>({
      message,
      options: [
        ...topOptions,
        ...models.map((name) => ({ value: name, label: name })),
      ],
      filter: (search: string, option: { value: string; label?: string }) => {
        // 特殊选项只在无搜索时显示
        if (option.value === CUSTOM || option.value === REUSE) return !search;
        if (!search) return true;
        return fuzzyScore(search, option.value) > 0;
      },
    }),
  );

  if (result === REUSE) {
    return defaultValue!;
  }

  if (result === CUSTOM) {
    return checkCancel(
      await p.text({
        message,
        defaultValue: defaultValue || "",
        placeholder: "e.g. claude-sonnet-4-6, deepseek-v4-pro",
      }),
    );
  }

  return result;
}

/**
 * 1M 支持选择 prompt
 */
async function prompt1m(label: string, defaultValue: boolean = true): Promise<boolean> {
  const result = checkCancel(
    await p.confirm({
      message: `Does ${label} support 1M context?`,
      initialValue: defaultValue,
    }),
  );
  return result;
}

/**
 * 创建新 profile 的完整交互流程
 */
export async function promptNewProfile(
  store: ProfilesStore,
): Promise<Profile> {
  // 1. 供应商选择
  const vendor = await promptVendor();
  const isNoVendor = vendor.name === "(不使用供应商)";

  // 2. Profile 名称
  const defaultName = isNoVendor ? "" : generateProfileName(vendor.name);
  const name = checkCancel(
    await p.text({
      message: "Profile name:",
      initialValue: defaultName,
      placeholder: "e.g. my-provider",
      validate: (value: string | undefined) => {
        if (!value?.trim()) return "Name is required.";
        const normalized = value.trim().toLowerCase();
        if (store.profiles[normalized]) {
          return `Profile "${normalized}" already exists.`;
        }
        if (/[/\\:*?"<>|]/.test(normalized)) {
          return 'Name cannot contain special characters: / \\ : * ? " < > |';
        }
        return undefined;
      },
    }),
  );

  // 3. Endpoint URL
  const defaultEndpoint = vendor.endpoint || "";
  const endpoint = checkCancel(
    await p.text({
      message: "Endpoint URL (ANTHROPIC_BASE_URL):",
      initialValue: defaultEndpoint,
      placeholder: isNoVendor
        ? "https://api.example.com/anthropic"
        : "Press Enter to use default",
    }),
  );

  // 4. API Key / Token
  const token = checkCancel(
    await p.password({
      message: "API Key / Token (ANTHROPIC_AUTH_TOKEN):",
    }),
  );

  // 5. 预加载模型列表（一次性加载，后面复用）
  const models = await loadModels();

  // 6. Opus 模型
  const opus = await promptModel("Opus model:", models);

  // 7. Opus 1M
  const opus1m = await prompt1m("Opus", true);

  // 8. Sonnet 模型（可复用 Opus）
  const sonnet = await promptModel("Sonnet model:", models, opus, `↩ Use same model as Opus (${opus})`);

  // 9. Sonnet 1M（默认沿用 Opus 的 1M 设置）
  const sonnet1m = await prompt1m("Sonnet", opus1m);

  // 10. Haiku 模型（可复用 Sonnet）
  const haiku = await promptModel("Haiku model:", models, sonnet, `↩ Use same model as Sonnet (${sonnet})`);

  // 构建 profile
  const profile: Profile = {
    name: name.trim().toLowerCase(),
    vendor: isNoVendor ? "" : vendor.name,
    endpoint: endpoint.trim(),
    token: token?.trim() || "",
    opus: opus.trim(),
    opus_1m: opus1m,
    sonnet: sonnet.trim(),
    sonnet_1m: sonnet1m,
    haiku: haiku.trim(),
  };

  return profile;
}

/**
 * 编辑已有 profile 的交互流程
 * vendor 和 name 不可改，模型用文本输入（预填现有值）
 */
export async function promptEditProfile(
  existing: Profile,
): Promise<Profile> {
  console.log(`  Editing profile: ${existing.name} (${existing.vendor || "no vendor"})`);

  // Endpoint URL
  const endpoint = checkCancel(
    await p.text({
      message: "Endpoint URL (ANTHROPIC_BASE_URL):",
      initialValue: existing.endpoint,
      placeholder: "Press Enter to keep current value",
    }),
  );

  // API Key / Token
  const token = checkCancel(
    await p.text({
      message: "API Key / Token (ANTHROPIC_AUTH_TOKEN):",
      initialValue: existing.token,
      placeholder: "Press Enter to keep current value",
    }),
  );

  // 模型用文本输入，预填现有值
  const opus = checkCancel(
    await p.text({
      message: "Opus model:",
      initialValue: existing.opus,
      placeholder: "Press Enter to keep current value",
    }),
  );

  const opus1m = await prompt1m("Opus", existing.opus_1m);

  const sonnet = checkCancel(
    await p.text({
      message: "Sonnet model:",
      initialValue: existing.sonnet || opus,
      placeholder: "Press Enter to keep current value",
    }),
  );

  const sonnet1m = await prompt1m("Sonnet", existing.sonnet_1m);

  const haiku = checkCancel(
    await p.text({
      message: "Haiku model:",
      initialValue: existing.haiku || sonnet,
      placeholder: "Press Enter to keep current value",
    }),
  );

  return {
    name: existing.name,
    vendor: existing.vendor,
    endpoint: endpoint.trim(),
    token: token?.trim() || existing.token,
    opus: opus.trim(),
    opus_1m: opus1m,
    sonnet: sonnet.trim(),
    sonnet_1m: sonnet1m,
    haiku: haiku.trim(),
  };
}

/**
 * 删除确认 prompt
 */
export async function promptConfirmDelete(
  profileName: string,
  isActive: boolean,
): Promise<boolean> {
  const msg = isActive
    ? `Delete profile "${profileName}"? (This is the active profile, will switch to default)`
    : `Delete profile "${profileName}"?`;

  return checkCancel(
    await p.confirm({
      message: msg,
      initialValue: false,
    }),
  );
}
