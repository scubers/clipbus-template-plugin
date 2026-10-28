import { spawn } from "node:child_process";
import { access, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function requireNpmInvocation() {
  const npmPath = process.env.CLIPBUS_PLUGIN_NPM_PATH;
  if (!npmPath) {
    throw new Error("CLIPBUS_PLUGIN_NPM_PATH is required");
  }
  try {
    await access(npmPath);
  } catch {
    throw new Error("CLIPBUS_PLUGIN_NPM_PATH is unavailable");
  }
  const effectivePath = await realpath(npmPath).catch(() => npmPath);
  const isJavaScriptCli = /\.(?:c|m)?js$/i.test(effectivePath);
  return isJavaScriptCli
    ? { command: process.execPath, prefix: [npmPath] }
    : { command: npmPath, prefix: [] };
}

function runNpm(invocation, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, [...invocation.prefix, ...args], {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

/** With a committed lockfile, install exactly the versions and checksums it pins. */
async function hasLockfile() {
  try {
    await access(path.join(projectRoot, "package-lock.json"));
    return true;
  } catch {
    return false;
  }
}

const npmInvocation = await requireNpmInvocation();
await runNpm(npmInvocation, [(await hasLockfile()) ? "ci" : "install"]);
await runNpm(npmInvocation, ["run", "build"]);
