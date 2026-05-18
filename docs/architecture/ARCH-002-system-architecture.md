# ARCH-002: System Architecture

## Decision

Use a monorepo with a simple React frontend and a modular ASP.NET Core backend.

## Repository Shape

```text
/ai-visibility
  /apps
    /web
      React + TypeScript + Vite

    /api
      AIVisibility.Api
      AIVisibility.Application
      AIVisibility.Domain
      AIVisibility.Infrastructure
      AIVisibility.Worker

  /agent-system
    /chains
    /prompts
    /templates
    /tools
    component-manifest.json
    CHAINS.md
    project-structure.md
    tech-stack.decisions.md

  /design-tokens
    tokens.json
    TOKENS.md
    generate-css.js

  /docs
  /tools
```

## Architecture Style

- Monorepo for coordinated frontend/backend development.
- Backend is a modular monolith, not microservices.
- Worker is a separate runtime project/container.
- Frontend is a single SaaS app, not a multi-brand design-system hierarchy.
- API contract is REST + OpenAPI.
- Agent-first development using BOLD framework adaptation (manifest-driven, chain-based, with protected changes and human gates).
- Design tokens as single source of truth for all visual values (tokens.json → CSS custom properties → Tailwind theme).

## Why

This structure is agent-friendly because it provides:

- Clear boundaries
- Predictable file locations
- One source of truth
- Easier vertical feature work
- Shared documentation and architecture rules
- Easier OpenAPI-driven frontend/backend contract alignment
- Agent chains target one package at a time (agents don't need to hold both C# and TS context simultaneously)
- Component manifest validates code against spec, preventing drift

## Not Chosen

- Microservices from day one
- Complex multi-brand frontend hierarchy
- One mega-container/image
- Minimal APIs (controllers chosen for agent predictability with the layered project structure)
- Flat vertical slices without layered separation
