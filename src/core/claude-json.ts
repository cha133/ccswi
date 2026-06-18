import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { claudeJsonPath } from "../utils/paths";

/**
 * ~/.claude.json 的 MCP 服务器项结构
 * 实际 Claude Code 还支持 sse/ws/sse-ide/ws-ide 等，但我们写入的只会是这三种主要类型
 */
export interface McpServerEntry {
  type: "http" | "stdio" | "sse";
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * 单个 project 条目的形态
 * 字段名/语义对齐 Claude Code 内部的 ProjectConfig（见 claude-code/src/utils/config.ts）
 * 全部 optional —— claude-code 的 getCurrentProjectConfig 走 ?? DEFAULT_PROJECT_CONFIG 兜底
 */
export interface ProjectConfig {
  allowedTools?: string[];
  mcpContextUris?: string[];
  mcpServers?: Record<string, McpServerEntry>;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  hasTrustDialogAccepted?: boolean;
  projectOnboardingSeenCount?: number;
  hasCompletedProjectOnboarding?: boolean;
  hasClaudeMdExternalIncludesApproved?: boolean;
  hasClaudeMdExternalIncludesWarningShown?: boolean;
}

/**
 * Claude Code 内部 DEFAULT_PROJECT_CONFIG 的镜像
 * 用于在创建新条目时填充完整默认值，避免未来 claude-code 不再走 ?? 兜底时被嫌弃
 */
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  allowedTools: [],
  mcpContextUris: [],
  mcpServers: {},
  enabledMcpjsonServers: [],
  disabledMcpjsonServers: [],
  hasTrustDialogAccepted: false,
  projectOnboardingSeenCount: 0,
  hasClaudeMdExternalIncludesApproved: false,
  hasClaudeMdExternalIncludesWarningShown: false,
};

/**
 * ~/.claude.json 的形状
 * 我们只显式关心这些字段，其余字段通过 [k: string] 索引签名透传，
 * 避免 read-merge-write 时把用户的 userID/numStartups 等丢掉
 */
export interface ClaudeJsonShape {
  hasCompletedOnboarding?: boolean;
  theme?: string;
  mcpServers?: Record<string, McpServerEntry>;
  projects?: Record<string, ProjectConfig>;
  [k: string]: unknown;
}

/**
 * 读取 ~/.claude.json
 * 不存在或损坏 → 返回 {}（损坏时打 warning）
 */
export function readClaudeJson(): ClaudeJsonShape {
  const path = claudeJsonPath();
  if (!existsSync(path)) {
    return {};
  }
  const content = readFileSync(path, "utf-8");
  try {
    return JSON.parse(content) as ClaudeJsonShape;
  } catch {
    console.warn("⚠ ~/.claude.json 格式损坏，将按空配置处理");
    return {};
  }
}

/**
 * 写入 ~/.claude.json（2-space 缩进 + 末尾换行）
 */
export function writeClaudeJson(data: ClaudeJsonShape): void {
  const path = claudeJsonPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * 把 ~/.claude.json 顶层的 hasCompletedOnboarding 设为 true。
 * 其他字段（projects、mcpServers、theme、userID 等）原样保留。
 */
export function setClaudeJsonOnboarding(): void {
  const data = readClaudeJson();
  data.hasCompletedOnboarding = true;
  writeClaudeJson(data);
}

/**
 * 在 ~/.claude.json 顶层的 mcpServers 中注入/覆盖一个 server。
 * 同 init 的浅合并策略：已有 mcpServers 原样保留，同名条目被新值覆盖。
 */
export function setClaudeJsonMcpServer(
  name: string,
  entry: McpServerEntry,
): void {
  const data = readClaudeJson();
  data.mcpServers = { ...(data.mcpServers ?? {}), [name]: entry };
  writeClaudeJson(data);
}

/**
 * 归一化路径用于 key 比较：小写 + 反斜杠转正斜杠 + 去掉尾部斜杠
 */
function normalizeKey(p: string): string {
  return p.toLowerCase().replace(/\\/g, "/").replace(/\/+$/, "");
}

/**
 * 在现有 projects 里查找与 homedir() 匹配的 key
 * claude-code 的 key 走 canonical git root + normalizePathForConfigKey（Windows 转 forward slash）
 * HOME 一般不是 git repo，所以会落到 cwd 本身 + 规范化；我们按常见形态依次 fallback：
 *   1. 字面值
 *   2. 反斜杠转正斜杠
 *   3. 小写 + 反斜杠转正斜杠
 *   4. 扫描全部已有 key，归一化后比较
 * 命中返回原 key（保持用户原样），没命中返回 null
 */
export function findHomeProjectKey(
  projects: Record<string, ProjectConfig>,
  home: string,
): string | null {
  const candidates = [home, home.replace(/\\/g, "/")];
  for (const c of candidates) {
    if (c in projects) return c;
  }
  const homeNormalized = normalizeKey(home);
  for (const key of Object.keys(projects)) {
    if (normalizeKey(key) === homeNormalized) return key;
  }
  return null;
}
