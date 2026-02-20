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

### 页面测试（E2E）

需先启动后端与前端，再运行：

```bash
cd web
npm run test:e2e
```

- 使用 Playwright，会启动前端并访问首页；**后端需已运行**，否则「UP / questionnaire-api」相关用例会因接口失败而报错。

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
