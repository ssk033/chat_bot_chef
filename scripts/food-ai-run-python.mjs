import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const scriptName = process.argv[2];
if (!scriptName) {
  console.error("Usage: node scripts/food-ai-run-python.mjs <script.py> [args...]");
  process.exit(1);
}

const scriptPath = path.isAbsolute(scriptName)
  ? scriptName
  : path.join(root, "ml-models", "food-ai-server", scriptName);

const pythonWin = path.join(root, ".venv-food-ai", "Scripts", "python.exe");
const pythonUnix = path.join(root, ".venv-food-ai", "bin", "python");
const pythonExe = fs.existsSync(pythonWin) ? pythonWin : pythonUnix;

if (!fs.existsSync(pythonExe)) {
  console.error("[!] Missing .venv-food-ai. Run npm run food-ai:venv:win (or food-ai:venv) first.");
  process.exit(1);
}

if (!fs.existsSync(scriptPath)) {
  console.error(`[!] Script not found: ${scriptPath}`);
  process.exit(1);
}

const env = { ...process.env, CHAT_BOT_CHEF_ROOT: root };
const child = spawn(pythonExe, [scriptPath, ...process.argv.slice(3)], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 1));
