# Copilot Repository Instructions

Use `AGENTS.md` in the repository root as the primary operating guide for this monorepo. This file is the quick-start layer for GitHub Copilot coding agent.

## Project Snapshot

- Product: TutorMarket AI
- Frontend: `apps/web` with Next.js
- Main API: `services/main-api` with Spring Boot 3.4, Java 21, Maven
- AI service: `services/ai-orchestrator` with FastAPI, Celery, Python 3.13
- Local dependencies: PostgreSQL, Redis, MinIO via `infra/docker-compose.yml`

## How To Work Here

- Read `AGENTS.md` before making broad changes.
- Explore the touched area first and prefer scoped edits.
- Default to static checks and tests before attempting full Docker-backed integration flows.
- Only use real AI or gateway smoke checks when the required secrets are available.

## Validation Defaults

- Web changes: `npm run lint:web`
- Main API changes: `mvn test` in `services/main-api`
- AI orchestrator changes: `pytest` in `services/ai-orchestrator`
- Cross-stack changes: run the relevant command for each touched component

## Pull Request Expectations

Report:

- The user-visible or developer-visible changes
- The validation commands that ran
- Any remaining risk, skipped check, or dependency on secrets or local services

## 中文补充

- 默认先跑静态检查和单测，再决定是否进入 Docker 联调。
- 需求涉及聊天、知识库或记忆链路时，通常需要检查是否跨服务修改。
