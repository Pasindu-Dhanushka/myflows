<div align="center">

# flowStudio

**A workflow-based application platform for building, executing, and publishing applications using reusable visual components.**

![Status](https://img.shields.io/badge/status-planning%20%2F%20pre--development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Frontend](https://img.shields.io/badge/frontend-Next.js-black)
![Backend](https://img.shields.io/badge/backend-NestJS-e0234e)
![Database](https://img.shields.io/badge/database-PostgreSQL-336791)

</div>

---

> **🚧 Project status:** flowStudio is currently in the **architecture and planning phase**. No implementation exists yet. This README describes the product as designed and will be updated section by section as development begins. See the [Roadmap](#roadmap) for what's coming first.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

Building even a simple task-tracking, approval, or data-collection app today still requires frontend development, backend logic, a database, and deployment know-how. Existing automation tools like Zapier and n8n are excellent at connecting third-party services and running background jobs, but they aren't built for user-facing applications — configurable forms, persistent data, dashboards, and shareable interfaces.

**flowStudio** closes that gap. It's a low-code platform where users build applications by wiring together reusable **component nodes** — Form, Database, Data Visualization, Integration, and AI components — on a visual canvas. Instead of writing CRUD boilerplate by hand, users define a workflow; flowStudio validates it, renders a live UI from it, and serves it through a shared runtime with its own public URL.

The platform is intentionally **AI-agnostic at its core**. AI capabilities (prompt-driven nodes, AI-assisted workflow generation) are pluggable extensions built on the same common node interface as everything else — so flowStudio works equally well for a plain CRUD app or an AI-powered one.

## Key Features

- **Visual Workflow Builder** — drag-and-drop, graph-based editor for connecting components
- **Common Node Interface** — a standard contract (inputs, outputs, config schema, validation, runtime behavior) that every component implements, so custom and built-in nodes behave consistently
- **Node Registry** — a catalog of available component types, their metadata, and connection rules
- **Workflow Validation** — structural, schema, and input/output compatibility checks before preview or publish
- **Workflow Publishing** — turn a validated workflow into a live application with a unique public URL
- **Public App Runtime** — a shared runtime that renders and serves published apps without requiring the end user to log in
- **Dynamic UI Rendering** — forms, tables, and result views generated directly from stored workflow and component configuration
- **App Data Management** — CRUD operations on the data records each published app generates
- **Execution Engine** — sequential, node-by-node workflow execution with error handling and retries
- **Async Background Processing** — long-running or AI-driven steps handled via Redis + BullMQ, off the request path
- **Real-Time Execution Status** — live updates over WebSockets while a workflow runs
- **Execution History & Logs** — full traceability of inputs, outputs, status, and errors per run
- **Admin Dashboard** — user management, platform-wide monitoring, and component governance
- **AI-Assisted Workflow Generation** _(planned)_ — describe an app in natural language and get a draft workflow graph to review and refine, never auto-published without human review
- **Multi-Provider AI Abstraction** _(planned)_ — swap between OpenAI, Claude, and Gemini without reconfiguring workflows
- **IoT / MQTT & OpenAPI Integrations** _(planned)_ — connect workflows to external devices and third-party APIs

## System Architecture

flowStudio follows a **Modular Monolith** architecture with **Clean Architecture** principles and event-driven background processing. This keeps deployment and local development simple (a single Docker Compose stack) while preserving clear module boundaries that could be split into separate services later if scale demands it.

The full annotated diagram lives at `docs/architecture/system-architecture.png`. Summary:

```
Users
 ├── Workflow Creator · Platform Admin · Public End User · Developer / Advanced User
 ▼
Next.js Frontend
 ├── Platform Dashboard · Workflow Builder · Runtime Preview · Public Runtime UI
 ▼
NestJS Backend  (Modular Monolith + Clean Architecture — REST API, WebSocket API, Auth middleware)
 ▼
Core Platform Modules
 ├── Auth & User Management        ├── Workflow Validation
 ├── Workspace / Project Mgmt      ├── Workflow Publishing
 ├── Workflow Builder              ├── Public App Runtime
 ├── Node Registry                 ├── Runtime UI Renderer
 ├── Common Node Interface         ├── App Data Management
 │                                 ├── Execution Logs
 │                                 └── Admin Management
 ▼
Component / Node Ecosystem  (all nodes implement the Common Node Interface)
 ├── UI Components (Form, Table/List, Chat, Dashboard)
 ├── Data Components (Database, File Storage, Vector DB, Chart/Reporting)
 ├── Integration Nodes (OpenAPI, Webhook, MQTT, MCP Tool)
 └── AI Components (LLM Agent, AI Provider, Notification, Prompt-to-Workflow)
 ▼
Workflow Execution Layer
 ├── Execution Engine · Node Executors · Redis + BullMQ Async Workers
 └── Error/Retry Handling · Execution Log Storage · Inter-node Data Passing
 ▼
AI-Assisted Workflow Generator  (future vision)
 └── Prompt → Draft Graph → Validation → User Review & Publish (never auto-published)
 ▼
Storage Layer
 ├── PostgreSQL (users, workflows, nodes, execution logs, app data)
 ├── Object Storage (uploads, generated reports)
 ├── Redis + BullMQ (queues)
 └── Vector DB (embeddings, retrieval — future)
 ▼
External Services
 ├── AI Providers (OpenAI, Claude, Gemini)
 ├── External APIs / OpenAPI services
 ├── Communication (Email, WhatsApp/SMS)
 └── IoT / MQTT
 ▼
Public Runtime Flow
 Public URL → Runtime UI → Runtime API → Load Config → Render UI → Execute → Return Result
```

## Technology Stack

| Layer           | Technology                                                      | Why                                                                                                            |
| --------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Frontend        | Next.js, React, TypeScript, React Flow, Tailwind CSS, shadcn/ui | React Flow is purpose-built for node/graph editors; TypeScript keeps complex workflow data reliable end to end |
| Backend         | NestJS, TypeScript                                              | Modular, TypeScript-first architecture that fits a modular monolith and shares types with the frontend         |
| Database        | PostgreSQL, Prisma ORM                                          | Relational core (users, apps, executions) with JSONB for dynamic workflow graphs and node configs              |
| Background Jobs | Redis, BullMQ                                                   | Queue-based async execution, retries, and long-running AI tasks off the request path                           |
| Real-time       | WebSockets / Socket.IO                                          | Live workflow execution status                                                                                 |
| File Storage    | S3-compatible (Cloudflare R2 / local)                           | Uploaded files and documents used as workflow inputs                                                           |
| AI Providers    | OpenAI, Claude, Gemini (abstracted)                             | Provider-agnostic AI layer, swappable without reconfiguring workflows                                          |
| DevOps          | Docker, Docker Compose, Nginx, GitHub Actions                   | Consistent environments across dev/prod and automated CI/CD                                                    |

## Repository Structure

> Planned layout for the monorepo. Will be scaffolded at project kickoff.

```
flowstudio/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/               # NestJS backend
│   └── worker/             # BullMQ background workers
├── packages/
│   ├── sdk/                # Shared workflow / node SDK
│   ├── ui/                 # Shared UI component library
│   ├── types/               # Shared TypeScript types
│   └── config/               # Shared ESLint / TS config
├── prisma/                    # Database schema & migrations
├── infrastructure/
│   ├── docker/
│   └── nginx/
├── docs/                        # Architecture, ADRs, API docs, project status
└── README.md
```

## Getting Started

Implementation hasn't started yet, so the commands below describe the **intended** setup flow once initial scaffolding lands. This section will be updated with real, tested instructions as soon as the repo is bootstrapped.

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose
- PostgreSQL 15+ (via Docker Compose)
- Redis 7+ (via Docker Compose)

### Anticipated Setup

```bash
git clone https://github.com/your-org/flowstudio.git
cd flowstudio

pnpm install

cp .env.example .env
# fill in the required values

docker compose up -d      # PostgreSQL, Redis
pnpm dev                  # web, api, worker in dev mode
```

## Environment Variables

```env
DATABASE_URL=
REDIS_URL=

JWT_SECRET=

NEXT_PUBLIC_API_URL=

AI_PROVIDER_API_KEY=

NODE_ENV=development
```

## Development Workflow

```bash
git checkout -b feature/short-description
git commit -m "feat: add workflow validation"
git push origin feature/short-description
```

- Branch naming: `feature/*`, `fix/*`, `chore/*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- All changes land via Pull Request with at least one review
- Lint and type checks must pass before merge

## Roadmap

**Phase 1 — Foundation**
Auth & user management, workspace/project management, repo and Docker/CI setup.

**Phase 2 — Workflow Builder Core**
Common Node Interface, Node Registry, visual workflow builder, workflow save/edit, workflow validation.

**Phase 3 — MVP Components & Runtime**
Form, Database, and Data Visualization components; execution engine; runtime UI renderer; workflow publishing with public URLs; app data management; execution logs.

**Phase 4 — Platform Hardening**
Admin dashboard, background processing at scale, integration/regression testing, deployment automation.

**Future Enhancements**
AI-assisted workflow generation, multi-provider AI switching, vector database & retrieval, MQTT/IoT integrations, OpenAPI/webhook nodes, notification services, plugin marketplace.

## Contributing

This repository is currently maintained by the core project team during the planning and early build phases. The standard flow once contributions open up:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "feat: add new feature"`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

Licensed under the [MIT License](LICENSE).

## Acknowledgments

flowStudio is being built as part of the UCSC Industry Project (SCS3301 / IS3201), University of Colombo School of Computing, under the guidance of academic supervisor **Ms. Shashini Wijewardhana** and industry mentor **Mr. Gayantha Anushan** (FactN Software).

Detailed proposal, SRS, sprint status, and internal planning documentation live in [`/docs`](./docs), separate from this public-facing README.
