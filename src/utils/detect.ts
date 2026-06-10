import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";

/**
 * 当前是否运行在 Windows 上
 */
export function isWindows(): boolean {
  return process.platform === "win32";
}

/**
 * 跨平台的 `which`：返回命令在 PATH 中找到的第一个绝对路径，找不到返回 null
 * - Windows: `where.exe <name>`
 * - Unix:    `command -v <name>`
 */
export function whichFirst(name: string): string | null {
  try {
    const cmd = isWindows() ? `where.exe ${name}` : `command -v ${name}`;
    const out = execSync(cmd, {
      // Unix 下 command -v 是 shell 内建，需要走 shell；Windows 下 where.exe 是独立可执行文件
      shell: isWindows() ? undefined : "/bin/sh",
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    }).trim();
    const first = out.split(/\r?\n/)[0]?.trim();
    return first || null;
  } catch {
    return null;
  }
}

/** 路径归一化（小写 + 统一斜杠），用于跨平台前缀比较 */
function normPath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

/** 判断 child 是否在 parent 目录之下（含直接子项） */
function isUnder(child: string, parent: string): boolean {
  const c = normPath(child);
  const p = normPath(parent).replace(/\/+$/, "");
  return c === p || c.startsWith(p + "/");
}

/**
 * 当前 claude 是不是通过 scoop 安装的
 * - 仅 Windows 才可能为 true
 * - 条件 1：$env:SCOOP 存在 且 `where.exe claude` 落在 $env:SCOOP 下
 * - 条件 2：~/scoop/apps/ 存在 且 `where.exe claude` 也落在 ~/scoop/ 下
 *   （单看目录存在不够，必须确认 claude 真的从那里来）
 */
export function isScoopInstall(): boolean {
  if (!isWindows()) return false;

  const claudePath = whichFirst("claude");
  if (!claudePath) return false;

  const scoopEnv = process.env.SCOOP;
  if (scoopEnv && isUnder(claudePath, scoopEnv)) {
    return true;
  }

  const homeScoop = join(homedir(), "scoop");
  if (existsSync(join(homeScoop, "apps")) && isUnder(claudePath, homeScoop)) {
    return true;
  }

  return false;
}

/** 全局 PATH 中是否能找到 ccstatusline 可执行文件 */
export function hasCcstatuslineExe(): boolean {
  return whichFirst("ccstatusline") !== null;
}

/** 全局 PATH 中是否能找到 bunx */
export function hasBunx(): boolean {
  return whichFirst("bunx") !== null;
}

/**
 * 选择运行 ccstatusline 的命令字符串
 * 探测顺序（与平台无关）：ccstatusline → bunx ccstatusline → npx ccstatusline
 */
export function detectCcstatuslineCommand(): string {
  if (hasCcstatuslineExe()) return "ccstatusline";
  if (hasBunx()) return "bunx ccstatusline";
  return "npx ccstatusline";
}

// 路径分隔符常量（暴露给单元探测脚本可能用得到）
export const PATH_SEP = sep;
