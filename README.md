# 问卷系统

高校问卷管理与填写系统，单校部署，不涉及多租户。

**功能规格**：[docs/功能规格.md](docs/功能规格.md)  
**技术栈与架构**：[docs/技术栈与架构说明.md](docs/技术栈与架构说明.md)  
**分步开发计划**：[docs/分步方案与开发计划.md](docs/分步方案与开发计划.md)

---

## 项目结构

| 目录 | 说明 |
|------|------|
| **web** | 前端（Next.js 14 + React 18 + TypeScript），风格参考 ai-plugin/web |
| **api** | 后端（Spring Boot 3.4 + Java 17 + MyBatis-Plus + MySQL），风格参考 ai-plugin/unified |
| **docs** | 功能规格、技术栈说明、分步方案 |

---

## 快速开始（基础骨架）

### 环境

- Node.js 18+
- Java 17+
- MySQL 8（已建库 `questionnaire`）

### 后端

```bash
cd api
mvn spring-boot:run
```

- 端口：8080  
- 健康检查：`GET http://localhost:8080/api/health`

### 前端

```bash
cd web
npm install
npm run dev
```

- 端口：3000  
- 首页会请求 `/api/health`（通过 rewrites 代理到 8080），展示健康状态。

### 单测

- **后端**：`cd api && mvn test`（含 `HealthControllerTest`）
- **前端**：`cd web && npm run test`（含首页组件单测）

### 页面测试（E2E，模拟用户完整操作）

E2E 在**真实浏览器**中访问页面、输入、点击，并请求**真实后端**，覆盖完整用户流程（未登录→登录→首页→我的问卷→返回首页等）。

1. **首次运行**需安装 Playwright 浏览器：`cd web && npx playwright install`
2. **启动后端**（E2E 中登录、问卷列表等会请求 `/api`）：`cd api && ./mvnw spring-boot:run`
3. 运行 E2E（Playwright 会自动启动前端，或复用已运行的 3000 端口）：

```bash
cd web
npm run test:e2e
```

- 用例位置：`web/e2e/`
  - `user-flow.spec.ts`：完整用户流程（登录→首页→我的问卷）
  - `users-crud.spec.ts`：用户管理增删改查
  - `accounts-crud.spec.ts`：账号管理增删改查
  - `departments-crud.spec.ts`：院系管理增删改查
  - `roles-crud.spec.ts`：角色管理增删改查
  - `permissions.spec.ts`：权限管理列表、筛选、编辑
  - `roles-permissions.spec.ts`：校管菜单与角色/权限/用户编辑页
  - `home.spec.ts`：首页与健康检查
- **后端未启动**时，依赖 `/api` 的用例（如登录、我的问卷）会失败。

---

## 技术栈（与 AI Plugin 对齐，无多租户）

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | Next.js 14 + React 18 + TypeScript | App Router |
| 样式 | Tailwind CSS | 含 Radix UI、framer-motion 等（按需引入） |
| 请求与状态 | Axios + TanStack React Query | 统一封装、缓存（按需） |
| 后端 | Spring Boot 3.4 + Java 17+ | REST API、统一 Result、全局异常 |
| 数据库 | MySQL 8 + MyBatis-Plus | 主库；Flyway 风格迁移（按需） |
| 缓存 | Redis (Lettuce) | 按需 |
