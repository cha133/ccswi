import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { modelsCachePath, ensureCcswiDir } from "../utils/paths";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  fetchedAt: number;
  source: string; // "openrouter" 或 endpoint URL
  models: string[];
}

// ─── 供应商上下文（会话级单例） ───

interface ProviderContext {
  endpoint?: string;
  modelsUrl?: string;
  token?: string;
}

let ctx: ProviderContext = {};

/** 设置供应商上下文，后续 getAllModelNames() 自动使用 */
export function setProviderContext(c: ProviderContext): void {
  ctx = c;
}

// ─── 内存缓存 ───

let memCache: string[] | null = null;
let memCacheKey: string | undefined;

function currentCacheKey(): string {
  return ctx.endpoint || "openrouter";
}

/** 清除内存缓存（用于测试或强制刷新） */
export function clearModelCache(): void {
  memCache = null;
  memCacheKey = undefined;
}

// ─── 已知的 Anthropic 兼容子路径（按长度降序） ───

const KNOWN_COMPAT_SUFFIXES = [
  "/api/claudecode",
  "/api/anthropic",
  "/apps/anthropic",
  "/api/coding",
  "/api/plan",
  "/claudecode",
  "/anthropic",
  "/step_plan",
  "/coding",
  "/claude",
];

function stripCompatSuffix(url: string): string | null {
  for (const suffix of KNOWN_COMPAT_SUFFIXES) {
    if (url.endsWith(suffix)) {
      return url.slice(0, url.length - suffix.length);
    }
  }
  return null;
}

/**
 * 构造供应商模型列表端点的候选 URL（参考 cc-switch）
 */
function buildProviderCandidates(
  endpoint: string,
  modelsUrl?: string,
): string[] {
  if (modelsUrl?.trim()) {
    return [modelsUrl.trim()];
  }

  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (!trimmed) return [];

  const candidates: string[] = [];

  // 主候选：/v1/models 或 /models
  if (trimmed.endsWith("/v1")) {
    candidates.push(`${trimmed}/models`);
  } else {
    candidates.push(`${trimmed}/v1/models`);
  }

  // 剥离兼容子路径后重试
  const stripped = stripCompatSuffix(trimmed);
  if (stripped) {
    const root = stripped.replace(/\/+$/, "");
    if (root && root.includes("://")) {
      candidates.push(`${root}/v1/models`);
      candidates.push(`${root}/models`);
    }
  }

  // 去重
  return [...new Set(candidates)];
}

// ─── 数据源 ───

/**
 * 从供应商端点获取模型列表
 * 尝试多个候选 URL，第一个成功的就返回
 */
async function fetchFromProvider(): Promise<string[]> {
  const { endpoint, modelsUrl, token } = ctx;
  if (!endpoint) throw new Error("No provider endpoint");

  const candidates = buildProviderCandidates(endpoint, modelsUrl);

  for (const url of candidates) {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) continue; // 404/405 → 试下一个

      const json = (await resp.json()) as { data?: { id: string }[] };
      if (!Array.isArray(json.data) || json.data.length === 0) continue;

      const models = json.data
        .map((m) => m.id)
        .filter((id): id is string => !!id)
        .sort();

      if (models.length > 0) return models;
    } catch {
      // 网络错误、超时、解析失败 → 试下一个
    }
  }

  throw new Error("No models from provider");
}

/**
 * 从 OpenRouter API 获取全量模型列表
 * 响应格式: { "data": [{ "id": "provider/model-name", ... }] }
 * 去掉 provider 前缀，过滤 :free 后缀，去重
 */
async function fetchFromOpenRouter(): Promise<string[]> {
  const resp = await fetch(OPENROUTER_MODELS_URL, {
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch OpenRouter models: ${resp.status} ${resp.statusText}`,
    );
  }

  const result = (await resp.json()) as { data: { id: string }[] };
  const nameSet = new Set<string>();

  for (const model of result.data) {
    // 过滤掉 :free 后缀
    if (model.id.endsWith(":free")) continue;

    // 去掉 provider 前缀： "anthropic/claude-sonnet-4-5" → "claude-sonnet-4-5"
    const name = model.id.includes("/")
      ? model.id.split("/").pop()!
      : model.id;
    if (name) {
      nameSet.add(name);
    }
  }

  return [...nameSet].sort();
}

// ─── 磁盘缓存 ───

function loadFromDiskCache(cachePath: string, key: string): string[] | null {
  if (!existsSync(cachePath)) return null;
  try {
    const content = readFileSync(cachePath, "utf-8");
    const cache = JSON.parse(content) as Record<string, CacheData>;
    const entry = cache[key];
    if (
      entry &&
      Date.now() - entry.fetchedAt < CACHE_TTL_MS &&
      entry.models?.length
    ) {
      return entry.models;
    }
  } catch {
    // 缓存损坏
  }
  return null;
}

function saveToDiskCache(
  cachePath: string,
  key: string,
  models: string[],
): void {
  ensureCcswiDir();

  let cache: Record<string, CacheData> = {};
  if (existsSync(cachePath)) {
    try {
      cache = JSON.parse(readFileSync(cachePath, "utf-8"));
    } catch {
      // 缓存损坏，覆盖
    }
  }

  cache[key] = { fetchedAt: Date.now(), source: key, models };
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

// ─── 对外接口 ───

/**
 * 获取所有模型名（带内存 + 磁盘缓存）
 * 优先从供应商获取，失败则 fallback 到 OpenRouter
 * 使用前先调用 setProviderContext() 设置上下文
 */
export async function getAllModelNames(): Promise<string[]> {
  const key = currentCacheKey();

  // 内存缓存命中
  if (memCache && memCacheKey === key) {
    return memCache;
  }

  const cachePath = modelsCachePath();

  // 磁盘缓存命中
  const disk = loadFromDiskCache(cachePath, key);
  if (disk) {
    memCache = disk;
    memCacheKey = key;
    return disk;
  }

  // 1. 先尝试从供应商获取
  if (ctx.endpoint) {
    try {
      const models = await fetchFromProvider();
      saveToDiskCache(cachePath, key, models);
      memCache = models;
      memCacheKey = key;
      return models;
    } catch {
      // 供应商获取失败，继续 fallback
    }
  }

  // 2. Fallback 到 OpenRouter
  const models = await fetchFromOpenRouter();
  saveToDiskCache(cachePath, "openrouter", models);
  memCache = models;
  memCacheKey = "openrouter";
  return models;
}
