# 管理后台恢复设计

日期：2026-07-30

## 目标

恢复独立的 `/admin` 管理后台，使管理员能够通过 `ADMIN_PASS` 登录，并管理普通用户及其可访问功能模块。

## 当前问题

- 仓库中只有 `app/api/admin/route.js`，没有 `app/admin/page.jsx`，因此不存在可访问的管理页面。
- 管理接口中的 `parsed` 未声明。
- 管理接口混用了 Pages Router 的 `res.status(...).json(...)` 与 App Router 的 Route Handler，登录及部分校验分支会失败。
- 接口缺少一致的请求校验和 Redis 配置错误提示。

## 方案

新增独立的 `app/admin/page.jsx` 页面，并修复 `app/api/admin/route.js`。

### 管理页面

- 地址固定为 `/admin`。
- 使用管理员密码登录。
- 管理员密码只保存在当前页面的内存状态中，不写入 localStorage、sessionStorage 或 Cookie。
- 页面刷新后需要重新登录。
- 登录后读取用户和功能模块列表。
- 支持新增用户、修改用户密码和权限、删除用户。
- 支持编辑全局功能模块列表。
- 删除用户前显示二次确认。
- 加载、保存和错误状态在页面内明确显示。

### 管理接口

所有请求继续使用 `POST /api/admin`，请求体包含 `adminPass`、`action` 以及对应操作参数。操作为 `login`、`getAll`、`saveUser`、`deleteUser` 或 `saveSections`。

- 全部响应统一使用 `NextResponse.json`。
- 明确声明并解析请求体。
- 验证 `ADMIN_PASS`、Redis 地址和 Redis Token。
- 登录失败、参数错误、Redis 请求失败和未知操作均返回清晰错误。
- 保存用户名时去除首尾空格。
- 用户密码为空时拒绝保存，避免意外创建不可登录账号。
- 权限模块保存时去除空项和重复项。

## 数据流

1. 管理员访问 `/admin` 并输入管理员密码。
2. 页面调用 `/api/admin` 的 `login` 操作。
3. 登录成功后调用 `getAll` 获取 Redis 中的用户和模块。
4. 页面通过 `saveUser`、`deleteUser` 和 `saveSections` 修改数据。
5. 每次管理请求都携带仅存在内存中的管理员密码。

## 测试与验证

- 为管理接口增加回归测试，覆盖登录、错误密码、请求体错误、用户保存、用户删除和模块去重。
- 测试先在旧代码上失败，再实施修复并通过。
- 运行完整测试和 `npm run build`。
- 验证构建产物包含 `/admin` 路由。

## 非目标

- 本次不实现 Cookie 管理员会话。
- 本次不修改普通用户登录流程。
- 本次不更换 Upstash Redis 数据结构。
- 本次不重构无关的首页工具代码。
