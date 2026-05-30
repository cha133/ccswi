import pc from "picocolors";
import type { Profile, ProfilesStore } from "../types";
import { getProfileEntries } from "../core/config";

/**
 * 打印成功信息
 */
export function success(msg: string): void {
  console.log(pc.green("✔"), msg);
}

/**
 * 打印错误信息
 */
export function error(msg: string): void {
  console.error(pc.red("✖"), msg);
}

/**
 * 打印普通信息
 */
export function info(msg: string): void {
  console.log(pc.cyan("ℹ"), msg);
}

/**
 * 打印警告信息
 */
export function warn(msg: string): void {
  console.log(pc.yellow("⚠"), msg);
}

/**
 * 格式化 profile 列表（用于 ccsw ls）
 */
export function formatProfileTable(store: ProfilesStore): void {
  const entries = getProfileEntries(store);
  if (entries.length === 0) {
    info("No profiles yet. Run `ccsw new` to create one.");
    return;
  }

  console.log(pc.bold("  Profiles:"));

  entries.forEach(([key, profile], i) => {
    const isActive = store.active === key;
    const marker = isActive ? pc.green("*") : " ";
    const index = pc.dim(`${i + 1}.`);
    const name = isActive ? pc.green(pc.bold(profile.name)) : profile.name;
    const vendor = profile.vendor ? `  ${pc.dim(`(${profile.vendor})`)}` : "";
    console.log(`  ${marker} ${index} ${name}${vendor}`);
  });
}

/**
 * 格式化单个 profile 详情（用于 ccsw show）
 */
export function formatProfileDetail(profile: Profile, index?: number): void {
  if (index !== undefined) {
    console.log(pc.bold(`  Profile #${index + 1}: ${profile.name}`));
  } else {
    console.log(pc.bold(`  Profile: ${profile.name}`));
  }
  console.log(`  ${pc.dim("vendor:")}    ${profile.vendor || pc.dim("(none)")}`);
  console.log(`  ${pc.dim("endpoint:")}  ${profile.endpoint || pc.dim("(none)")}`);
  console.log(`  ${pc.dim("token:")}     ${profile.token ? maskToken(profile.token) : pc.dim("(none)")}`);
  console.log(`  ${pc.dim("opus:")}      ${formatModelWith1m(profile.opus, profile.opus_1m)}`);
  console.log(`  ${pc.dim("sonnet:")}    ${formatModelWith1m(profile.sonnet, profile.sonnet_1m)}`);
  console.log(`  ${pc.dim("haiku:")}     ${profile.haiku || pc.dim("(none)")}`);
}

/**
 * 格式化模型名（含 1m 后缀指示）
 */
function formatModelWith1m(model: string, has1m: boolean): string {
  if (!model) return pc.dim("(none)");
  return has1m ? `${model} ${pc.dim("[1m]")}` : model;
}

/**
 * 掩码 token（只显示前 4 位和后 4 位）
 */
function maskToken(token: string): string {
  if (token.length <= 12) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
