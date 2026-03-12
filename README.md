# TutorMarket AI

TutorMarket AI 是一个面向教学市场的 AI 老师平台。当前仓库已落地后端一期 MVP 骨架，覆盖老师市场、邮箱登录、会话流式聊天、老师公开知识库、学生私有知识库、规则版本管理和基础审计日志。

## 仓库结构

```text
apps/
  web/
packages/
  types/
  ui-tokens/
services/
  main-api/
  ai-orchestrator/
infra/
docs/
```

## 当前技术方案

- `services/main-api`: Spring Boot 3.4 + Java 21 + Maven
- `services/ai-orchestrator`: FastAPI + Celery + Redis + OpenAI Python SDK
- `infra/docker-compose.yml`: PostgreSQL、Redis、MinIO、本地联调服务
- `packages/types`: 面向 Web 的共享 DTO 定义

## 本地启动

1. 启动基础设施：

   ```powershell
   .\infra\start-local.ps1
   ```

   该脚本会在缺少 `.env` 时自动从 `.env.example` 生成默认配置，并拉起 PostgreSQL、Redis、MinIO。

2. 如需手动启动基础设施，也可以执行：

   ```powershell
   docker compose -f infra/docker-compose.yml up -d postgres redis minio minio-init
   ```

3. 启动 Spring Boot API：

   ```powershell
   mvn spring-boot:run
   ```

   工作目录：`services/main-api`

   如果 Docker 没开，只需要先联调登录、老师列表、会话列表这些主 API，可直接使用本地 H2 开发模式：

   ```powershell
   .\services\main-api\start-local.ps1
   ```

4. 启动 AI 编排服务：

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8090
   celery -A app.tasks.worker.celery_app worker --loglevel=info
   ```

   工作目录：`services/ai-orchestrator`

   支持两种上游接法：

   - 官方 OpenAI：
     - `OPENAI_BASE_URL=https://api.openai.com/v1`
   - 完整 OpenAI 兼容网关：
     - 需要同时兼容 `/models`、`/responses`、`/files`、`/vector_stores`

   在启动 AI 服务前，建议先执行能力探测：

   ```powershell
   cd services/ai-orchestrator
   .\.venv313\Scripts\python.exe .\scripts\probe_openai_gateway.py
   ```

   或请求健康检查探测：

   ```text
   GET /internal/health?probe_upstream=true
   ```

## 关键接口

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/teachers`
- `POST /api/v1/conversations/{conversationId}/messages:stream`
- `POST /api/v1/teachers/{teacherId}/knowledge-files`
- `GET /api/v1/teachers/{teacherId}/knowledge-files`
- `DELETE /api/v1/knowledge-files/{fileId}`
- `GET /api/v1/teachers/{teacherId}/memory-records`
- `PATCH /api/v1/teachers/{teacherId}/memory-records/{memoryId}`
- `DELETE /api/v1/teachers/{teacherId}/memory-records/{memoryId}`
- `POST /api/v1/admin/teachers/{teacherId}/knowledge-files`
- `POST /api/v1/admin/teachers/{teacherId}/rule-versions`

## 说明

- 当前已支持老师公开知识库、学生私有知识库和长期记忆 MVP；支付仍未实现。
- 多租户隔离键统一保留为 `tenant_id + teacher_id + user_id`。
- 3 位编程面试老师和默认规则会在服务启动后自动注入。
- 仅登录和老师列表联调时，不需要填写 `OPENAI_API_KEY`；只有聊天与知识库索引链路会依赖该配置。
- 聊天检索会自动合并老师公开知识库和“当前学生 + 当前老师”的私有知识库，引用结果会标记来源范围。
- 聊天请求会在同一老师范围内召回用户长期记忆，消息结束后通过内部接口抽取新的记忆候选并落库。
- 知识库 ingest 会在执行前探测上游 `/models`、`/responses`、`/files`、`/vector_stores`；不兼容时会明确拒绝知识库链路，而不是静默失败。

## 文档

- [产品需求文档](docs/PRD.md)
- [技术选型说明](docs/TECH_STACK.md)
- [前端计划书](docs/FRONTEND_PLAN.md)
- [后端计划书](docs/BACKEND_PLAN.md)
- [UI 计划书](docs/UI_PLAN.md)
- [当前进度与推进计划](docs/CURRENT_PROGRESS_PLAN.md)
