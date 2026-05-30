#!/usr/bin/env bun
import { program } from "commander";
import { register as registerLs } from "./commands/ls";
import { register as registerNew } from "./commands/new";
import { register as registerUse } from "./commands/use";
import { register as registerShow } from "./commands/show";
import { register as registerEdit } from "./commands/edit";
import { register as registerRm } from "./commands/rm";
import { register as registerSet } from "./commands/set";
import { register as registerSave } from "./commands/save";
import { register as registerRename } from "./commands/rename";

program
  .name("ccsw")
  .version("0.1.0")
  .description("Lightweight CLI to switch Claude Code settings.json profiles");

// 注册所有命令
registerSave(program);
registerLs(program);
registerNew(program);
registerUse(program);
registerShow(program);
registerEdit(program);
registerRm(program);
registerRename(program);
registerSet(program);

program.parse();
