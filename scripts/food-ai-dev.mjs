import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const serverDir = path.join(root, "ml-models", "food-ai-server");

const pythonWin = path.join(root, ".venv-food-ai", "Scripts", "python.exe");
const pythonUnix = path.join(root, ".venv-food-ai", "bin", "python");
const pythonExe = fs.existsSync(pythonWin) ? pythonWin : pythonUnix;

if (!fs.existsSync(pythonExe)) {
  console.error("[!] Missing .venv-food-ai. Run npm run food-ai:venv:win (or food-ai:venv) first.");
  process.exit(1);
}

const port = process.env.FOOD_AI_PORT || "8788";
const host = process.env.FOOD_AI_HOST || "127.0.0.1";

const env = { ...process.env, CHAT_BOT_CHEF_ROOT: root };

console.log(`Food AI API: http://${host}:${port}  (set FOOD_AI_PORT / FOOD_AI_HOST to override)`);

const child = spawn(
  pythonExe,
  ["-m", "uvicorn", "app:app", "--reload", `--host=${host}`, `--port=${port}`],
  { cwd: serverDir, stdio: "inherit", env, shell: false }
);

child.on("exit", (code) => process.exit(code ?? 1));
