# 问卷系统（问卷星克隆版）

仿问卷星实现的在线问卷平台，支持创建、发布、回收与数据分析。

**完整功能规格**见：[docs/功能规格.md](docs/功能规格.md)  
（包含：用户与账号、问卷编辑与题型、逻辑跳题、发放与回收、数据统计与导出、模板与复用、优先级建议等。）

**技术栈与架构**见：[docs/技术栈与架构说明.md](docs/技术栈与架构说明.md)  
与 AI Plugin 项目（web + unified）采用**相同技术栈**（Next.js 16 + React 19 + Spring Boot 3.4 + MySQL + MyBatis-Plus + Redis 等），**单校部署，不涉及多租户**。

---

## 技术栈（与 AI Plugin 对齐，无多租户）

| 层级     | 技术选型        | 说明           |
|----------|-----------------|----------------|
| 前端     | Next.js 16 + React 19 + TypeScript | App Router，Turbopack 默认 |
| 样式     | Tailwind CSS    | 含 Radix UI、framer-motion 等 |
| 请求与状态 | Axios + TanStack React Query | 统一封装、缓存 |
| 后端     | Spring Boot 3.4 + Java 17+ | REST API、Spring Security、JWT |
| 数据库   | MySQL 8 + MyBatis-Plus | 主库；Flyway 风格迁移 |
| 缓存     | Redis (Lettuce) | 按需 |
| 图表与导出 | Recharts、ExcelJS / 服务端 CSV | 统计图表、Excel/CSV 导出 |

## 项目结构（规划）

- **前端**：Next.js 单页应用，目录可参考 AI Plugin web（如 `src/app/` 按模块分页、`src/services/api.ts`、`src/components/`）。
- **后端**：独立 Spring Boot 工程，分层与包结构参考 AI Plugin unified（Controller / Service / Mapper / entity / config），**无租户 Filter 与租户表**。
- 前端通过 rewrites 或网关将 `/api/*` 代理到后端服务。

## 快速开始

```bash
# 安装依赖
pnpm install

# 初始化数据库
pnpm db:push

# 开发
pnpm dev
```

访问：编辑端 `http://localhost:3000`，填写端 `http://localhost:3000/s/[问卷短码]`。

---

实现将按阶段进行：先完成「问卷 CRUD + 基础题型 + 填写 + 简单统计 + 导出」，再迭代逻辑跳题、防重复、外观与高级分析。
