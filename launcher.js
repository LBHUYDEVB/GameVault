/**
 * GameVault 启动器
 * 双击 exe 后由 caxa 调用此脚本：
 *   1. 在 exe 同级目录创建 GameVault-data/ 存放用户数据
 *   2. 初始化 SQLite 数据库（如果不存在）
 *   3. 启动 Next.js standalone server
 *   4. 自动打开浏览器
 */

const path = require("node:path");
const fs = require("node:fs");
const { execSync, spawn } = require("node:child_process");

const PORT = 3947;

// ── 确定数据目录 ──
// caxa 会把解压目录作为 cwd，但我们需要把数据放在用户能找到的地方
// 优先使用 GAMEVAULT_DATA 环境变量，否则用 exe 所在目录旁的 GameVault-data
function getDataDir() {
  if (process.env.GAMEVAULT_DATA) {
    return path.resolve(process.env.GAMEVAULT_DATA);
  }
  // process.argv[0] 在 caxa 中是 node 路径，process.execPath 是 exe 路径
  // caxa 设置 {{caxa}}/node_modules/.package/launcher.js
  // exe 的真实位置可以通过向上查找获得
  const exeDir = path.dirname(process.execPath);
  return path.join(exeDir, "GameVault-data");
}

const dataDir = getDataDir();
const dbPath = path.join(dataDir, "gamevault.db");
const envPath = path.join(dataDir, ".env");

// ── 初始化数据目录 ──
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[GameVault] 已创建数据目录: ${dataDir}`);
}

// 如果没有 .env，复制一份模板
const envExamplePath = path.join(__dirname, ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log(`[GameVault] 已创建配置文件: ${envPath}`);
  console.log(`[GameVault] 请在此文件中填入你的 API Key（可用记事本打开编辑）`);
}

// 加载用户的 .env 到当前进程
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// ── 初始化数据库 ──
if (!fs.existsSync(dbPath)) {
  console.log(`[GameVault] 正在初始化数据库...`);
  try {
    const Database = require("better-sqlite3");
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS "Game" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "steamAppId" TEXT,
        "externalId" TEXT,
        "playtimeMinutes" INTEGER NOT NULL DEFAULT 0,
        "userRating" REAL,
        "reviewRichText" TEXT,
        "coverUrl" TEXT,
        "tags" TEXT,
        "status" TEXT NOT NULL DEFAULT 'played',
        "lastSyncedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "PlatformAccount" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "platform" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "apiKey" TEXT,
        "syncStatus" TEXT NOT NULL DEFAULT 'idle',
        "lastSyncAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "SyncJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "platform" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'running',
        "syncedCount" INTEGER NOT NULL DEFAULT 0,
        "updatedCount" INTEGER NOT NULL DEFAULT 0,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "message" TEXT,
        "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "finishedAt" DATETIME
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Game_steamAppId_key" ON "Game"("steamAppId");
      CREATE UNIQUE INDEX IF NOT EXISTS "Game_platform_externalId_key" ON "Game"("platform", "externalId");
      CREATE INDEX IF NOT EXISTS "Game_platform_idx" ON "Game"("platform");
      CREATE INDEX IF NOT EXISTS "Game_userRating_idx" ON "Game"("userRating");
      CREATE INDEX IF NOT EXISTS "Game_playtimeMinutes_idx" ON "Game"("playtimeMinutes");
      CREATE UNIQUE INDEX IF NOT EXISTS "PlatformAccount_platform_key" ON "PlatformAccount"("platform");
    `);
    db.close();
    console.log(`[GameVault] 数据库初始化完成: ${dbPath}`);
  } catch (err) {
    console.error(`[GameVault] 数据库初始化失败:`, err.message);
  }
}

// ── 设置环境变量 ──
process.env.DATABASE_PATH = dbPath;
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.NODE_ENV = "production";
process.env.PORT = String(PORT);

// ── 启动 Next.js ──
const serverPath = path.join(__dirname, "server.js");
if (!fs.existsSync(serverPath)) {
  console.error("[GameVault] 找不到 server.js，构建可能不完整。");
  process.exit(1);
}

console.log("");
console.log("══════════════════════════════════════════════════");
console.log("  GameVault 正在启动...");
console.log("══════════════════════════════════════════════════");
console.log("");
console.log(`  数据目录: ${dataDir}`);
console.log(`  数据库:   ${dbPath}`);
console.log(`  配置文件: ${envPath}`);
console.log("");

const server = spawn(process.execPath, [serverPath], {
  env: { ...process.env },
  stdio: "inherit",
  cwd: __dirname,
});

// 等待服务器启动后打开浏览器
setTimeout(() => {
  const url = `http://localhost:${PORT}/dashboard`;
  console.log(`  浏览器打开: ${url}`);
  console.log("");
  console.log("  按 Ctrl+C 关闭服务器");
  console.log("══════════════════════════════════════════════════");
  console.log("");

  const { exec } = require("node:child_process");
  if (process.platform === "win32") {
    exec(`start "" "${url}"`);
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}, 2000);

server.on("close", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  server.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.kill("SIGTERM");
  process.exit(0);
});
