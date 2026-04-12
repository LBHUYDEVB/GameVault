# Game Tracker

一个本地运行的个人游戏记录网站，聚合 Steam / PlayStation / Nintendo 三个平台的游戏时长数据，支持评分和详细评测管理。

采用 **复古未来主义（Retro-Futuristic）** 视觉风格。

## 功能

- **三平台游戏同步**
  - Steam：官方 API 直连
  - PlayStation：通过 NPSSO token 获取游戏列表与时长（精确到秒）
  - Nintendo：通过 session_token 获取游戏列表与时长（精确到分钟）
- **Dashboard 总览**
  - 全平台游戏总时长、总数量统计
  - 按评分 / 时长排序
  - 模糊搜索游戏
  - 时长分级配色（6 档，从灰色到发光洋红）
- **游戏详情页**
  - 封面、平台、时长、评分
  - 详细评测（富文本）
- **后台管理**
  - 图形化编辑评分（0~10，步进 0.5）
  - Tiptap 富文本编辑器撰写评测
  - 手动添加 / 删除游戏
- **平台接入设置**
  - 图形化填写各平台凭证
  - 一键同步按钮

## 技术栈

- **前端/服务**：Next.js 16 (App Router) + TypeScript
- **样式**：Tailwind CSS（复古未来主义 design tokens）
- **数据库**：SQLite（Prisma ORM）
- **富文本**：Tiptap
- **PlayStation API**：psn-api
- **Nintendo API**：原生 HTTP（逆向工程接口）

## 快速开始

### 方式一：下载便携版（推荐）

无需安装 Node.js，双击即用：

1. 前往 [Releases](https://github.com/LBHUYDEVB/GameVault/releases) 下载 `GameVault-portable.zip`
2. 解压到任意目录
3. 双击 `GameVault.bat` 启动
4. 浏览器会自动打开 `http://localhost:3947`
5. 在网页「平台接入设置」中填写各平台凭证并同步

数据存储在程序目录的 `GameVault-data/` 文件夹中，备份或迁移只需复制该文件夹。

### 方式二：从源码运行

#### 前置条件

- Node.js 20+
- npm

#### 安装

```bash
git clone https://github.com/LBHUYDEVB/GameVault.git
cd GameVault
npm install
```

#### 配置

```bash
cp .env.example .env
```

根据需要在 `.env` 中填写 Steam API Key 等信息（也可以在网页设置页面填写）。

#### 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

#### 启动

```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用。

## 平台凭证获取方式

### Steam

1. 访问 https://steamcommunity.com/dev/apikey 获取 API Key
2. 你的 Steam ID（64 位数字）可在个人资料 URL 中找到

### PlayStation

1. 在浏览器中登录 https://www.playstation.com/
2. 登录后访问 https://ca.account.sony.com/api/v1/ssocookie
3. 复制返回 JSON 中的 `npsso` 值
4. NPSSO token 有效期约 60 天

### Nintendo

获取 session_token 需要完成一次 OAuth 登录流程，按以下步骤操作：

**第 1 步：生成登录链接**

打开终端（PowerShell / CMD），粘贴以下命令并回车：

```bash
node -e "const c=require('crypto'),v=c.randomBytes(32).toString('base64url'),h=c.createHash('sha256').update(v).digest('base64url'),s=c.randomBytes(16).toString('hex');console.log('code_verifier: '+v+'\n');console.log('请用浏览器打开以下链接并登录：\n');console.log('https://accounts.nintendo.com/connect/1.0.0/authorize?state='+s+'&redirect_uri=npf5c38e31cd085304b%3A%2F%2Fauth&client_id=5c38e31cd085304b&scope=openid+user+user.mii+user.email+user.links%5B%5D.id&response_type=session_token_code&session_token_code_challenge='+h+'&session_token_code_challenge_method=S256&theme=login_form')"
```

终端会输出一个 `code_verifier` 值和一个登录链接，**请记下 code_verifier**。

**第 2 步：浏览器登录**

1. 复制终端输出的链接，在浏览器中打开
2. 登录你的任天堂账号
3. 登录成功后页面会显示「Select this account」按钮
4. **右键点击**这个按钮 → 选择「复制链接地址」（不要左键点击）

**第 3 步：换取 session_token**

将下面命令中的 `你复制的链接` 和 `你的code_verifier` 替换为实际值，然后在终端运行：

```bash
node -e "const v='你的code_verifier',u='你复制的链接',c=u.match(/session_token_code=([^&]+)/)[1];fetch('https://accounts.nintendo.com/connect/1.0.0/api/session_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'com.nintendo.znej/1.13.0 (Android/7.1.2)'},body:'client_id=5c38e31cd085304b&session_token_code='+c+'&session_token_code_verifier='+v}).then(r=>r.json()).then(d=>console.log('\nsession_token:\n'+d.session_token))"
```

终端会输出 `session_token`（有效期约 2 年），将其粘贴到网站的「平台接入设置 → Nintendo → Session Token」中即可。

> **提示**：第 1 步和第 3 步必须在同一次流程中完成，code_verifier 每次生成都不同。如果中途关闭了终端，需要从第 1 步重新开始。

## 项目结构

```
src/
├── app/                    # Next.js 页面与 API 路由
│   ├── dashboard/          # 总览页
│   ├── games/[id]/         # 游戏详情页
│   ├── admin/games/        # 后台管理
│   ├── settings/           # 平台接入设置
│   └── api/                # REST API
├── components/             # 共用 UI 组件
├── lib/
│   ├── integrations/       # 平台适配层
│   │   ├── steam/
│   │   ├── playstation/
│   │   └── nintendo/
│   ├── repositories/       # 数据访问层
│   ├── db.ts              # Prisma 客户端
│   └── utils.ts           # 工具函数
└── generated/prisma/       # Prisma 生成（gitignore）
```

## 许可证

MIT
