#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";

const HOME = homedir();
const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME ?? join(HOME, ".config"), "abox");
const FOLDERS_FILE = join(CONFIG_DIR, "folders");
const PROFILE_FILE = join(CONFIG_DIR, "permissive-open.sb");
const CUSTOM_PROFILE_FILE = join(CONFIG_DIR, "custom.sb");

function usage(): void {
  console.log(`\
abox - lightweight macOS seatbelt wrapper

Usage:
  abox run [--project <dir>] [command ...]
  abox add folder <dir>
  abox list folders
  abox --version
  abox help

Examples:
  abox run copilot
  abox run --project ~/Projects/myapp copilot
  abox add folder ~/Projects`);
}

function ensureConfig(): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(FOLDERS_FILE)) writeFileSync(FOLDERS_FILE, "");
}

function normalizePath(p: string): string {
  return resolve(p.replace(/^~(?=\/|$)/, HOME));
}

function addFolder(dir: string): void {
  const absDir = normalizePath(dir);
  if (!existsSync(absDir)) {
    console.error(`Folder does not exist: ${absDir}`);
    process.exit(1);
  }

  ensureConfig();
  const folders = readFileSync(FOLDERS_FILE, "utf8").split("\n").filter(Boolean);
  if (folders.includes(absDir)) {
    console.log(`Already allowed: ${absDir}`);
    return;
  }

  appendFileSync(FOLDERS_FILE, `${absDir}\n`);
  console.log(`Added allowed folder: ${absDir}`);
}

function listFolders(): void {
  ensureConfig();
  console.log("Configured extra writable folders:");
  const content = readFileSync(FOLDERS_FILE, "utf8").trim();
  console.log(content || "(none)");
}

function run(projectDir: string, cmd: string[]): never {
  ensureConfig();

  const staticPaths = [
    `${HOME}/.copilot`,
    `${HOME}/.agents`,
    `${HOME}/.npm`,
    `${HOME}/.cache`,
    `${HOME}/Library/Caches`,
    "/private/tmp",
    "/tmp",
  ];

  const extra = readFileSync(FOLDERS_FILE, "utf8").split("\n").filter(Boolean);

  const profile = [
    "(version 1)",
    "(allow default)",
    '(deny file-write* (regex #"^/"))',
    '(allow file-write* (subpath (param "PROJECT_DIR")))',
    ...[...staticPaths, ...extra].map((p) => `(allow file-write* (subpath "${p}"))`),
  ].join("\n") + "\n";

  const custom = existsSync(CUSTOM_PROFILE_FILE)
    ? "\n" + readFileSync(CUSTOM_PROFILE_FILE, "utf8")
    : "";

  writeFileSync(PROFILE_FILE, profile + custom);

  const proc = Bun.spawnSync(
    ["sandbox-exec", "-f", PROFILE_FILE, "-D", `PROJECT_DIR=${projectDir}`, "-D", `HOME=${HOME}`, ...cmd],
    { stdin: "inherit", stdout: "inherit", stderr: "inherit" }
  );
  process.exit(proc.exitCode ?? 0);
}

function runCmd(args: string[]): void {
  let projectDir = process.cwd();
  let rest = args;

  if (rest[0] === "--project") {
    if (!rest[1]) { usage(); process.exit(1); }
    projectDir = normalizePath(rest[1]);
    rest = rest.slice(2);
  }

  run(projectDir, rest.length ? rest : ["copilot"]);
}

const pkg = require("../package.json");
const [, , command = "help", ...args] = process.argv;

switch (command) {
  case "--version":
  case "-v":
    console.log(pkg.version);
    break;
  case "run":
    runCmd(args);
    break;
  case "add":
    if (args[0] !== "folder" || !args[1]) { usage(); process.exit(1); }
    addFolder(args[1]);
    break;
  case "list":
    if (args[0] === "folders") { listFolders(); break; }
    usage(); process.exit(1);
  case "help":
  case "-h":
  case "--help":
    usage();
    break;
  default:
    usage();
    process.exit(1);
}
