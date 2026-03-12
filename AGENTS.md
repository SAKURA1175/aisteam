# Repository Agent Guide

This repository supports GitHub Copilot coding agent, custom agents on GitHub.com, and local Copilot or CLI workflows. Use this file as the primary operations guide for agentic work in this monorepo.

本文件是仓库级智能体操作手册。面向 GitHub Copilot coding agent、GitHub 自定义 agent，以及本地 Copilot/CLI 的统一工作方式。

## Mission

- Deliver scoped, production-safe changes for TutorMarket AI.
- Work across the full stack when needed: Next.js web app, Spring Boot API, FastAPI orchestrator, and local infrastructure.
- Prefer deterministic validation over speculative changes.

## Repo Map

- `apps/web`: Next.js app for the student and teacher web experience.
- `services/main-api`: Spring Boot 3.4 API using Java 21 and Maven.
- `services/ai-orchestrator`: FastAPI and Celery service using Python 3.13.
- `infra`: Docker Compose and local environment scripts for PostgreSQL, Redis, and MinIO.
- `packages/types`: Shared DTOs for the web app.
- `packages/ui-tokens`: Shared UI tokens.

## Runtime Prerequisites

- Node.js `24.x`
- Java `21`
- Python `3.13`
- Docker with Compose support

## Standard Commands

Run commands from the repository root unless a section says otherwise.

- Install JavaScript dependencies: `npm install`
- Web lint: `npm run lint:web`
- Web build: `npm run build:web`
- Main API tests: `mvn test` in `services/main-api`
- Main API dev server: `mvn spring-boot:run` in `services/main-api`
- AI orchestrator tests: `pytest` in `services/ai-orchestrator`
- AI orchestrator dependency install: `pip install -r requirements.txt` in `services/ai-orchestrator`
- Start local infrastructure: `.\infra\start-local.ps1`
- Start infra plus backend containers: `.\infra\start-local.ps1 -WithApps`

## Working Strategy

- Read the surrounding code before editing. Prefer the smallest coherent change that satisfies the request.
- Respect existing architecture boundaries between `apps`, `services`, `packages`, and `infra`.
- Prefer local fixes over broad refactors unless the task explicitly asks for a wider change.
- After modifying code, run the narrowest relevant validation first, then expand if the change crosses service boundaries.
- If a task touches external AI behavior, check whether required secrets are present before attempting smoke tests.
- Do not make real external AI calls when local tests are sufficient to validate the change.

## Validation Matrix

- Web-only changes: run `npm run lint:web`. Run `npm run build:web` if routing, bundling, or app config changed.
- `services/main-api` changes: run `mvn test` from `services/main-api`.
- `services/ai-orchestrator` changes: run `pytest` from `services/ai-orchestrator`.
- Cross-service changes: run the relevant commands for each touched surface.
- Infrastructure or integration changes: ensure local dependencies can start with `.\infra\start-local.ps1` or equivalent `docker compose` commands.

## Secrets And External Integrations

Required for real AI or gateway smoke tests:

- `OPENAI_API_KEY`

Recommended when the repository uses a compatible gateway or non-default model configuration:

- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`

When these variables are absent, continue with local validation and unit or integration tests that do not require external calls.

## GitHub And Local Usage

- GitHub.com agents should read this file together with `.github/copilot-instructions.md`.
- Custom agent profiles live in `.github/agents`.
- Local Copilot chat or CLI sessions should reuse the same commands and validation rules from this file.

## Delivery Expectations

When completing a task, report:

- What changed
- Which validations ran and their results
- Any remaining risk or unverified path
- A reproducible command when validation failed or could not be run

## Team Notes

- 这个仓库默认是全栈 monorepo，不要把问题先入为主地归类成“纯前端”或“纯后端”。
- 如果需求涉及聊天、知识库、记忆或规则版本，通常要先确认是否跨越 `apps/web`、`services/main-api`、`services/ai-orchestrator` 三层。
- 修改后优先给出可执行验证结果，而不是只给推测性的说明。
