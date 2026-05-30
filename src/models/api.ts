import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { modelsCachePath, ensureCcswiDir } from "../utils/paths";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  fetchedAt: number;
  models: string[]; // 去重后的纯模型名列表（不含 provider 前缀）
}

interface OpenRouterModel {
  id: string; // 格式: "provider/model-name"
  name?: string;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

/**
 * 从 OpenRouter API 获取所有模型名
 * 响应格式: { "data": [{ "id": "provider/model-name", ... }] }
 * 只提取纯模型名，去掉 provider 前缀
 */
async function fetchModelNames(): Promise<string[]> {
  const response = await fetch(OPENROUTER_MODELS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as OpenRouterResponse;
  const nameSet = new Set<string>();

  for (const model of result.data) {
    // id 格式: "provider/model-name" 或 "model-name"
    const name = model.id.includes("/")
      ? model.id.split("/").pop()!
      : model.id;
    if (name) {
      nameSet.add(name);
    }
  }

  return [...nameSet].sort();
}

/**
 * 从缓存加载模型列表，如果缓存过期则重新拉取
 */
export async function getModelNames(): Promise<string[]> {
  const cachePath = modelsCachePath();

  // 检查缓存
  if (existsSync(cachePath)) {
    try {
      const content = readFileSync(cachePath, "utf-8");
      const cache = JSON.parse(content) as CacheData;

      if (Date.now() - cache.fetchedAt < CACHE_TTL_MS && cache.models?.length) {
        return cache.models;
      }
    } catch {
      // 缓存损坏，重新拉取
    }
  }

  // 重新拉取
  const models = await fetchModelNames();

  // 保存缓存
  ensureCcswiDir();
  const cacheData: CacheData = {
    fetchedAt: Date.now(),
    models,
  };
  writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), "utf-8");

  return models;
}
