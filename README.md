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

### 前置条件

- Node.js 20+
- npm

### 安装

```bash
git clone https://github.com/LBHUYDEVB/GameVault.git
cd GameVault
npm install
```

### 配置

```bash
cp .env.example .env
```

根据需要在 `.env` 中填写 Steam API Key 等信息（也可以在网页设置页面填写）。

### 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 启动

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

1. 运行辅助脚本：`node scripts/get-nintendo-token.mjs`
2. 按提示在浏览器中登录任天堂账号
3. 右键复制「Select this account」按钮链接
4. 粘贴回命令行获取 session_token
5. session_token 有效期约 2 年

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
