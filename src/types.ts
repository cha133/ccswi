/** 供应商预设（从 cc-switch 精简而来） */
export interface ProviderPreset {
  name: string;
  endpoint: string | null; // ANTHROPIC_BASE_URL，null 表示官方（不需要 endpoint）
  websiteUrl: string;
  modelsUrl?: string; // 自定义模型列表端点（可选），如 "https://api.deepseek.com/models"
}

/** 单个配置 profile */
export interface Profile {
  name: string;         // 唯一标识，小写，可含空格
  vendor: string;       // 供应商名称（如 "DeepSeek"），空字符串表示无供应商
  endpoint: string;     // ANTHROPIC_BASE_URL
  token: string;        // ANTHROPIC_AUTH_TOKEN
  main: string;          // 主模型名（不含 [1m]），映射到 ANTHROPIC_MODEL + ANTHROPIC_DEFAULT_OPUS_MODEL
  main_1m: boolean;      // 主模型是否追加 [1m] 后缀
  fast: string;          // 快速模型名（不含 [1m]），映射到 ANTHROPIC_DEFAULT_SONNET_MODEL + ANTHROPIC_DEFAULT_HAIKU_MODEL
  fast_1m: boolean;      // 快速模型是否追加 [1m] 后缀
}

/** profiles.toml 的顶层结构 */
export interface ProfilesStore {
  active: string | null;             // 当前生效的 profile 名
  profiles: Record<string, Profile>; // 按 name 索引
}

/** Claude Code settings.json 的结构（我们只关心 env） */
export interface ClaudeSettings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

/** 创建空 profile 的工厂函数 */
export function createEmptyProfile(name: string): Profile {
  return {
    name,
    vendor: "",
    endpoint: "",
    token: "",
    main: "",
    main_1m: false,
    fast: "",
    fast_1m: false,
  };
}
