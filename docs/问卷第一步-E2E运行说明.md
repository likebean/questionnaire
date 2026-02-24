# 问卷第一步 - E2E 运行说明

## 通过条件

- **不启动后端**：所有依赖 API 的用例（user-flow、survey-flow、账号/用户/院系/角色/权限等）会自动 **skip**，仅不依赖后端的用例（如 home 部分）会执行，**整体通过（0 失败）**。
- **先启动后端再跑 E2E**：所有用例都会执行，问卷与用户流程等会真实请求 API，E2E 全部通过。

## 步骤

1. **启动后端**（可选，不启动则仅跑不依赖 API 的用例）  
   ```bash
   cd api && ./mvnw spring-boot:run
   ```
   确保 MySQL 已就绪，且 Flyway 已执行（含 V3 问卷表）。

2. **端口**  
   - 前端 3000：Playwright 已配置 `reuseExistingServer: true`，若本机已在跑 `npm run dev`，会复用，无需单独起前端。  
   - 若 3000 被其他应用占用且非前端，请先释放或改配置。

3. **运行 E2E**  
   ```bash
   cd web && npm run test:e2e
   ```
   或指定浏览器：  
   `npm run test:e2e -- --project=chromium`

## 用例说明

- **home.spec.ts**：首页/登录页标题等，不依赖后端。
- **user-flow.spec.ts**：登录 → 我的问卷 → 返回首页；错误密码提示；已登录访问首页。需后端。
- **survey-flow.spec.ts**：创建问卷 → 编辑页；编辑保存、添加题目、发布；设置页复制链接 → 填写页提交。需后端。
- **AuthSecurityTest**（后端）：认证与权限。
- **FillControllerTest**（后端）：填写接口 4xx。

后端单测：`cd api && ./mvnw test`（需本地 MySQL + test profile）。
