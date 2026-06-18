# Aetheria — Shared-World Mobile MMORPG

Aetheria is a **shared-world async MMORPG** built for mobile. Players do not see each
other move around in real time; instead, the world state — characters, inventories,
quest progress, guilds, world events, leaderboards, marketplace — is persistent and
shared on the server. This is the architecture that keeps a solo developer sane.

## Repo layout

```
rpg/
├── backend/        # NestJS + TypeScript API (Postgres + Redis)
├── unity/          # Unity 6 client (C#, UI Toolkit, Addressables)
├── infra/          # Docker, Railway, GitHub Actions
├── content/        # JSON seed data for regions / enemies / items / quests
├── docs/           # Architecture, API, roadmap, dev/deploy guides
└── openapi.yaml    # REST contract — source of truth for the client SDK
```

## Quick start (local dev)

```bash
# 1. Bring up Postgres + Redis + API
cd infra
docker compose up -d

# 2. Run migrations & seed
cd ../backend
npm install
npm run migrate
npm run seed

# 3. Start API in watch mode
npm run start:dev
# → http://localhost:3000/health
# → http://localhost:3000/docs  (Swagger UI)
```

Then open `unity/` in Unity 6, set the API base URL in `Assets/Resources/ApiConfig.asset`,
and press Play.

## Docs

- [Architecture](docs/architecture.md) — system shape, module boundaries, why async-shared
- [Database schema](docs/database.md) — entity rationale, indexes, growth notes
- [Roadmap](docs/roadmap.md) — what to build in what order, solo-dev pacing
- [Dev guide](docs/dev-guide.md) — local setup, common workflows
- [Deploy guide](docs/deploy-guide.md) — Railway, env vars, migrations in prod
- [Security model](docs/security.md) — server authority, anti-cheat, audit

## Design pillars

1. **Server is the source of truth.** Client renders state and submits intents.
2. **No real-time peers.** All "multiplayer" is mediated through shared state
   (leaderboards, marketplace, guild chat, world events) — cheap to scale.
3. **Solo-dev pacing.** Each module is independently shippable. The roadmap is
   ordered so the game is playable end-to-end at every milestone.
4. **Built to grow.** APIs leave room for marketplace, seasons, PvP, and ws-driven
   features without rewriting the foundations.
