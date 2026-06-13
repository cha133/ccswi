#!/usr/bin/env bun
import { program } from "commander";
import { register as registerUse } from "./commands/use";
import { register as registerLs } from "./commands/ls";
import { register as registerAdd } from "./commands/add";
import { register as registerShow } from "./commands/show";
import { register as registerEdit } from "./commands/edit";
import { register as registerSave } from "./commands/save";
import { register as registerRm } from "./commands/rm";
import { register as registerRename } from "./commands/rename";
import { register as registerSet } from "./commands/set";
import { register as registerInit } from "./commands/init";
import { register as registerCache } from "./commands/cache";
import pkg from "../package.json" with { type: "json" };

program
  .name("ccswi")
  .version(pkg.version, "-v, --version")
  .description("Lightweight CLI to switch Claude Code settings.json profiles");

// 注册所有命令（按使用频率排序）
registerUse(program);
registerLs(program);
registerAdd(program);
registerShow(program);
registerEdit(program);
registerSave(program);
registerRm(program);
registerRename(program);
registerSet(program);
registerInit(program);
registerCache(program);

program.parse();
