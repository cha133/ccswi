import type { ProfilesStore, Profile } from "../types";

/**
 * 模糊匹配：大小写不敏感的子串匹配 + token 打分
 * 返回匹配得分，0 表示不匹配
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (!q) return 1;
  if (!t) return 0;

  // 完全匹配得分最高
  if (t === q) return 100;

  // 前缀匹配
  if (t.startsWith(q)) return 90;

  // 子串匹配
  if (t.includes(q)) return 70;

  // token 级匹配：query 按空格分词，每个词都要在 target 中出现
  const tokens = q.split(/\s+/);
  if (tokens.length > 1 && tokens.every((token) => t.includes(token))) {
    return 50 + tokens.length * 5;
  }

  // 单 token 子串匹配
  if (tokens.some((token) => token.length >= 2 && t.includes(token))) {
    return 30;
  }

  return 0;
}

/**
 * 在列表中模糊搜索，返回按得分排序的结果
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
): T[] {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}

/**
 * 解析 profile 引用：支持名称（模糊匹配）和数字索引
 * 如果没找到或有歧义，抛出错误
 */
export function resolveProfileRef(
  ref: string,
  store: ProfilesStore,
): { profile: Profile; key: string } {
  const entries = Object.entries(store.profiles);
  if (entries.length === 0) {
    throw new Error("No profiles found.");
  }

  // 数字索引（1-based）
  const index = parseInt(ref, 10);
  if (!isNaN(index)) {
    if (index < 1 || index > entries.length) {
      throw new Error(
        `Index ${index} out of range. Use 1-${entries.length}.`,
      );
    }
    const [key, profile] = entries[index - 1]!;
    return { profile, key };
  }

  // 精确匹配
  const exact = entries.find(([key]) => key === ref.toLowerCase().trim());
  if (exact) {
    return { profile: exact[1], key: exact[0] };
  }

  // 模糊匹配
  const matches = fuzzySearch(ref, entries, ([, p]) => p.name);
  if (matches.length === 0) {
    throw new Error(`No profile matching "${ref}".`);
  }
  if (matches.length > 1 && fuzzyScore(ref, matches[0]![1].name) === fuzzyScore(ref, matches[1]![1].name)) {
    const names = matches.slice(0, 3).map((m) => m[1].name).join(", ");
    throw new Error(`Ambiguous match "${ref}". Candidates: ${names}`);
  }

  const [key, profile] = matches[0]!;
  return { profile, key };
}
