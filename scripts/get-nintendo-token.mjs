/**
 * Nintendo Session Token 获取工具
 * 
 * 使用方法：
 *   node scripts/get-nintendo-token.mjs
 * 
 * 流程：
 *   1. 脚本生成一个任天堂登录链接
 *   2. 你用浏览器打开这个链接，登录你的任天堂账号
 *   3. 登录后，右键点击「Select this account」按钮 → 复制链接地址
 *   4. 把复制的链接粘贴回命令行，回车
 *   5. 脚本自动换取 session_token（有效期 2 年）
 *   6. 把 session_token 粘贴到网站设置页面即可
 */

import crypto from "node:crypto";
import readline from "node:readline";

const CLIENT_ID = "5c38e31cd085304b";

// 生成 PKCE 验证器
const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

// 构造授权 URL
const params = new URLSearchParams({
  state: crypto.randomBytes(16).toString("hex"),
  redirect_uri: `npf${CLIENT_ID}://auth`,
  client_id: CLIENT_ID,
  scope: "openid user user.mii user.email user.links[].id",
  response_type: "session_token_code",
  session_token_code_challenge: codeChallenge,
  session_token_code_challenge_method: "S256",
  theme: "login_form",
});

const authUrl = `https://accounts.nintendo.com/connect/1.0.0/authorize?${params}`;

console.log("");
console.log("═══════════════════════════════════════════════════════════");
console.log("  Nintendo Session Token 获取工具");
console.log("═══════════════════════════════════════════════════════════");
console.log("");
console.log("【第 1 步】用浏览器打开下面这个链接：");
console.log("");
console.log(authUrl);
console.log("");
console.log("【第 2 步】登录你的任天堂账号");
console.log("");
console.log('【第 3 步】登录成功后，页面会显示「Select this account」按钮');
console.log("           右键点击这个按钮 → 选择「复制链接地址」");
console.log("");
console.log("【第 4 步】把复制的链接粘贴到下面，然后按回车：");
console.log("");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("请粘贴链接> ", async (url) => {
  rl.close();

  const codeMatch = url.match(/session_token_code=([^&]+)/);
  if (!codeMatch) {
    console.error("");
    console.error("❌ 链接格式不对，没有找到 session_token_code。请确认复制的是按钮的链接地址。");
    process.exit(1);
  }

  const sessionTokenCode = codeMatch[1];

  console.log("");
  console.log("正在换取 session_token...");

  try {
    const res = await fetch("https://accounts.nintendo.com/connect/1.0.0/api/session_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "com.nintendo.znej/1.13.0 (Android/7.1.2)",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        session_token_code: sessionTokenCode,
        session_token_code_verifier: codeVerifier,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ 请求失败: HTTP ${res.status}`);
      console.error(text);
      process.exit(1);
    }

    const data = await res.json();
    const sessionToken = data.session_token;

    console.log("");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  ✅ 获取成功！");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");
    console.log("你的 session_token（有效期约 2 年）：");
    console.log("");
    console.log(sessionToken);
    console.log("");
    console.log("请把上面这串 token 复制到网站的「平台接入 → Nintendo → Session Token」中，");
    console.log("然后点击同步即可。");
    console.log("");
  } catch (e) {
    console.error(`❌ 网络请求异常: ${e.message}`);
    process.exit(1);
  }
});
