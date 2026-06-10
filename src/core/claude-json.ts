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
 * ~/.claude.json 的形状
 * 我们只显式关心这三个字段，其余字段通过 [k: string] 索引签名透传，
 * 避免 read-merge-write 时把用户的 projects/userID/numStartups 等丢掉
 */
export interface ClaudeJsonShape {
  hasCompletedOnboarding?: boolean;
  theme?: string;
  mcpServers?: Record<string, McpServerEntry>;
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
