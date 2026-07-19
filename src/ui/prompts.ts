import * as p from "@clack/prompts";
import type { Profile, ProfilesStore, ProviderPreset } from "../types";
import { getVendorChoices, generateProfileName } from "../providers/presets";
import { setProviderContext, getAllModelNames } from "../models/api";
import { fuzzyScore } from "../utils/fuzzy";

/**
 * 检查是否取消操作
 */
export function checkCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  return value as T;
}

/**
 * 预加载模型列表（带 spinner）
 * 优先从供应商端点获取，失败则 fallback 到 OpenRouter
 * 返回模型名数组，失败则返回 null
 *
 * Export 出来给 `ccswi cp` 用 —— cp 流程只问 model + 1m，不需要整个 wizard。
 */
export async function loadModels(): Promise<string[] | null> {
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
 * 如果 priorModel 非空且不在 models 列表中，则将其前置。
 * 用于"上一档用了自定义模型名"的场景：让下一档 autocomplete 能 pre-select。
 */
export function ensureDefaultModelOption(
  models: string[] | null,
  priorModel: string | undefined,
): string[] | null {
  if (!models) return null;
  const prior = priorModel?.trim();
  if (!prior) return models;
  if (models.includes(prior)) return models;
  return [prior, ...models];
}

/**
 * 模型选择 prompt
 * 支持自由输入（直接回车用输入的文本）或从列表中选择
 *
 * Export 出来给 `ccswi cp` 用。
 */
export async function promptModel(
  message: string,
  models: string[] | null,
  defaultValue?: string,
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

  // `autocomplete.initialUserInput` only fills the search box; it does not make
  // an unknown value selectable. Keep an existing custom model as a real option
  // so pressing Enter can reliably retain it.
  const selectableModels = ensureDefaultModelOption(models, defaultValue)!;

  const CUSTOM = "__ccswi_custom__";

  const topOptions: { value: string; label: string }[] = [
    { value: CUSTOM, label: "✏️  Enter custom model name..." },
  ];

  const allOptions = [
    ...topOptions,
    ...selectableModels.map((name) => ({ value: name, label: name })),
  ];

  // 判断 defaultValue 是否在选项列表中（以便预选中）
  const hasInOptions = defaultValue
    ? allOptions.some((o) => o.value === defaultValue)
    : false;

  // 使用 autocomplete，支持搜索过滤
  const result = checkCancel(
    await p.autocomplete<string>({
      message,
      options: allOptions,
      initialValue: hasInOptions ? defaultValue : undefined,
      validate: (value: string | string[] | undefined) => {
        if (typeof value !== "string" || !value.trim()) {
          return "Model is required.";
        }
        return undefined;
      },
      filter: (search: string, option: { value: string; label?: string }) => {
        // 特殊选项只在无搜索时显示
        if (option.value === CUSTOM) return !search;
        if (!search) return true;
        return fuzzyScore(search, option.value) > 0;
      },
    }),
  );

  if (result === CUSTOM) {
    return checkCancel(
      await p.text({
        message,
        defaultValue: defaultValue || "",
        placeholder: "e.g. claude-sonnet-4-6, deepseek-v4-pro",
      }),
    );
  }

  // Be defensive against prompt-library regressions: never let an undefined
  // selection travel downstream to callers that expect a model string.
  if (typeof result !== "string" || !result.trim()) {
    if (defaultValue?.trim()) return defaultValue.trim();
    throw new Error("Model is required.");
  }

  return result;
}

/**
 * 掩码 token（前 4 + 后 4 可见，中间显示实际位数的 *）
 */
function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "*".repeat(token.length);
  const midLen = token.length - 8;
  return `${token.slice(0, 4)}${"•".repeat(midLen)}${token.slice(-4)}`;
}

/**
 * 1M 支持选择 prompt
 *
 * Export 出来给 `ccswi cp` 用。
 */
export async function prompt1m(label: string, defaultValue: boolean = true): Promise<boolean> {
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
  const isNoVendor = vendor.name === "手动配置";

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
      validate: (value: string | undefined) => {
        if (isNoVendor && !value?.trim()) return "Endpoint URL is required.";
        return undefined;
      },
    }),
  );

  // 4. API Key / Token
  const token = checkCancel(
    await p.password({
      message: "API Key / Token (ANTHROPIC_AUTH_TOKEN):",
      validate: (value: string | undefined) => {
        if (!value?.trim()) return "API Key is required.";
        return undefined;
      },
    }),
  );

  // 5. 设置供应商上下文 & 预加载模型列表
  setProviderContext({
    endpoint: endpoint.trim() || undefined,
    modelsUrl: vendor.modelsUrl,
    token: token?.trim() || undefined,
  });
  const models = await loadModels();

  // 6. Model（v4.0.0+：单一模型字段，覆盖原本的 opus/sonnet/haiku 三档）
  const model = await promptModel("Model:", models);

  // 7. Model 1M
  const model1m = await prompt1m("Model", true);

  // 构建 profile
  const profile: Profile = {
    name: name.trim().toLowerCase(),
    vendor: isNoVendor ? "" : vendor.name,
    endpoint: endpoint.trim(),
    token: token?.trim() || "",
    model: model.trim(),
    model_1m: model1m,
  };

  return profile;
}

/**
 * 编辑已有 profile 的交互流程
 * vendor 和 name 不可改，模型使用选择框（默认选中当前值）
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

  // API Key / Token（显示打码值，回车保留，修改则覆盖）
  const tokenMasked = maskToken(existing.token);
  const tokenRaw = checkCancel(
    await p.text({
      message: "API Key / Token (ANTHROPIC_AUTH_TOKEN):",
      initialValue: tokenMasked,
      placeholder: "Press Enter to keep current",
    }),
  );
  const token = tokenRaw.trim() === tokenMasked ? existing.token : tokenRaw.trim();

  // 预加载模型列表（用现有 endpoint / token）
  setProviderContext({
    endpoint: endpoint.trim() || existing.endpoint || undefined,
    token: token || existing.token || undefined,
  });
  const models = await loadModels();

  // Opus 模型
  const model = await promptModel("Model:", models, existing.model);
  const model1m = await prompt1m("Model", existing.model_1m);

  return {
    name: existing.name,
    vendor: existing.vendor,
    endpoint: endpoint.trim(),
    token,
    model: model.trim(),
    model_1m: model1m,
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
