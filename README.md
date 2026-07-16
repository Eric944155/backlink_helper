# 外链汇总助手 — Next.js 版

原项目从单文件 `index.html` 迁移到 Next.js 14 App Router。

## 目录结构

```
├── app/
│   ├── layout.jsx          ← 全局 HTML 框架（<head>、字体、GTM）
│   ├── page.jsx            ← 主页面（原 index.html 的 body + JS）
│   ├── globals.css         ← 全局样式（原 index.html 的 <style>）
│   └── api/
│       ├── auth/route.js        ← 登录 / token 验证
│       ├── fetch-page/route.js  ← 读取目标页面 HTML
│       ├── check-url/route.js   ← 外链存活 & dofollow 检测
│       ├── check-index/route.js ← 批量收录查询
│       └── admin/route.js       ← 管理员用户管理
├── lib/
│   └── security.js         ← 共用：鉴权 + SSRF 防护
├── next.config.js
├── vercel.json
└── package.json
```

## 本地启动

```bash
# 1. 安装依赖（只需要第一次）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问
http://localhost:3000
```

## 部署到 Vercel

把这个文件夹推到 GitHub，Vercel 会自动识别 Next.js 项目并部署。

```bash
git init
git add .
git commit -m "migrate to Next.js"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

## 环境变量

在 Vercel 项目设置里配置（和之前一样）：

| 变量名 | 说明 |
|--------|------|
| `KV_REST_API_URL` | Upstash Redis URL |
| `KV_REST_API_TOKEN` | Upstash Redis Token |
| `TOKEN_SECRET` | JWT 签名密钥 |
| `ADMIN_PASS` | 管理员密码 |

## 后续优化建议（不急）

- 把 `page.jsx` 里的各功能块（上传、URL读取、结果表格、SEO工具箱）
  拆成独立的 `components/` 组件，代码会更清晰。
- 可以给 API 加 `next/headers` 读取 cookie，实现更安全的 session。
