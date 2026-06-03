/** 供应商预设（从 cc-switch 精简而来） */
export interface ProviderPreset {
  name: string;
  endpoint: string | null; // ANTHROPIC_BASE_URL，null 表示官方（不需要 endpoint）
  websiteUrl: string;
  modelsUrl?: string; // 自定义模型列表端点（可选），如 "https://api.deepseek.com/models"
}

/** 单个配置 profile */
export interface Profile {
  name: string;       // 唯一标识，小写，可含空格
  vendor: string;     // 供应商名称（如 "DeepSeek"），空字符串表示无供应商
  endpoint: string;   // ANTHROPIC_BASE_URL
  token: string;      // ANTHROPIC_AUTH_TOKEN
  opus: string;       // Opus 模型名（不含 [1m]）
  opus_1m: boolean;   // 是否追加 [1m] 后缀
  sonnet: string;     // Sonnet 模型名（不含 [1m]）
  sonnet_1m: boolean; // 是否追加 [1m] 后缀
  haiku: string;      // Haiku 模型名（无 1m 选项）
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
    opus: "",
    opus_1m: false,
    sonnet: "",
    sonnet_1m: false,
    haiku: "",
  };
}
