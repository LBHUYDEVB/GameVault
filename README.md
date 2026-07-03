# GameVault

一个自托管的私人游戏资料库，聚合 Steam、PlayStation 和 Nintendo 的游戏与时长数据，支持评分、评测、游玩日志和私人榜单。

## 功能

- **三平台游戏同步**
  - Steam：官方 API 直连
  - PlayStation：通过 NPSSO token 获取游戏列表与时长（精确到秒）
  - Nintendo：通过 session_token 获取游戏列表与时长（精确到分钟）
- **私人资料库**
  - 全平台游戏数量、评分、评测和同步状态
  - 封面网格、表格、搜索、筛选和排序
  - 近两周真实 API 时长与总时长
- **游戏详情页**
  - 封面、平台、时长、评分
  - 富文本评测、游玩日志和所属榜单
- **后台管理**
  - 快捷评分（0~10，步进 0.5）
  - Tiptap 富文本编辑器撰写评测
  - 手动添加 / 删除游戏
- **同步中心**
  - 平台凭证校验、单平台同步和全部同步
  - 凭证只存储在服务器 SQLite 中，接口仅返回掩码状态

## 技术栈

- **前端/服务**：Next.js 16 (App Router) + TypeScript
- **样式和动效**：Tailwind CSS + GSAP
- **数据库**：SQLite（Prisma ORM）
- **富文本**：Tiptap
- **PlayStation API**：psn-api
- **Nintendo API**：原生 HTTP（逆向工程接口）

## Linux + Docker 部署

这是服务器部署的推荐方式。项目按单用户、单容器、单 SQLite 数据库设计，不要启动多个应用副本共同写入数据库。

### 1. 准备服务器

安装 Git、Docker Engine 和 Docker Compose 插件，然后克隆源码：

```bash
git clone https://github.com/LBHUYDEVB/GameVault.git
cd GameVault
cp .env.docker.example .env.docker
```

编辑 `.env.docker`，至少替换 `APP_PASSWORD`。该文件不会被 Git 或 Docker 镜像收录。

```env
APP_USERNAME=gamevault
APP_PASSWORD=使用一个足够长的随机密码
GAMEVAULT_PORT=3000
GAMEVAULT_BIND=0.0.0.0
```

### 2. 迁移已有数据

数据库在容器外持久化到仓库下的 `data/gamevault.db`。第一次启动前可把当前项目的 `dev.db` 或便携版的 `GameVault-data/gamevault.db` 复制过去：

```bash
mkdir -p data
cp /path/to/your/dev.db data/gamevault.db
```

复制数据库前先关闭旧版程序，避免复制到正在写入的 SQLite 文件。数据库中包含平台 Token，应将服务器账号和备份目录视为敏感数据。

没有旧数据库时无需手动创建，容器会自动执行全部 Prisma migrations。

### 3. 启动

```bash
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

访问 `http://服务器IP:3000`，浏览器会要求输入 `.env.docker` 中设置的账号和密码。

容器启动时会自动执行 `prisma migrate deploy`。健康检查地址是 `/api/health`，只返回数据库是否可用，不返回业务数据。

### 4. 更新

```bash
git pull
docker compose --env-file .env.docker up -d --build
```

### 5. 备份

为了得到一致的 SQLite 备份，先停止容器再复制：

```bash
docker compose --env-file .env.docker stop
cp data/gamevault.db "data/gamevault-$(date +%Y%m%d-%H%M%S).db"
docker compose --env-file .env.docker start
```

### 网络和安全

- 仅在可信家庭局域网使用时，可以直接开放端口。
- 需要远程访问时，推荐使用 Tailscale；若映射到公网，必须在前面增加 HTTPS 反向代理。
- 内置的是 HTTP Basic Auth，在纯 HTTP 网络中不能替代 TLS。
- 如果 API 需要宿主机代理，在 `.env.docker` 中使用 `http://host.docker.internal:端口`，不能使用容器内的 `127.0.0.1`。

## Windows 便携版

无需安装 Node.js，双击即用：

1. 前往 [Releases](https://github.com/LBHUYDEVB/GameVault/releases) 下载 `GameVault-portable.zip`
2. 解压到任意目录
3. 双击 `GameVault.bat` 启动
4. 浏览器会自动打开 `http://localhost:3947`
5. 在网页「平台接入设置」中填写各平台凭证并同步

数据存储在程序目录的 `GameVault-data/` 文件夹中，备份或迁移只需复制该文件夹。

## 从源码开发

#### 前置条件

- Node.js 22
- npm

#### 安装

```bash
git clone https://github.com/LBHUYDEVB/GameVault.git
cd GameVault
npm ci
```

#### 配置

```bash
cp .env.example .env
```

根据需要在 `.env` 中填写 Steam API Key 等信息（也可以在网页设置页面填写）。

#### 初始化数据库

```bash
npx prisma generate
npx prisma migrate deploy
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
