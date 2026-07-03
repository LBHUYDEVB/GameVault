/**
 * GameVault Release 构建脚本
 *
 * 用法: node scripts/build-release.mjs
 *
 * 流程:
 *   1. prisma generate
 *   2. next build (standalone)
 *   3. 收集产物 + 下载便携版 node.exe
 *   4. 打包为 GameVault-portable.zip
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import archiver from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const STANDALONE = path.join(ROOT, ".next", "standalone");
const STAGE = path.join(DIST, "GameVault");

const NODE_VERSION = process.version; // e.g. v22.14.0
const NODE_ARCH = process.arch;       // x64
const NODE_URL = `https://nodejs.org/dist/${NODE_VERSION}/win-${NODE_ARCH}/node.exe`;

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit", ...opts });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Resolve symlinks to their actual target
    const stat = fs.lstatSync(srcPath);
    if (stat.isSymbolicLink()) {
      const realPath = fs.realpathSync(srcPath);
      const realStat = fs.statSync(realPath);
      if (realStat.isDirectory()) {
        copyDir(realPath, destPath);
      } else {
        fs.copyFileSync(realPath, destPath);
      }
    } else if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function downloadFile(url, dest) {
  console.log(`  下载: ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`下载失败: HTTP ${res.status} ${url}`);
  const fileStream = createWriteStream(dest);
  await pipeline(res.body, fileStream);
  const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
  console.log(`  完成: ${sizeMB} MB`);
}

async function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(archive.pointer()));
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, "GameVault");
    archive.finalize();
  });
}

// ═══════════════════════════════════════════════════

console.log("══════════════════════════════════════════════════");
console.log("  GameVault Release Builder");
console.log("══════════════════════════════════════════════════\n");

// Step 1: Clean
console.log("[1/7] 清理旧构建产物...");
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

// Step 2: Prisma generate
console.log("[2/7] 生成 Prisma Client...");
run("npx prisma generate");

// Step 3: Next.js build
console.log("[3/7] 构建 Next.js (standalone)...");
run("npx next build");

if (!fs.existsSync(STANDALONE)) {
  console.error("ERROR: .next/standalone/ 不存在");
  process.exit(1);
}

// Step 4: Assemble staging directory
console.log("[4/7] 组装发布目录...");
fs.mkdirSync(STAGE, { recursive: true });

// Copy standalone output
copyDir(STANDALONE, STAGE);

// Copy static assets
const staticSrc = path.join(ROOT, ".next", "static");
const staticDest = path.join(STAGE, ".next", "static");
if (fs.existsSync(staticSrc)) copyDir(staticSrc, staticDest);

// Copy public/
const publicSrc = path.join(ROOT, "public");
const publicDest = path.join(STAGE, "public");
if (fs.existsSync(publicSrc)) copyDir(publicSrc, publicDest);

// Copy prisma/ (migrations + schema)
copyDir(path.join(ROOT, "prisma"), path.join(STAGE, "prisma"));

// Copy launcher.js + .env.example
fs.copyFileSync(path.join(ROOT, "launcher.js"), path.join(STAGE, "launcher.js"));
const envExample = path.join(ROOT, ".env.example");
if (fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, path.join(STAGE, ".env.example"));
}

// Ensure better-sqlite3 native module is included
const bsqlSrc = path.join(ROOT, "node_modules", "better-sqlite3");
const bsqlDest = path.join(STAGE, "node_modules", "better-sqlite3");
if (fs.existsSync(bsqlSrc) && !fs.existsSync(bsqlDest)) copyDir(bsqlSrc, bsqlDest);

const bindingsSrc = path.join(ROOT, "node_modules", "bindings");
const bindingsDest = path.join(STAGE, "node_modules", "bindings");
if (fs.existsSync(bindingsSrc) && !fs.existsSync(bindingsDest)) copyDir(bindingsSrc, bindingsDest);

const fileUriSrc = path.join(ROOT, "node_modules", "file-uri-to-path");
const fileUriDest = path.join(STAGE, "node_modules", "file-uri-to-path");
if (fs.existsSync(fileUriSrc) && !fs.existsSync(fileUriDest)) copyDir(fileUriSrc, fileUriDest);

// Remove sensitive files that Next.js standalone copies from project root
for (const sensitive of [".env", "dev.db", "dev.db-journal"]) {
  const fp = path.join(STAGE, sensitive);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log(`  已移除敏感文件: ${sensitive}`);
  }
}

console.log("  staging 目录组装完成");

// Step 5: Download portable Node.js
console.log("[5/7] 下载便携版 Node.js...");
const nodeExeDest = path.join(STAGE, "node.exe");
if (!fs.existsSync(nodeExeDest)) {
  await downloadFile(NODE_URL, nodeExeDest);
} else {
  console.log("  已存在，跳过下载");
}

// Step 6: Create launcher bat
console.log("[6/7] 创建启动脚本...");
const batContent = `@echo off
chcp 65001 >nul
title GameVault
echo.
echo ══════════════════════════════════════════════════
echo   GameVault - 个人游戏记录管理
echo ══════════════════════════════════════════════════
echo.
echo   正在启动，请稍候...
echo   启动后会自动打开浏览器
echo   关闭此窗口即可停止服务
echo.
"%~dp0node.exe" "%~dp0launcher.js"
pause
`;
fs.writeFileSync(path.join(STAGE, "GameVault.bat"), batContent, "utf-8");

// Step 7: Create zip
console.log("[7/7] 打包为 zip...");
const zipPath = path.join(DIST, "GameVault-portable.zip");
const totalBytes = await createZip(STAGE, zipPath);
const sizeMB = (totalBytes / 1024 / 1024).toFixed(1);

console.log("\n══════════════════════════════════════════════════");
console.log(`  构建完成！`);
console.log(`  zip:  ${zipPath}`);
console.log(`  大小: ${sizeMB} MB`);
console.log("");
console.log("  用户使用方法：");
console.log("  1. 解压 GameVault-portable.zip");
console.log("  2. 双击 GameVault.bat 启动");
console.log("  3. 浏览器自动打开 http://localhost:3947");
console.log("══════════════════════════════════════════════════\n");
