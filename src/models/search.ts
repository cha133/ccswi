import { getModelNames } from "./api";
import { fuzzySearch } from "../utils/fuzzy";

let cachedModels: string[] | null = null;

/**
 * 获取所有模型名（带内存缓存）
 */
export async function getAllModelNames(): Promise<string[]> {
  if (!cachedModels) {
    cachedModels = await getModelNames();
  }
  return cachedModels;
}

/**
 * 模糊搜索模型
 */
export async function searchModels(query: string): Promise<string[]> {
  const all = await getAllModelNames();
  return fuzzySearch(query, all, (name) => name);
}

/**
 * 清除内存缓存（用于测试或强制刷新）
 */
export function clearModelCache(): void {
  cachedModels = null;
}
