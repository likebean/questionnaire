# 问卷系统（问卷星克隆版）

仿问卷星实现的在线问卷平台，支持创建、发布、回收与数据分析。

**完整功能规格**见：[docs/功能规格.md](docs/功能规格.md)  
（包含：用户与账号、问卷编辑与题型、逻辑跳题、发放与回收、数据统计与导出、模板与复用、优先级建议等。）

---

## 技术栈

| 层级     | 技术选型        | 说明           |
|----------|-----------------|----------------|
| 全栈框架 | Next.js 14      | App Router、API Routes |
| 语言     | TypeScript      | 前后端统一     |
| 数据库   | SQLite → 可迁 PostgreSQL | Prisma ORM |
| 样式     | Tailwind CSS    | 组件级样式     |
| 图表     | Recharts        | 统计图表       |
| 导出     | ExcelJS / 服务端 CSV | Excel/CSV 导出 |

## 项目结构（规划）

```
questionnaire/
├── prisma/
│   └── schema.prisma    # 数据模型
├── src/
│   ├── app/
│   │   ├── (auth)/      # 登录注册
│   │   ├── (dashboard)/ # 我的问卷、编辑、统计
│   │   ├── s/           # 填写问卷（公开短路径）
│   │   └── api/         # REST API
│   ├── components/      # 通用与业务组件
│   ├── lib/
│   │   ├── db.ts
│   │   ├── survey.ts    # 问卷业务逻辑
│   │   └── export.ts    # 导出逻辑
│   └── types/           # 共享类型
├── package.json
└── README.md
```

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
